/**
 * M1-04 有界执行 API 客户端（复用会话 HTTP，禁 mock）。
 */
import {
  fetchWithSession,
  writeWithSession,
  type ListResponse,
  type WorkbenchSession,
} from "./workbench-api-client";

/** Attempt 状态。 */
export type AttemptState =
  | "QUEUED"
  | "PREPARING"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCEL_REQUESTED"
  | "CANCELLED"
  | "RESULT_UNKNOWN";

/** Attempt 记录。 */
export interface AttemptRecord {
  id: string;
  humanTaskId: string;
  workId: string;
  mode: "MANUAL" | "ASSISTED" | "AUTONOMOUS";
  fence: number;
  attemptNumber: number;
  state: AttemptState;
  stage: string;
  idempotencyKey: string;
  parentAttemptId: string | null;
  newAttemptNotice: string | null;
  publishedOutputs: Array<{ id: string; label: string; digest: string }>;
  personEvidence: Array<{
    kind: string;
    detail: string;
    sourceVersionNote: string;
  }>;
  modelInvoked: boolean;
  pauseResumeSupported: false;
  unknownReason: string | null;
  reconcileNote: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 启动 Attempt（期望 202）。
 */
export function startAttempt(
  session: WorkbenchSession,
  taskId: string,
  body: {
    idempotencyKey: string;
    snapshotId?: string | null;
    acknowledgeNewAttempt?: boolean;
  },
): Promise<AttemptRecord> {
  return writeWithSession(
    `/workbench/claimable-tasks/${taskId}/attempts`,
    "POST",
    session,
    body,
    "start attempt",
  );
}

/**
 * 列出任务 Attempt。
 */
export function fetchAttempts(
  session: WorkbenchSession,
  taskId: string,
): Promise<ListResponse<AttemptRecord>> {
  return fetchWithSession(
    `/workbench/claimable-tasks/${taskId}/attempts`,
    session,
    "list attempts",
  );
}

/**
 * 读取单条 Attempt。
 */
export function fetchAttempt(
  session: WorkbenchSession,
  attemptId: string,
): Promise<AttemptRecord> {
  return fetchWithSession(
    `/workbench/attempts/${attemptId}`,
    session,
    "get attempt",
  );
}

/**
 * 推进一步。
 */
export function advanceAttempt(
  session: WorkbenchSession,
  attemptId: string,
): Promise<AttemptRecord> {
  return writeWithSession(
    `/workbench/attempts/${attemptId}/advance`,
    "POST",
    session,
    {},
    "advance attempt",
  );
}

/**
 * 取消 Attempt。
 */
export function cancelAttempt(
  session: WorkbenchSession,
  attemptId: string,
  reason: string,
): Promise<AttemptRecord> {
  return writeWithSession(
    `/workbench/attempts/${attemptId}/cancel`,
    "POST",
    session,
    { reason },
    "cancel attempt",
  );
}

/**
 * C14 查证。
 */
export function reconcileAttempt(
  session: WorkbenchSession,
  attemptId: string,
  outcome: "SUCCEEDED" | "FAILED",
  evidence: string,
): Promise<AttemptRecord> {
  return writeWithSession(
    `/workbench/attempts/${attemptId}/reconcile`,
    "POST",
    session,
    { outcome, evidence },
    "reconcile attempt",
  );
}
