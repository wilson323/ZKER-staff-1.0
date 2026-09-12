#!/usr/bin/env bash
# 本地 curl 验收：M1-03 来源确认 / 执行快照（真实 API，禁 mock）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="$(mktemp -d /tmp/zker-snap-XXXX)"
PORT=3094
export ZKER_DATA_DIR="$DATA_DIR"
export PORT

AUTH_A=(-H 'X-Tenant-Id: tenant-alpha' -H 'X-Person-Id: demo_executor')
JSON_CT='Content-Type: application/json'
BASE="http://127.0.0.1:${PORT}/api/v1"

cleanup() {
  if [[ -f /tmp/zker-snap-api.pid ]]; then
    kill "$(cat /tmp/zker-snap-api.pid)" 2>/dev/null || true
    rm -f /tmp/zker-snap-api.pid
  fi
}
trap cleanup EXIT

cd "$ROOT"
node apps/api/dist/main.js >/tmp/zker-snap-api.log 2>&1 &
echo $! >/tmp/zker-snap-api.pid
sleep 1

echo "DATA_DIR=$DATA_DIR"

TPL=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/templates" \
  -d '{"code":"biz-snap","title":"来源快照模板"}')
TPL_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$TPL")

A1=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/instances" \
  -d "{\"templateId\":\"$TPL_ID\",\"title\":\"A1\",\"idempotencyKey\":\"idem-snap-a1\",\"intentKey\":\"intent-snap-a1\"}")
A2=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/instances" \
  -d "{\"templateId\":\"$TPL_ID\",\"title\":\"A2\",\"idempotencyKey\":\"idem-snap-a2\",\"intentKey\":\"intent-snap-a2\"}")
echo "A1=$A1"
echo "A2=$A2"

TASKS=$(curl -sS "${AUTH_A[@]}" "$BASE/workbench/claimable-tasks")
TASK_A1=$(python3 -c 'import json,sys; d=json.loads(sys.argv[1]); print([x["id"] for x in d["items"] if x["title"].endswith("A1")][0])' "$TASKS")
TASK_A2=$(python3 -c 'import json,sys; d=json.loads(sys.argv[1]); print([x["id"] for x in d["items"] if x["title"].endswith("A2")][0])' "$TASKS")

CLAIM1=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_A1}/claim" -d '{}')
CLAIM2=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_A2}/claim" -d '{}')
EPOCH=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["responsibilityEpoch"])' "$CLAIM1")

echo "GET sources empty:"
EMPTY=$(curl -sS "${AUTH_A[@]}" "$BASE/workbench/claimable-tasks/${TASK_A1}/sources")
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["total"]==0' "$EMPTY"

SRC_P=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_A1}/sources" \
  -d '{"label":"合同正文","required":true,"visibility":"PERSON"}')
SRC_B=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_A1}/sources" \
  -d '{"label":"后台密钥","required":false,"visibility":"BACKEND_ONLY"}')
SRC_A2=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_A2}/sources" \
  -d '{"label":"A2专用","required":true,"visibility":"PERSON"}')
SRC_P_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$SRC_P")
echo "src_person=$SRC_P_ID backend=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$SRC_B") a2=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$SRC_A2")"

LIST=$(curl -sS "${AUTH_A[@]}" "$BASE/workbench/claimable-tasks/${TASK_A1}/sources")
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["total"]==1; assert d["items"][0]["label"]=="合同正文"' "$LIST"

PREV=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_A1}/context-preview" -d '{}')
echo "preview=$PREV"
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["previewAuthorizedExecution"] is False; assert d["backendOnlyActiveCount"]==1; assert len(d["visibleSources"])==1' "$PREV"
PREV_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$PREV")

CODE503=$(curl -sS -o /tmp/zker-snap-503.json -w "%{http_code}" \
  -X POST "${AUTH_A[@]}" -H 'X-Authz-Unavailable: 1' -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_A1}/context-preview" -d '{}')
echo "authz_unavailable_status=$CODE503 body=$(cat /tmp/zker-snap-503.json)"
test "$CODE503" = "503"

BASELINE=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_A1}/baseline/confirm" \
  -d "{\"sourceIds\":[\"$SRC_P_ID\",\"$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$SRC_B")\"],\"responsibilityEpoch\":$EPOCH}")
echo "baseline=$BASELINE"
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["digest"].startswith("sha256:")' "$BASELINE"

SNAP=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_A1}/execution-snapshot" \
  -d "{\"previewId\":\"$PREV_ID\",\"purpose\":\"task-execution\"}")
echo "snapshot=$SNAP"
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["state"]=="READY"; assert d["manifestId"]' "$SNAP"

curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_A1}/sources/${SRC_P_ID}/revoke" -d '{}' >/tmp/zker-snap-revoke.json
CODE409=$(curl -sS -o /tmp/zker-snap-409.json -w "%{http_code}" \
  -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_A1}/execution-snapshot" \
  -d "{\"previewId\":\"$PREV_ID\"}")
echo "blocked_status=$CODE409 body=$(cat /tmp/zker-snap-409.json)"
test "$CODE409" = "409"

# 跨实例：A1 列表不含 A2 来源标签
LIST_A2=$(curl -sS "${AUTH_A[@]}" "$BASE/workbench/claimable-tasks/${TASK_A2}/sources")
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["total"]==1; assert d["items"][0]["label"]=="A2专用"' "$LIST_A2"

# 重启回读
kill "$(cat /tmp/zker-snap-api.pid)"
rm -f /tmp/zker-snap-api.pid
sleep 1
node apps/api/dist/main.js >/tmp/zker-snap-api.log 2>&1 &
echo $! >/tmp/zker-snap-api.pid
sleep 1
REBASE=$(curl -sS "${AUTH_A[@]}" "$BASE/workbench/claimable-tasks/${TASK_A1}/baseline")
echo "reload_baseline=$REBASE"
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["digest"].startswith("sha256:")' "$REBASE"

echo "SMOKE_OK"
