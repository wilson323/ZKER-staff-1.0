#!/usr/bin/env bash
# 本地 curl 验收：M1-02 领取 / 配置 / 转派（真实 API，禁 mock）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="$(mktemp -d /tmp/zker-claim-XXXX)"
PORT=3093
export ZKER_DATA_DIR="$DATA_DIR"
export PORT

AUTH_A=(-H 'X-Tenant-Id: tenant-alpha' -H 'X-Person-Id: demo_executor')
AUTH_B=(-H 'X-Tenant-Id: tenant-alpha' -H 'X-Person-Id: collab_bob')
AUTH_X=(-H 'X-Tenant-Id: tenant-beta' -H 'X-Person-Id: other_user')
JSON_CT='Content-Type: application/json'

cleanup() {
  if [[ -f /tmp/zker-claim-api.pid ]]; then
    kill "$(cat /tmp/zker-claim-api.pid)" 2>/dev/null || true
    rm -f /tmp/zker-claim-api.pid
  fi
}
trap cleanup EXIT

cd "$ROOT"
node apps/api/dist/main.js >/tmp/zker-claim-api.log 2>&1 &
echo $! >/tmp/zker-claim-api.pid
sleep 1

echo "DATA_DIR=$DATA_DIR"

echo "GET claimable empty:"
EMPTY=$(curl -sS "${AUTH_A[@]}" "http://127.0.0.1:${PORT}/api/v1/workbench/claimable-tasks")
echo "$EMPTY"
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["total"]==0' "$EMPTY"

EMP=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "http://127.0.0.1:${PORT}/api/v1/digital-employees" \
  -d '{"name":"claim-aide"}')
EMP_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$EMP")
echo "employee=$EMP_ID"

TPL=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "http://127.0.0.1:${PORT}/api/v1/workbench/templates" \
  -d '{"code":"biz-intake","title":"商务立项模板"}')
TPL_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$TPL")

A1=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "http://127.0.0.1:${PORT}/api/v1/workbench/instances" \
  -d "{\"templateId\":\"$TPL_ID\",\"title\":\"A1\",\"idempotencyKey\":\"idem-claim-a1\",\"intentKey\":\"intent-claim-a1\"}")
echo "A1=$A1"

TASKS=$(curl -sS "${AUTH_A[@]}" "http://127.0.0.1:${PORT}/api/v1/workbench/claimable-tasks")
echo "tasks=$TASKS"
TASK_ID=$(python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["total"]==1; assert d["items"][0]["state"]=="OPEN"; print(d["items"][0]["id"])' "$TASKS")

CLAIM_A=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "http://127.0.0.1:${PORT}/api/v1/workbench/claimable-tasks/${TASK_ID}/claim" \
  -d '{}')
echo "claim_a=$CLAIM_A"
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["state"]=="CLAIMED"; assert d["assigneePersonId"]=="demo_executor"' "$CLAIM_A"
REV=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["revision"])' "$CLAIM_A")
EPOCH=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["responsibilityEpoch"])' "$CLAIM_A")

CODE409=$(curl -sS -o /tmp/zker-claim-409.json -w "%{http_code}" \
  -X POST "${AUTH_B[@]}" -H "$JSON_CT" \
  "http://127.0.0.1:${PORT}/api/v1/workbench/claimable-tasks/${TASK_ID}/claim" \
  -d '{}')
echo "concurrent_claim_status=$CODE409 body=$(cat /tmp/zker-claim-409.json)"
test "$CODE409" = "409"

CFG=$(curl -sS -X PUT "${AUTH_A[@]}" -H "$JSON_CT" \
  "http://127.0.0.1:${PORT}/api/v1/workbench/claimable-tasks/${TASK_ID}/config" \
  -d "{\"mode\":\"ASSISTED\",\"digitalEmployeeId\":\"$EMP_ID\",\"preferenceNote\":\"正式\",\"expectedRevision\":$REV,\"responsibilityEpoch\":$EPOCH}")
echo "config=$CFG"
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["started"] is False; assert d["state"]=="ACTIVE"; assert d["budgetTokens"]==8000' "$CFG"
REV2=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["revision"])' "$CFG")

CODE400=$(curl -sS -o /tmp/zker-claim-400.json -w "%{http_code}" \
  -X PUT "${AUTH_A[@]}" -H "$JSON_CT" \
  "http://127.0.0.1:${PORT}/api/v1/workbench/claimable-tasks/${TASK_ID}/config" \
  -d "{\"mode\":\"MANUAL\",\"expectedRevision\":$REV2,\"responsibilityEpoch\":$EPOCH,\"budgetTokens\":1}")
echo "override_budget_status=$CODE400"
test "$CODE400" = "400"

XFER=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "http://127.0.0.1:${PORT}/api/v1/workbench/claimable-tasks/${TASK_ID}/transfer" \
  -d "{\"toPersonId\":\"collab_bob\",\"expectedRevision\":$REV2,\"responsibilityEpoch\":$EPOCH}")
echo "transfer=$XFER"
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["assigneePersonId"]=="collab_bob"; assert d["responsibilityEpoch"]==1' "$XFER"

CODE404CFG=$(curl -sS -o /tmp/zker-claim-cfg404.json -w "%{http_code}" \
  "${AUTH_A[@]}" "http://127.0.0.1:${PORT}/api/v1/workbench/claimable-tasks/${TASK_ID}/config")
echo "revoked_config_status=$CODE404CFG"
test "$CODE404CFG" = "404"

OTHER=$(curl -sS "${AUTH_X[@]}" "http://127.0.0.1:${PORT}/api/v1/workbench/claimable-tasks")
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["total"]==0' "$OTHER"

kill "$(cat /tmp/zker-claim-api.pid)"
rm -f /tmp/zker-claim-api.pid
sleep 1

node apps/api/dist/main.js >/tmp/zker-claim-api.log 2>&1 &
echo $! >/tmp/zker-claim-api.pid
sleep 1

AFTER=$(curl -sS "${AUTH_A[@]}" "http://127.0.0.1:${PORT}/api/v1/workbench/claimable-tasks")
echo "after_restart=$AFTER"
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["total"]==1; assert d["items"][0]["state"]=="CLAIMED"; assert d["items"][0]["responsibilityEpoch"]==1' "$AFTER"
echo "files:"
ls -la "$DATA_DIR"
echo "claim_smoke_ok"
