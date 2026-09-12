#!/usr/bin/env bash
# 本地 curl 验收：M1-06 独立审核与交付（真实 API，禁 mock）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="$(mktemp -d /tmp/zker-review-XXXX)"
PORT=3097
export ZKER_DATA_DIR="$DATA_DIR"
export PORT

AUTH_A=(-H 'X-Tenant-Id: tenant-alpha' -H 'X-Person-Id: demo_executor')
AUTH_R=(-H 'X-Tenant-Id: tenant-alpha' -H 'X-Person-Id: demo_reviewer')
JSON_CT='Content-Type: application/json'
BASE="http://127.0.0.1:${PORT}/api/v1"

cleanup() {
  if [[ -f /tmp/zker-review-api.pid ]]; then
    kill "$(cat /tmp/zker-review-api.pid)" 2>/dev/null || true
    rm -f /tmp/zker-review-api.pid
  fi
}
trap cleanup EXIT

cd "$ROOT"
node apps/api/dist/main.js >/tmp/zker-review-api.log 2>&1 &
echo $! >/tmp/zker-review-api.pid
sleep 1

echo "DATA_DIR=$DATA_DIR"

TPL=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/templates" \
  -d '{"code":"biz-review","title":"审核交付模板"}')
TPL_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$TPL")

curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/instances" \
  -d "{\"templateId\":\"$TPL_ID\",\"title\":\"R1\",\"idempotencyKey\":\"idem-rev-a1\",\"intentKey\":\"intent-rev-a1\"}" >/tmp/zker-rev-inst.json

TASKS=$(curl -sS "${AUTH_A[@]}" "$BASE/workbench/claimable-tasks")
TASK_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["items"][0]["id"])' "$TASKS")
CLAIM=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/claim" -d '{}')
REV=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["revision"])' "$CLAIM")
EPOCH=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["responsibilityEpoch"])' "$CLAIM")

SRC=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/sources" \
  -d '{"label":"合同正文","required":true,"visibility":"PERSON"}')
SRC_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$SRC")

BASELINE=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/baseline/confirm" \
  -d "{\"sourceIds\":[\"$SRC_ID\"],\"responsibilityEpoch\":$EPOCH}")
BASE_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$BASELINE")

BODY='真实审核交付正文'
SIZE=$(python3 -c 'import sys; print(len(sys.argv[1].encode("utf-8")))' "$BODY")
PREP=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/artifacts/prepare" \
  -d "{\"fileName\":\"报告.md\",\"mediaType\":\"text/markdown\",\"sizeBytes\":$SIZE}")
UP_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$PREP")
curl -sS -X PUT "${AUTH_A[@]}" -H 'Content-Type: application/octet-stream' \
  --data-binary "$BODY" "$BASE/workbench/uploads/${UP_ID}/bytes" >/dev/null
ART=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/uploads/${UP_ID}/complete" -d '{}')
ART_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$ART")
DIG=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["digest"])' "$ART")

REL=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/output-releases" \
  -d "{\"artifactVersionId\":\"$ART_ID\",\"audience\":\"REVIEWER\",\"sourceVersionNote\":\"v1\",\"release\":true}")
REL_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$REL")

# 自批拒绝
SELF_CODE=$(curl -sS -o /tmp/zker-rev-self.json -w "%{http_code}" \
  -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/reviews" \
  -d "{\"candidateReleaseId\":\"$REL_ID\",\"baselineId\":\"$BASE_ID\",\"reviewerMemberId\":\"demo_executor\",\"expectedRevision\":$REV,\"responsibilityEpoch\":$EPOCH}")
echo "self_approval_status=$SELF_CODE"
test "$SELF_CODE" = "403"

REQ=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/reviews" \
  -d "{\"candidateReleaseId\":\"$REL_ID\",\"baselineId\":\"$BASE_ID\",\"reviewerMemberId\":\"demo_reviewer\",\"expectedRevision\":$REV,\"responsibilityEpoch\":$EPOCH}")
REQ_ID=$(python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["state"]=="PENDING"; print(d["id"])' "$REQ")
REQ_REV=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["revision"])' "$REQ")

RECEIPT=$(curl -sS -X POST "${AUTH_R[@]}" -H "$JSON_CT" \
  "$BASE/workbench/reviews/${REQ_ID}/decide" \
  -d "{\"decision\":\"APPROVE\",\"reason\":\"材料齐全\",\"candidateDigest\":\"$DIG\",\"expectedRevision\":$REQ_REV}")
RCP_ID=$(python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["decision"]=="APPROVE"; print(d["id"])' "$RECEIPT")

CHECK=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/completion-checks" \
  -d "{\"artifactVersionIds\":[\"$ART_ID\"],\"baselineId\":\"$BASE_ID\",\"approvalReceiptIds\":[\"$RCP_ID\"],\"expectedRevision\":$REV,\"responsibilityEpoch\":$EPOCH}")
CHECK_ID=$(python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["state"]=="VALID"; print(d["id"])' "$CHECK")

DEL=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/deliveries" \
  -d "{\"completionCheckId\":\"$CHECK_ID\",\"artifactVersionIds\":[\"$ART_ID\"],\"baselineId\":\"$BASE_ID\",\"approvalReceiptIds\":[\"$RCP_ID\"],\"provenanceNote\":\"人工核对\",\"expectedRevision\":$REV,\"responsibilityEpoch\":$EPOCH}")
DEL_ID=$(python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["oaSyncState"]=="PENDING_COMMIT"; print(d["id"])' "$DEL")

VIEW=$(curl -sS "${AUTH_A[@]}" "$BASE/workbench/deliveries/${DEL_ID}/view")
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["delivered"] is False; assert d["oaSyncState"]=="PENDING_COMMIT"' "$VIEW"

DUP_CODE=$(curl -sS -o /tmp/zker-rev-dup.json -w "%{http_code}" \
  -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/deliveries" \
  -d "{\"completionCheckId\":\"$CHECK_ID\",\"artifactVersionIds\":[\"$ART_ID\"],\"baselineId\":\"$BASE_ID\",\"approvalReceiptIds\":[\"$RCP_ID\"],\"provenanceNote\":\"重复\",\"expectedRevision\":$REV,\"responsibilityEpoch\":$EPOCH}")
echo "duplicate_delivery_status=$DUP_CODE"
test "$DUP_CODE" = "409"

curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/deliveries/${DEL_ID}/confirm-oa" -d '{}' >/tmp/zker-rev-oa.json
VIEW2=$(curl -sS "${AUTH_A[@]}" "$BASE/workbench/deliveries/${DEL_ID}/view")
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["delivered"] is True' "$VIEW2"

# 重启回读
kill "$(cat /tmp/zker-review-api.pid)"
rm -f /tmp/zker-review-api.pid
sleep 1
node apps/api/dist/main.js >/tmp/zker-review-api.log 2>&1 &
echo $! >/tmp/zker-review-api.pid
sleep 1
VIEW3=$(curl -sS "${AUTH_A[@]}" "$BASE/workbench/deliveries/${DEL_ID}/view")
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["delivered"] is True' "$VIEW3"

echo "SMOKE_OK"
