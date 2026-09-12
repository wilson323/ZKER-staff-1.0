#!/usr/bin/env bash
# 本地 curl 验收：M1-05 产物与受众发布（真实 API，禁 mock）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="$(mktemp -d /tmp/zker-publish-XXXX)"
PORT=3096
export ZKER_DATA_DIR="$DATA_DIR"
export PORT

AUTH_A=(-H 'X-Tenant-Id: tenant-alpha' -H 'X-Person-Id: demo_executor')
AUTH_R=(-H 'X-Tenant-Id: tenant-alpha' -H 'X-Person-Id: demo_reviewer')
JSON_CT='Content-Type: application/json'
BASE="http://127.0.0.1:${PORT}/api/v1"

cleanup() {
  if [[ -f /tmp/zker-publish-api.pid ]]; then
    kill "$(cat /tmp/zker-publish-api.pid)" 2>/dev/null || true
    rm -f /tmp/zker-publish-api.pid
  fi
}
trap cleanup EXIT

cd "$ROOT"
node apps/api/dist/main.js >/tmp/zker-publish-api.log 2>&1 &
echo $! >/tmp/zker-publish-api.pid
sleep 1

echo "DATA_DIR=$DATA_DIR"

TPL=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/templates" \
  -d '{"code":"biz-publish","title":"产物发布模板"}')
TPL_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$TPL")

INST=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/instances" \
  -d "{\"templateId\":\"$TPL_ID\",\"title\":\"P1\",\"idempotencyKey\":\"idem-pub-a1\",\"intentKey\":\"intent-pub-a1\"}")
echo "INST=$INST"

TASKS=$(curl -sS "${AUTH_A[@]}" "$BASE/workbench/claimable-tasks")
TASK_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["items"][0]["id"])' "$TASKS")

curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/claim" -d '{}' >/tmp/zker-pub-claim.json

BODY='真实交付正文 v1'
SIZE=$(python3 -c 'import sys; print(len(sys.argv[1].encode("utf-8")))' "$BODY")

PREP=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/artifacts/prepare" \
  -d "{\"fileName\":\"报告.md\",\"mediaType\":\"text/markdown\",\"sizeBytes\":$SIZE}")
echo "PREP=$PREP"
UP_ID=$(python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["state"]=="PREPARED"; print(d["id"])' "$PREP")

curl -sS -X PUT "${AUTH_A[@]}" -H 'Content-Type: application/octet-stream' \
  --data-binary "$BODY" \
  "$BASE/workbench/uploads/${UP_ID}/bytes" >/tmp/zker-pub-bytes.json

ART=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/uploads/${UP_ID}/complete" -d '{}')
echo "ART=$ART"
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["version"]==1; assert d["publicStorageUrl"] is None; assert d["previewText"]=="真实交付正文 v1"; print(d["id"], d["digest"])' "$ART"
ART_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$ART")
DIG=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["digest"])' "$ART")

# 同名第二版
BODY2='真实交付正文 v2'
SIZE2=$(python3 -c 'import sys; print(len(sys.argv[1].encode("utf-8")))' "$BODY2")
PREP2=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/artifacts/prepare" \
  -d "{\"fileName\":\"报告.md\",\"mediaType\":\"text/markdown\",\"sizeBytes\":$SIZE2}")
UP2=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$PREP2")
curl -sS -X PUT "${AUTH_A[@]}" -H 'Content-Type: application/octet-stream' \
  --data-binary "$BODY2" "$BASE/workbench/uploads/${UP2}/bytes" >/dev/null
ART2=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/uploads/${UP2}/complete" -d '{}')
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["version"]==2; assert d["fileName"]=="报告.md"' "$ART2"

# clientDigest 冲突
PREP3=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/artifacts/prepare" \
  -d "{\"fileName\":\"冲突.txt\",\"mediaType\":\"text/plain\",\"sizeBytes\":4}")
UP3=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$PREP3")
curl -sS -X PUT "${AUTH_A[@]}" -H 'Content-Type: application/octet-stream' \
  --data-binary 'abcd' "$BASE/workbench/uploads/${UP3}/bytes" >/dev/null
CODE409=$(curl -sS -o /tmp/zker-pub-mismatch.json -w "%{http_code}" \
  -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/uploads/${UP3}/complete" \
  -d '{"clientDigest":"sha256:0000000000000000000000000000000000000000000000000000000000000000"}')
echo "digest_mismatch_status=$CODE409"
test "$CODE409" = "409"

# 候选不可读正文
CAND=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/output-releases" \
  -d "{\"artifactVersionId\":\"$ART_ID\",\"audience\":\"REVIEWER\",\"sourceVersionNote\":\"来源v1\",\"release\":false}")
CAND_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$CAND")
VIEW_DENY=$(curl -sS "${AUTH_R[@]}" "$BASE/workbench/output-releases/${CAND_ID}/view")
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["allowed"] is False; assert d["previewText"] is None' "$VIEW_DENY"

# 获准后审阅人可读；承担人受众不符无正文
REL=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/output-releases" \
  -d "{\"artifactVersionId\":\"$ART_ID\",\"audience\":\"REVIEWER\",\"sourceVersionNote\":\"来源v1\",\"release\":true}")
REL_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$REL")
VIEW_OK=$(curl -sS "${AUTH_R[@]}" "$BASE/workbench/output-releases/${REL_ID}/view")
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["allowed"] is True; assert d["previewText"]=="真实交付正文 v1"' "$VIEW_OK"
VIEW_A=$(curl -sS "${AUTH_A[@]}" "$BASE/workbench/output-releases/${REL_ID}/view")
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["allowed"] is False; assert d["previewText"] is None' "$VIEW_A"

# 下载重验 digest
HDR=$(curl -sS -D - -o /tmp/zker-pub-dl.bin "${AUTH_A[@]}" \
  "$BASE/workbench/artifacts/${ART_ID}/content")
echo "$HDR" | grep -i "X-Content-Digest: $DIG"
python3 -c 'import pathlib; assert pathlib.Path("/tmp/zker-pub-dl.bin").read_text()=="真实交付正文 v1"'

# 二进制不可预览
PREP4=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/claimable-tasks/${TASK_ID}/artifacts/prepare" \
  -d '{"fileName":"blob.bin","mediaType":"application/octet-stream","sizeBytes":3}')
UP4=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$PREP4")
printf '\x00\x01\xff' >/tmp/zker-pub-bin
curl -sS -X PUT "${AUTH_A[@]}" -H 'Content-Type: application/octet-stream' \
  --data-binary @/tmp/zker-pub-bin "$BASE/workbench/uploads/${UP4}/bytes" >/dev/null
BIN=$(curl -sS -X POST "${AUTH_A[@]}" -H "$JSON_CT" \
  "$BASE/workbench/uploads/${UP4}/complete" -d '{}')
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["scanStatus"]=="PARSE_FAILED"; assert d["previewText"] is None; assert d["parseError"]' "$BIN"

# 重启回读
kill "$(cat /tmp/zker-publish-api.pid)"
rm -f /tmp/zker-publish-api.pid
sleep 1
node apps/api/dist/main.js >/tmp/zker-publish-api.log 2>&1 &
echo $! >/tmp/zker-publish-api.pid
sleep 1
LIST=$(curl -sS "${AUTH_A[@]}" "$BASE/workbench/claimable-tasks/${TASK_ID}/artifacts")
python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["total"]>=2' "$LIST"

echo "SMOKE_OK"
