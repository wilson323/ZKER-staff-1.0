/**
 * M1-04 有界执行领域规则。
 *
 * TRACE-attempt-20260912-fence与查证
 */
import { PersonConfigMode } from "./claim.types";
import { AttemptRecord, AttemptState, StartAttemptRequest } from "./attempt.types";

/** 仍占用 fence 的活跃态。 */
export const ACTIVE_ATTEMPT_STATES: AttemptState[] = [
  "QUEUED",
  "PREPARING",
  "RUNNING",
  "CANCEL_REQUESTED",
  "RESULT_UNKNOWN",
];

/** 终态。 */
export const TERMINAL_ATTEMPT_STATES: AttemptState[] = [
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
];

/**
 * 规范化启动请求。
 *
 * Args:
 *   request: 原始请求。
 *
 * Returns:
 *   规范化后的字段。
 *
 * Raises:
 *   Error: 缺幂等键等。
 */
export function normalizeStartRequest(request: StartAttemptRequest): {
  idempotencyKey: string;
  snapshotId: string | null;
  acknowledgeNewAttempt: boolean;
} {
  const key = (request.idempotencyKey ?? "").trim();
  if (!key) {
    throw new Error("idempotencyKey is required");
  }
  if (key.length > 128) {
    throw new Error("idempotencyKey too long");
  }
  const snapshotId =
    request.snapshotId === undefined || request.snapshotId === null
      ? null
      : String(request.snapshotId).trim() || null;
  return {
    idempotencyKey: key,
    snapshotId,
    acknowledgeNewAttempt: request.acknowledgeNewAttempt === true,
  };
}

/**
 * 判断记录是否占用活跃 fence。
 */
export function isActiveAttempt(record: AttemptRecord): boolean {
  return ACTIVE_ATTEMPT_STATES.includes(record.state);
}

/**
 * 取消后新建提示文案。
 *
 * Args:
 *   parentId: 被取消的 Attempt id。
 *   nextNumber: 新序号。
 *
 * Returns:
 *   明示非续跑的中文说明。
 */
export function buildNewAttemptNotice(
  parentId: string,
  nextNumber: number,
): string {
  return (
    `这是新的 Attempt #${nextNumber}（父 Attempt ${parentId} 已取消），` +
    `不是原执行的续跑；取消前可能仍有未确认的外部副作用，须按 C14 查证后再依赖结果。`
  );
}

/**
 * MANUAL 模式不得标记已调用模型。
 */
export function assertModeModelFlag(
  mode: PersonConfigMode,
  modelInvoked: boolean,
): void {
  if (mode === "MANUAL" && modelInvoked) {
    throw new Error("MANUAL mode forbids model invocation");
  }
}

/**
 * 阶段推进表：本切片确定性本地 runner。
 *
 * Args:
 *   state: 当前状态。
 *
 * Returns:
 *   下一状态，或 null 表示不可 advance。
 */
export function nextAdvanceState(state: AttemptState): AttemptState | null {
  switch (state) {
    case "QUEUED":
      return "PREPARING";
    case "PREPARING":
      return "RUNNING";
    case "RUNNING":
      return "SUCCEEDED";
    case "CANCEL_REQUESTED":
      return "CANCELLED";
    case "RESULT_UNKNOWN":
      return null;
    case "SUCCEEDED":
    case "FAILED":
    case "CANCELLED":
      return null;
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

/**
 * 状态对应阶段文案。
 */
export function stageForState(state: AttemptState, mode: PersonConfigMode): string {
  switch (state) {
    case "QUEUED":
      return "已受理，等待调度";
    case "PREPARING":
      return "准备上下文与 fence";
    case "RUNNING":
      return mode === "MANUAL"
        ? "人工执行中（无模型调用）"
        : "AI 辅助执行中";
    case "SUCCEEDED":
      return "执行成功，成果已落盘";
    case "FAILED":
      return "执行失败";
    case "CANCEL_REQUESTED":
      return "取消请求已登记，等待停止确认";
    case "CANCELLED":
      return "已取消";
    case "RESULT_UNKNOWN":
      return "外部写效果未知，待 C14 查证";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
