/**
 * M1-05 产物与受众发布最小类型。
 *
 * 对齐 47 号：prepare→隔离区→digest→ArtifactVersion→OutputRelease。
 * TRACE-publish-20260912-产物受众类型
 */

/** 上传票据状态。 */
export type UploadTicketState =
  | "PREPARED"
  | "BYTES_WRITTEN"
  | "COMPLETED"
  | "REJECTED";

/** 扫描/解析状态。 */
export type ArtifactScanStatus = "CLEAN" | "REJECTED" | "PARSE_FAILED";

/** 发布受众（本切片子集）。 */
export type ReleaseAudience = "ASSIGNEE" | "REVIEWER" | "TENANT";

/** 发布状态。 */
export type OutputReleaseState = "CANDIDATE" | "RELEASED" | "BLOCKED";

/**
 * C20 上传票据：绑定主体/工作/大小/MIME；字节进隔离区。
 */
export interface UploadTicketRecord {
  id: string;
  humanTaskId: string;
  workId: string;
  tenantId: string;
  personId: string;
  fileName: string;
  mediaType: string;
  sizeBytes: number;
  state: UploadTicketState;
  /** 隔离区相对键；永不作为公开 URL 返回。 */
  isolationKey: string;
  bytesDigest: string | null;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * ArtifactVersion：服务端重算 digest；无公开 storage URL。
 */
export interface ArtifactVersionRecord {
  id: string;
  uploadId: string;
  humanTaskId: string;
  workId: string;
  tenantId: string;
  personId: string;
  fileName: string;
  mediaType: string;
  sizeBytes: number;
  /** 同任务同文件名递增，保证同名可区分。 */
  version: number;
  digest: string;
  scanStatus: ArtifactScanStatus;
  parseError: string | null;
  previewAvailable: boolean;
  /** 仅 CLEAN 且可预览文本；失败时恒 null，禁止假正文。 */
  previewText: string | null;
  /** 契约：始终 null，禁止公开旁路。 */
  publicStorageUrl: null;
  createdAt: string;
}

/**
 * OutputRelease：候选先于获准；按受众门控人员视图。
 */
export interface OutputReleaseRecord {
  id: string;
  humanTaskId: string;
  workId: string;
  tenantId: string;
  createdByPersonId: string;
  artifactVersionId: string;
  artifactDigest: string;
  sourceVersionNote: string;
  audience: ReleaseAudience;
  state: OutputReleaseState;
  createdAt: string;
  updatedAt: string;
}

/** 人员视图：未获准时不含正文。 */
export interface OutputReleaseView {
  id: string;
  state: OutputReleaseState;
  audience: ReleaseAudience;
  artifactVersionId: string;
  fileName: string;
  version: number;
  digest: string;
  allowed: boolean;
  previewText: string | null;
  parseError: string | null;
  denyReason: string | null;
}

/** prepare 请求。 */
export interface PrepareUploadRequest {
  fileName: string;
  mediaType: string;
  sizeBytes: number;
}

/** complete 请求：客户端 digest 仅用于冲突检测，权威在服务端。 */
export interface CompleteUploadRequest {
  clientDigest?: string | null;
}

/** 创建发布请求。 */
export interface CreateOutputReleaseRequest {
  artifactVersionId: string;
  audience: ReleaseAudience;
  sourceVersionNote: string;
  /** false=候选；true=获准发布。 */
  release: boolean;
}

/** 列表响应。 */
export interface PublishListResponse<T> {
  items: T[];
  total: number;
}
