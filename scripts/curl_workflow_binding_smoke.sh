#!/usr/bin/env bash
# 本地 curl 验收：人/任务/员工绑定闭环（真实 API，禁 mock）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="$(mktemp -d /tmp/zker-wf-XXXX)"
PORT=3091
export ZKER_DATA_DIR="$DATA_DIR"
export PORT

cleanup() {
  if [[ -f /tmp/zker-wf-api.pid ]]; then
    kill "$(cat /tmp/zker-wf-api.pid)" 2>/dev/null || true
    rm -f /tmp/zker-wf-api.pid
  fi
}
trap cleanup EXIT

cd "$ROOT"
JSON_CT='Content-Type: application/json'
node apps/api/dist/main.js >/tmp/zker-wf-api.log 2>&1 &
echo $! >/tmp/zker-wf-api.pid
sleep 1

echo "DATA_DIR=$DATA_DIR"
echo "GET empty bindings:"
curl -sS "http://127.0.0.1:${PORT}/api/v1/task-bindings"
echo

EMP=$(curl -sS -X POST "http://127.0.0.1:${PORT}/api/v1/digital-employees" \
  -H "$JSON_CT" -d '{"name":"research-aide"}')
echo "employee=$EMP"
EMP_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$EMP")

WORK=$(curl -sS -X POST "http://127.0.0.1:${PORT}/api/v1/work-items" \
  -H "$JSON_CT" -d '{"title":"整理客户需求"}')
echo "work=$WORK"
WORK_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$WORK")

TASK=$(curl -sS -X POST "http://127.0.0.1:${PORT}/api/v1/human-tasks" \
  -H "$JSON_CT" \
  -d "{\"workId\":\"$WORK_ID\",\"assigneePersonId\":\"person-alice\",\"title\":\"需求整理节点\"}")
echo "task=$TASK"
TASK_ID=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$TASK")

BIND=$(curl -sS -X POST "http://127.0.0.1:${PORT}/api/v1/task-bindings" \
  -H "$JSON_CT" \
  -d "{\"workId\":\"$WORK_ID\",\"humanTaskId\":\"$TASK_ID\",\"configuredBy\":\"person-alice\",\"mode\":\"ASSISTED\",\"digitalEmployeeId\":\"$EMP_ID\"}")
echo "binding=$BIND"

echo "GET bindings:"
curl -sS "http://127.0.0.1:${PORT}/api/v1/task-bindings"
echo

CODE=$(curl -sS -o /tmp/zker-wf-neg.json -w "%{http_code}" -X POST \
  "http://127.0.0.1:${PORT}/api/v1/task-bindings" \
  -H "$JSON_CT" \
  -d "{\"workId\":\"$WORK_ID\",\"humanTaskId\":\"$TASK_ID\",\"configuredBy\":\"person-alice\",\"mode\":\"ASSISTED\",\"digitalEmployeeId\":\"no-such\"}")
echo "neg_status=$CODE body=$(cat /tmp/zker-wf-neg.json)"
[[ "$CODE" == "400" ]]

kill "$(cat /tmp/zker-wf-api.pid)"
rm -f /tmp/zker-wf-api.pid
sleep 1

node apps/api/dist/main.js >/tmp/zker-wf-api.log 2>&1 &
echo $! >/tmp/zker-wf-api.pid
sleep 1

echo "after restart bindings:"
curl -sS "http://127.0.0.1:${PORT}/api/v1/task-bindings"
echo
echo "after restart work-items:"
curl -sS "http://127.0.0.1:${PORT}/api/v1/work-items"
echo
echo "files:"
ls -la "$DATA_DIR"
