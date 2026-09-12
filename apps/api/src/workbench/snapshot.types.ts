/**
 * M1-03 来源确认 / 上下文预览 / 执行快照最小类型。
 *
 * 对齐 47 号：C16 基线、C05 人员预览、C06 重验快照。
 * 非正式完整合同字段全集。
 */

/** 来源对人可见性。 */
export type SourceVisibility = "PERSON" | "BACKEND_ONLY";

/** 来源生命周期。 */
export type SourceState = "ACTIVE" | "REVOKED";

/** 快照生成结果状态。 */
export type SnapshotBuildState = "READY" | "BLOCKED";

/**
 * 任务来源记录（按 work/instance 隔离）。
 */
export interface TaskSourceRecord {
  id: string;
  humanTaskId: string;
  workId: string;
  tenantId: string;
  label: string;
  /** 内容版本；确认进基线后变更会使旧预览失效。 */
  version: number;
  visibility: SourceVisibility;
  required: boolean;
  state: SourceState;
  /** 补充入口提示（缺项时给人看）。 */
  supplementHint: string;
  createdAt: string;
  updatedAt: string;
}

/** 基线中锁定的来源引用。 */
export interface BaselineSourceRef {
  sourceId: string;
  version: number;
  label: string;
  required: boolean;
}

/**
 * 不可变事实基线（C16 确认后形成）。
 */
export interface FactBaselineRecord {
  id: string;
  humanTaskId: string;
  workId: string;
  tenantId: string;
  confirmedBy: string;
  responsibilityEpoch: number;
  sourceRefs: BaselineSourceRef[];
  digest: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 人员上下文预览（C05）；不含后台私有正文。
 */
export interface ContextPreviewRecord {
  id: string;
  humanTaskId: string;
  workId: string;
  tenantId: string;
  personId: string;
  baselineId: string | null;
  /** 人员可见 ACTIVE 来源投影。 */
  visibleSources: Array<{
    sourceId: string;
    label: string;
    version: number;
    required: boolean;
    state: SourceState;
  }>;
  missingRequired: Array<{
    sourceId: string | null;
    label: string;
    supplementHint: string;
  }>;
  /** 仅计数，不泄露后台私有内容。 */
  backendOnlyActiveCount: number;
  /** 预览成功永不充当执行授权。 */
  previewAuthorizedExecution: false;
  createdAt: string;
}

/**
 * 执行上下文 Manifest（C06 重验产物之一）。
 */
export interface ContextManifestRecord {
  id: string;
  humanTaskId: string;
  workId: string;
  tenantId: string;
  purpose: string;
  baselineId: string;
  sourceRefs: BaselineSourceRef[];
  digest: string;
  createdAt: string;
}

/**
 * 执行快照（C06）；BLOCKED 时保留阻断原因。
 */
export interface ExecutionSnapshotRecord {
  id: string;
  humanTaskId: string;
  workId: string;
  tenantId: string;
  baselineId: string | null;
  manifestId: string | null;
  personConfigId: string | null;
  responsibilityEpoch: number;
  digest: string;
  sourceRefs: BaselineSourceRef[];
  state: SnapshotBuildState;
  blockReason: string | null;
  /** 关联预览 id（若有）；预览本身不授权。 */
  previewId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 列表响应。 */
export interface SnapshotListResponse<T> {
  items: T[];
  total: number;
}

/** 登记来源请求。 */
export interface RegisterSourceRequest {
  label: string;
  required?: boolean;
  visibility?: SourceVisibility;
  supplementHint?: string;
}

/** 确认基线请求。 */
export interface ConfirmBaselineRequest {
  sourceIds: string[];
  responsibilityEpoch: number;
}

/** 生成执行快照请求。 */
export interface BuildSnapshotRequest {
  /** 可选：引用最近预览；不能单独充当授权。 */
  previewId?: string | null;
  purpose?: string;
}
