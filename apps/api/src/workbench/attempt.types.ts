/**
 * M1-04 有界执行 Attempt 最小类型。
 *
 * 对齐 47 号：C06 受理、C07 状态、C14 查证；非正式完整合同。
 * TRACE-attempt-20260912-有界执行类型
 */

import { PersonConfigMode } from "./claim.types";

/** Attempt 状态机（本切片子集）。 */
export type AttemptState =
  | "QUEUED"
  | "PREPARING"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCEL_REQUESTED"
  | "CANCELLED"
  | "RESULT_UNKNOWN";

/** 获准发布的成果摘要（非完整 Artifact）。 */
export interface PublishedOutputRef {
  id: string;
  label: string;
  digest: string;
}

/** 人工模式人员证据。 */
export interface PersonEvidenceRef {
  kind: string;
  detail: string;
  sourceVersionNote: string;
}

/**
 * 执行 Attempt：绑定快照 fence、幂等与输出边界。
 */
export interface AttemptRecord {
  id: string;
  humanTaskId: string;
  workId: string;
  tenantId: string;
  personId: string;
  snapshotId: string;
  snapshotDigest: string;
  personConfigId: string;
  mode: PersonConfigMode;
  responsibilityEpoch: number;
  /** 唯一运行栅栏，同任务 epoch 内递增。 */
  fence: number;
  /** 同任务 epoch 内 Attempt 序号（取消后新建递增）。 */
  attemptNumber: number;
  state: AttemptState;
  /** 当前阶段说明（给人看的真实状态，非受理文案）。 */
  stage: string;
  idempotencyKey: string;
  parentAttemptId: string | null;
  /** 取消后新建时的明示：新 Attempt，非续跑。 */
  newAttemptNotice: string | null;
  publishedOutputs: PublishedOutputRef[];
  personEvidence: PersonEvidenceRef[];
  /** MANUAL 恒 false；ASSISTED/AUTONOMOUS 推进后可为 true。 */
  modelInvoked: boolean;
  /** 本切片 SDK 不支持暂停/恢复。 */
  pauseResumeSupported: false;
  unknownReason: string | null;
  reconcileNote: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 列表响应。 */
export interface AttemptListResponse {
  items: AttemptRecord[];
  total: number;
}

/** C06 启动请求。 */
export interface StartAttemptRequest {
  idempotencyKey: string;
  /** 可选；默认取最新 READY 快照。 */
  snapshotId?: string | null;
  /**
   * 取消后再次启动必须显式确认：新 Attempt，可能仍有未确认副作用。
   */
  acknowledgeNewAttempt?: boolean;
}

/** 取消请求。 */
export interface CancelAttemptRequest {
  reason: string;
}

/** C14 查证请求。 */
export interface ReconcileAttemptRequest {
  outcome: "SUCCEEDED" | "FAILED";
  evidence: string;
}
