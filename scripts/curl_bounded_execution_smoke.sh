#!/usr/bin/env bash
# 本地 curl 验收：M1-04 有界执行（真实 API，禁 mock）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="$(mktemp -d /tmp/zker-attempt-XXXX)"
PORT=3095
export ZKER_DATA_DIR="$DATA_DIR"
export PORT

AUTH_A=(-H 'X-Tenant-Id: tenant-alpha' -H 'X-Person-Id: demo_executor')
JSON_CT='Content-Type: application/json'
BASE="http://127.0.0.1:${PORT}/api/v1"

cleanup() {
  if [[ -f /tmp/zker-attempt-api.pid ]]; then
    kill "$(cat /tmp/zker-attempt-api.pid)" 2>/dev/null || true
    rm -f /tmp/zker-attempt-api.pid
  fi
}
trap cleanup EXIT

cd "$ROOT"
node apps/api/dist/main.js >/tmp/zker-attempt-api.log 2>&1 &
echo $! >/tmp/zker-attempt-api.pid
sleep 1

echo "DATA_DIR=$DATA_DIR"

EMP=$(curl -sS -X POST -H "$JSON_CT" "$BASE/digital-employees" -d '{"name":"aide-m104"}')
EMP_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$EMP")

TPL=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/templates" \
  -d '{"code":"biz-attempt","title":"有界执行模板"}')
TPL_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$TPL")

INST=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/instances" \
  -d "{\"templateId\":\"$TPL_ID\",\"title\":\"A1\",\"idempotencyKey\":\"idem-att-a1\",\"intentKey\":\"intent-att-a1\"}")
echo "INST=$INST"

TASKS=$(curl -sS "${AUTH_A[@]}" "$BASE/workbench/claimable-tasks")
TASK_ID=$(python3 -c 'import json,sys; d=json.loads(sys.argv[1]); print(d["items"][0]["id"])' "$TASKS")

CLAIM=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/claim" -d '{}')
EPOCH=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["responsibilityEpoch"])' "$CLAIM")
REV=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["revision"])' "$CLAIM")

CFG=$(curl -sS -X PUT "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/config" \
  -d "{\"mode\":\"ASSISTED\",\"digitalEmployeeId\":\"$EMP_ID\",\"expectedRevision\":$REV,\"responsibilityEpoch\":$EPOCH}")
echo "CFG=$CFG"

SRC=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/sources" \
  -d '{"label":"合同正文","required":true,"visibility":"PERSON"}')
SRC_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$SRC")

curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/baseline/confirm" \
  -d "{\"sourceIds\":[\"$SRC_ID\"],\"responsibilityEpoch\":$EPOCH}" >/tmp/zker-att-baseline.json

PREV=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/context-preview" -d '{}')
PREV_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$PREV")

SNAP=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/execution-snapshot" \
  -d "{\"previewId\":\"$PREV_ID\"}")
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["state"]=="READY"' "$SNAP"

# 无快照阻断：用另一任务
INST2=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/instances" \
  -d "{\"templateId\":\"$TPL_ID\",\"title\":\"A2\",\"idempotencyKey\":\"idem-att-a2\",\"intentKey\":\"intent-att-a2\"}")
TASKS2=$(curl -sS "${AUTH_A[@]}" "$BASE/workbench/claimable-tasks")
TASK2=$(python3 -c 'import json,sys; d=json.loads(sys.argv[1]); print([x["id"] for x in d["items"] if x["title"].endswith("A2")][0])' "$TASKS2")
curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK2}/claim" -d '{}' >/tmp/zker-att-claim2.json
CODE409A=$(curl -sS -o /tmp/zker-att-nosnap.json -w "%{http_code}" \
  -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK2}/attempts" \
  -d '{"idempotencyKey":"nosnap"}')
echo "no_snapshot_status=$CODE409A body=$(cat /tmp/zker-att-nosnap.json)"
test "$CODE409A" = "409" -o "$CODE409A" = "400"

# 启动 202 QUEUED
CODE202=$(curl -sS -o /tmp/zker-att-start.json -w "%{http_code}" \
  -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/attempts" \
  -d '{"idempotencyKey":"run-1"}')
echo "start_status=$CODE202 body=$(cat /tmp/zker-att-start.json)"
test "$CODE202" = "202"
ATT_ID=$(python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["state"]=="QUEUED"; assert d["pauseResumeSupported"] is False; print(d["id"])' "$(cat /tmp/zker-att-start.json)")

# 幂等
IDEM=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/attempts" \
  -d '{"idempotencyKey":"run-1"}')
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["id"]==sys.argv[2]' "$IDEM" "$ATT_ID"

# fence 占用
CODE409B=$(curl -sS -o /tmp/zker-att-fence.json -w "%{http_code}" \
  -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/attempts" \
  -d '{"idempotencyKey":"run-2"}')
echo "fence_status=$CODE409B"
test "$CODE409B" = "409"

# 取消 QUEUED → CANCELLED
CANCEL=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/attempts/${ATT_ID}/cancel" \
  -d '{"reason":"改需求"}')
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["state"]=="CANCELLED"' "$CANCEL"

# 未 acknowledge 再启
CODE400=$(curl -sS -o /tmp/zker-att-ack.json -w "%{http_code}" \
  -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/attempts" \
  -d '{"idempotencyKey":"run-3"}')
echo "no_ack_status=$CODE400 body=$(cat /tmp/zker-att-ack.json)"
test "$CODE400" = "400"

ATT2=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/attempts" \
  -d '{"idempotencyKey":"run-3","acknowledgeNewAttempt":true}')
ATT2_ID=$(python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["attemptNumber"]==2; assert "续跑" in (d["newAttemptNotice"] or ""); print(d["id"])' "$ATT2")

curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/attempts/${ATT2_ID}/advance" -d '{}' >/tmp/zker-att-p.json
curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/attempts/${ATT2_ID}/advance" -d '{}' >/tmp/zker-att-r.json
python3 -c 'import json,sys; d=json.loads(open("/tmp/zker-att-r.json").read()); assert d["state"]=="RUNNING"; assert d["modelInvoked"] is True'

UNK=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/attempts/${ATT2_ID}/external-write-timeout" -d '{}')
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["state"]=="RESULT_UNKNOWN"' "$UNK"

CODE409C=$(curl -sS -o /tmp/zker-att-adv.json -w "%{http_code}" \
  -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/attempts/${ATT2_ID}/advance" -d '{}')
echo "unknown_advance_status=$CODE409C"
test "$CODE409C" = "409"

REC=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/attempts/${ATT2_ID}/reconcile" \
  -d '{"outcome":"SUCCEEDED","evidence":"对端确认已写入"}')
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["state"]=="SUCCEEDED"; assert d["publishedOutputs"]' "$REC"

# 重启回读
kill "$(cat /tmp/zker-attempt-api.pid)"
rm -f /tmp/zker-attempt-api.pid
sleep 1
node apps/api/dist/main.js >/tmp/zker-attempt-api.log 2>&1 &
echo $! >/tmp/zker-attempt-api.pid
sleep 1
LIST=$(curl -sS "${AUTH_A[@]}" "$BASE/workbench/claimable-tasks/${TASK_ID}/attempts")
echo "reload=$LIST"
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["total"]==2; assert any(x["state"]=="SUCCEEDED" for x in d["items"])' "$LIST"

echo "SMOKE_OK"
