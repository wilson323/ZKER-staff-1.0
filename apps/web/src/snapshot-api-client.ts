/**
 * M1-03 来源确认 / 执行快照 API 客户端（复用会话 HTTP，禁 mock）。
 */
import {
  fetchWithSession,
  writeWithSession,
  type ListResponse,
  type WorkbenchSession,
} from "./workbench-api-client";

/** 任务来源。 */
export interface TaskSourceRecord {
  id: string;
  humanTaskId: string;
  workId: string;
  tenantId: string;
  label: string;
  version: number;
  visibility: "PERSON" | "BACKEND_ONLY";
  required: boolean;
  state: "ACTIVE" | "REVOKED";
  supplementHint: string;
  createdAt: string;
  updatedAt: string;
}

/** 事实基线。 */
export interface FactBaselineRecord {
  id: string;
  humanTaskId: string;
  workId: string;
  digest: string;
  responsibilityEpoch: number;
  sourceRefs: Array<{
    sourceId: string;
    version: number;
    label: string;
    required: boolean;
  }>;
  createdAt: string;
}

/** 人员预览。 */
export interface ContextPreviewRecord {
  id: string;
  baselineId: string | null;
  visibleSources: Array<{
    sourceId: string;
    label: string;
    version: number;
    required: boolean;
    state: string;
  }>;
  missingRequired: Array<{
    sourceId: string | null;
    label: string;
    supplementHint: string;
  }>;
  backendOnlyActiveCount: number;
  previewAuthorizedExecution: false;
  createdAt: string;
}

/** 执行快照。 */
export interface ExecutionSnapshotRecord {
  id: string;
  baselineId: string | null;
  manifestId: string | null;
  state: "READY" | "BLOCKED";
  blockReason: string | null;
  previewId: string | null;
  digest: string;
  createdAt: string;
}

/**
 * 列出人员可见来源。
 */
export function fetchTaskSources(
  session: WorkbenchSession,
  taskId: string,
): Promise<ListResponse<TaskSourceRecord>> {
  return fetchWithSession(
    `/workbench/claimable-tasks/${taskId}/sources`,
    session,
    "task sources",
  );
}

/**
 * 登记来源。
 */
export function registerTaskSource(
  session: WorkbenchSession,
  taskId: string,
  body: {
    label: string;
    required?: boolean;
    visibility?: "PERSON" | "BACKEND_ONLY";
    supplementHint?: string;
  },
): Promise<TaskSourceRecord> {
  return writeWithSession(
    `/workbench/claimable-tasks/${taskId}/sources`,
    "POST",
    session,
    body,
    "register source",
  );
}

/**
 * 撤销来源。
 */
export function revokeTaskSource(
  session: WorkbenchSession,
  taskId: string,
  sourceId: string,
): Promise<TaskSourceRecord> {
  return writeWithSession(
    `/workbench/claimable-tasks/${taskId}/sources/${sourceId}/revoke`,
    "POST",
    session,
    {},
    "revoke source",
  );
}

/**
 * 确认基线。
 */
export function confirmFactBaseline(
  session: WorkbenchSession,
  taskId: string,
  sourceIds: string[],
  responsibilityEpoch: number,
): Promise<FactBaselineRecord> {
  return writeWithSession(
    `/workbench/claimable-tasks/${taskId}/baseline/confirm`,
    "POST",
    session,
    { sourceIds, responsibilityEpoch },
    "confirm baseline",
  );
}

/**
 * 读取基线。
 */
export function fetchFactBaseline(
  session: WorkbenchSession,
  taskId: string,
): Promise<FactBaselineRecord> {
  return fetchWithSession(
    `/workbench/claimable-tasks/${taskId}/baseline`,
    session,
    "fact baseline",
  );
}

/**
 * 生成人员预览。
 */
export function createContextPreview(
  session: WorkbenchSession,
  taskId: string,
): Promise<ContextPreviewRecord> {
  return writeWithSession(
    `/workbench/claimable-tasks/${taskId}/context-preview`,
    "POST",
    session,
    {},
    "context preview",
  );
}

/**
 * 生成执行快照。
 */
export function createExecutionSnapshot(
  session: WorkbenchSession,
  taskId: string,
  body: { previewId?: string | null; purpose?: string } = {},
): Promise<ExecutionSnapshotRecord> {
  return writeWithSession(
    `/workbench/claimable-tasks/${taskId}/execution-snapshot`,
    "POST",
    session,
    body,
    "execution snapshot",
  );
}

/**
 * 读取最新执行快照。
 */
export function fetchExecutionSnapshot(
  session: WorkbenchSession,
  taskId: string,
): Promise<ExecutionSnapshotRecord> {
  return fetchWithSession(
    `/workbench/claimable-tasks/${taskId}/execution-snapshot`,
    session,
    "get execution snapshot",
  );
}
