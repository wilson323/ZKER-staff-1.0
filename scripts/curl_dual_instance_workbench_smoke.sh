#!/usr/bin/env bash
# 本地 curl 验收：M1-01 双实例工作台（真实 API，禁 mock）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="$(mktemp -d /tmp/zker-wb-XXXX)"
PORT=3092
export ZKER_DATA_DIR="$DATA_DIR"
export PORT

AUTH_A=(-H 'X-Tenant-Id: tenant-alpha' -H 'X-Person-Id: demo_executor')
AUTH_B=(-H 'X-Tenant-Id: tenant-beta' -H 'X-Person-Id: other_user')

cleanup() {
  if [[ -f /tmp/zker-wb-api.pid ]]; then
    kill "$(cat /tmp/zker-wb-api.pid)" 2>/dev/null || true
    rm -f /tmp/zker-wb-api.pid
  fi
}
trap cleanup EXIT

cd "$ROOT"
node apps/api/dist/main.js >/tmp/zker-wb-api.log 2>&1 &
echo $! >/tmp/zker-wb-api.pid
sleep 1

echo "DATA_DIR=$DATA_DIR"

echo "GET empty instances (authorized):"
curl -sS "${AUTH_A[@]}" "http://127.0.0.1:${PORT}/api/v1/workbench/instances"
echo

echo "GET without session headers (expect 401):"
CODE401=$(curl -sS -o /tmp/zker-wb-401.json -w "%{http_code}" \
  "http://127.0.0.1:${PORT}/api/v1/workbench/instances")
echo "status=$CODE401 body=$(cat /tmp/zker-wb-401.json)"
test "$CODE401" = "401"

TPL=$(curl -sS -X POST "${AUTH_A[@]}" \
  -H 'Content-Type: application/json' \
  "http://127.0.0.1:${PORT}/api/v1/workbench/templates" \
  -d '{"code":"biz-intake","title":"商务立项模板"}')
echo "template=$TPL"
TPL_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$TPL")

A1=$(curl -sS -X POST "${AUTH_A[@]}" \
  -H 'Content-Type: application/json' \
  "http://127.0.0.1:${PORT}/api/v1/workbench/instances" \
  -d "{\"templateId\":\"$TPL_ID\",\"title\":\"A1\",\"idempotencyKey\":\"idem-a1\",\"intentKey\":\"intent-a1\"}")
echo "A1=$A1"
A1_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$A1")

A1_REPLAY=$(curl -sS -X POST "${AUTH_A[@]}" \
  -H 'Content-Type: application/json' \
  "http://127.0.0.1:${PORT}/api/v1/workbench/instances" \
  -d "{\"templateId\":\"$TPL_ID\",\"title\":\"A1-retry\",\"idempotencyKey\":\"idem-a1\",\"intentKey\":\"intent-retry\"}")
A1_REPLAY_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$A1_REPLAY")
echo "A1_replay_id=$A1_REPLAY_ID"
test "$A1_REPLAY_ID" = "$A1_ID"

A2=$(curl -sS -X POST "${AUTH_A[@]}" \
  -H 'Content-Type: application/json' \
  "http://127.0.0.1:${PORT}/api/v1/workbench/instances" \
  -d "{\"templateId\":\"$TPL_ID\",\"title\":\"A2\",\"idempotencyKey\":\"idem-a2\",\"intentKey\":\"intent-a2\"}")
echo "A2=$A2"
A2_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$A2")
test "$A1_ID" != "$A2_ID"

echo "GET todos:"
curl -sS "${AUTH_A[@]}" "http://127.0.0.1:${PORT}/api/v1/workbench/todos"
echo

echo "other tenant instances (expect total=0):"
OTHER=$(curl -sS "${AUTH_B[@]}" "http://127.0.0.1:${PORT}/api/v1/workbench/instances")
echo "$OTHER"
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["total"]==0' "$OTHER"

CODE404=$(curl -sS -o /tmp/zker-wb-404.json -w "%{http_code}" \
  "${AUTH_B[@]}" "http://127.0.0.1:${PORT}/api/v1/workbench/instances/${A1_ID}")
echo "cross_tenant_get_status=$CODE404"
test "$CODE404" = "404"

curl -sS -X PUT "${AUTH_A[@]}" \
  -H 'Content-Type: application/json' \
  "http://127.0.0.1:${PORT}/api/v1/workbench/instances/${A1_ID}/draft" \
  -d '{"draft":"only-A1"}' >/dev/null
A1_DETAIL=$(curl -sS "${AUTH_A[@]}" \
  "http://127.0.0.1:${PORT}/api/v1/workbench/instances/${A1_ID}")
A2_DETAIL=$(curl -sS "${AUTH_A[@]}" \
  "http://127.0.0.1:${PORT}/api/v1/workbench/instances/${A2_ID}")
python3 - <<PY
import json
a1=json.loads('''$A1_DETAIL''')
a2=json.loads('''$A2_DETAIL''')
assert a1["draft"]=="only-A1"
assert a2["draft"]==""
assert a1["threadId"]!=a2["threadId"]
assert a1["configId"]!=a2["configId"]
assert a1["urlPath"]!=a2["urlPath"]
print("draft_isolation_ok")
PY

kill "$(cat /tmp/zker-wb-api.pid)"
rm -f /tmp/zker-wb-api.pid
sleep 1

node apps/api/dist/main.js >/tmp/zker-wb-api.log 2>&1 &
echo $! >/tmp/zker-wb-api.pid
sleep 1

echo "after restart instances:"
curl -sS "${AUTH_A[@]}" "http://127.0.0.1:${PORT}/api/v1/workbench/instances"
echo
echo "files:"
ls -la "$DATA_DIR"
