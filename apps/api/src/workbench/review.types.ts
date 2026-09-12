/**
 * M1-06 独立审核与交付最小类型（C10/C11）。
 *
 * 对齐 47 号：独立审核回执绑定候选摘要/基线/轮次；C11 预检有期限；
 * 唯一交付 tenant+work+epoch；无 OA 确认不显示已交付。
 * TRACE-review-20260912-审核交付类型
 */

/** 审核请求状态。 */
export type ReviewRequestState = "PENDING" | "DECIDED" | "OBSOLETE";

/** 审核决定。 */
export type ReviewDecision = "APPROVE" | "REJECT" | "RETURN";

/** 回执生命周期。 */
export type ReviewReceiptState = "ACTIVE" | "OBSOLETE";

/** 预检凭据状态。 */
export type CompletionCheckState = "VALID" | "EXPIRED" | "CONSUMED";

/** 交付同步态（无 OA 确认前不得显示已交付）。 */
export type DeliveryOaSyncState = "PENDING_COMMIT" | "COMMITTED";

/**
 * C10 审核请求：绑定候选 digest、基线与责任轮次。
 */
export interface ReviewRequestRecord {
  id: string;
  humanTaskId: string;
  workId: string;
  tenantId: string;
  requestedByPersonId: string;
  reviewerMemberId: string;
  responsibilityEpoch: number;
  workRevision: number;
  candidateReleaseId: string;
  candidateDigest: string;
  baselineId: string;
  baselineDigest: string;
  state: ReviewRequestState;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * C10 审核回执：决定绑定同一候选摘要；不可挪用旧批准。
 */
export interface ReviewReceiptRecord {
  id: string;
  reviewRequestId: string;
  humanTaskId: string;
  workId: string;
  tenantId: string;
  decidedByPersonId: string;
  decision: ReviewDecision;
  reason: string;
  candidateDigest: string;
  responsibilityEpoch: number;
  baselineId: string;
  baselineDigest: string;
  state: ReviewReceiptState;
  createdAt: string;
}

/**
 * C11 完成预检：仅提供有期限检查凭据。
 */
export interface CompletionCheckRecord {
  id: string;
  humanTaskId: string;
  workId: string;
  tenantId: string;
  createdByPersonId: string;
  responsibilityEpoch: number;
  workRevision: number;
  artifactVersionIds: string[];
  artifactSetDigest: string;
  baselineId: string;
  baselineDigest: string;
  approvalReceiptIds: string[];
  expiresAt: string;
  state: CompletionCheckState;
  createdAt: string;
}

/**
 * C11 正式交付：唯一约束 tenant+work+responsibilityEpoch。
 */
export interface DeliveryCommitRecord {
  id: string;
  humanTaskId: string;
  workId: string;
  tenantId: string;
  responsibilityEpoch: number;
  workRevision: number;
  completionCheckId: string;
  artifactVersionIds: string[];
  artifactSetDigest: string;
  baselineId: string;
  baselineDigest: string;
  approvalReceiptIds: string[];
  provenanceNote: string;
  confirmedByPersonId: string;
  oaSyncState: DeliveryOaSyncState;
  committedAt: string | null;
  digest: string;
  createdAt: string;
  updatedAt: string;
}

/** 人员可见交付视图：PENDING 不标已交付。 */
export interface DeliveryView {
  id: string;
  workId: string;
  responsibilityEpoch: number;
  oaSyncState: DeliveryOaSyncState;
  delivered: boolean;
  digest: string;
  committedAt: string | null;
}

/** 送审请求。 */
export interface RequestReviewBody {
  candidateReleaseId: string;
  baselineId: string;
  reviewerMemberId: string;
  expectedRevision: number;
  responsibilityEpoch: number;
}

/** 决定请求。 */
export interface DecideReviewBody {
  decision: ReviewDecision;
  reason: string;
  candidateDigest: string;
  expectedRevision: number;
}

/** 预检请求。 */
export interface CheckCompletionBody {
  artifactVersionIds: string[];
  baselineId: string;
  approvalReceiptIds: string[];
  expectedRevision: number;
  responsibilityEpoch: number;
}

/** 提交交付请求。 */
export interface SubmitDeliveryBody {
  completionCheckId: string;
  artifactVersionIds: string[];
  baselineId: string;
  approvalReceiptIds: string[];
  provenanceNote: string;
  expectedRevision: number;
  responsibilityEpoch: number;
}

/** 列表响应。 */
export interface ReviewListResponse<T> {
  items: T[];
  total: number;
}
