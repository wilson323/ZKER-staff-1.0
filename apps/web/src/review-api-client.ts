/**
 * M1-06 独立审核与交付 API 客户端（复用会话 HTTP，禁 mock）。
 */
import {
  fetchWithSession,
  writeWithSession,
  type ListResponse,
  type WorkbenchSession,
} from "./workbench-api-client";

/** 审核请求。 */
export interface ReviewRequestRecord {
  id: string;
  humanTaskId: string;
  workId: string;
  reviewerMemberId: string;
  responsibilityEpoch: number;
  workRevision: number;
  candidateReleaseId: string;
  candidateDigest: string;
  baselineId: string;
  baselineDigest: string;
  state: "PENDING" | "DECIDED" | "OBSOLETE";
  revision: number;
  createdAt: string;
}

/** 审核回执。 */
export interface ReviewReceiptRecord {
  id: string;
  reviewRequestId: string;
  decidedByPersonId: string;
  decision: "APPROVE" | "REJECT" | "RETURN";
  reason: string;
  candidateDigest: string;
  state: "ACTIVE" | "OBSOLETE";
  createdAt: string;
}

/** 完成预检。 */
export interface CompletionCheckRecord {
  id: string;
  expiresAt: string;
  state: "VALID" | "EXPIRED" | "CONSUMED";
  artifactSetDigest: string;
  createdAt: string;
}

/** 交付提交。 */
export interface DeliveryCommitRecord {
  id: string;
  oaSyncState: "PENDING_COMMIT" | "COMMITTED";
  digest: string;
  committedAt: string | null;
  createdAt: string;
}

/** 交付视图。 */
export interface DeliveryView {
  id: string;
  workId: string;
  responsibilityEpoch: number;
  oaSyncState: "PENDING_COMMIT" | "COMMITTED";
  delivered: boolean;
  digest: string;
  committedAt: string | null;
}

/**
 * C10 送审。
 */
export function requestReview(
  session: WorkbenchSession,
  taskId: string,
  body: {
    candidateReleaseId: string;
    baselineId: string;
    reviewerMemberId: string;
    expectedRevision: number;
    responsibilityEpoch: number;
  },
): Promise<ReviewRequestRecord> {
  return writeWithSession(
    `/workbench/claimable-tasks/${taskId}/reviews`,
    "POST",
    session,
    body,
    "request review",
  );
}

/**
 * 列出审核请求。
 */
export function fetchReviews(
  session: WorkbenchSession,
  taskId: string,
): Promise<ListResponse<ReviewRequestRecord>> {
  return fetchWithSession(
    `/workbench/claimable-tasks/${taskId}/reviews`,
    session,
    "list reviews",
  );
}

/**
 * 列出回执。
 */
export function fetchReviewReceipts(
  session: WorkbenchSession,
  taskId: string,
): Promise<ListResponse<ReviewReceiptRecord>> {
  return fetchWithSession(
    `/workbench/claimable-tasks/${taskId}/review-receipts`,
    session,
    "list review receipts",
  );
}

/**
 * C10 决定。
 */
export function decideReview(
  session: WorkbenchSession,
  reviewId: string,
  body: {
    decision: "APPROVE" | "REJECT" | "RETURN";
    reason: string;
    candidateDigest: string;
    expectedRevision: number;
  },
): Promise<ReviewReceiptRecord> {
  return writeWithSession(
    `/workbench/reviews/${reviewId}/decide`,
    "POST",
    session,
    body,
    "decide review",
  );
}

/**
 * C11 预检。
 */
export function checkCompletion(
  session: WorkbenchSession,
  taskId: string,
  body: {
    artifactVersionIds: string[];
    baselineId: string;
    approvalReceiptIds: string[];
    expectedRevision: number;
    responsibilityEpoch: number;
  },
): Promise<CompletionCheckRecord> {
  return writeWithSession(
    `/workbench/claimable-tasks/${taskId}/completion-checks`,
    "POST",
    session,
    body,
    "check completion",
  );
}

/**
 * C11 提交交付。
 */
export function submitDelivery(
  session: WorkbenchSession,
  taskId: string,
  body: {
    completionCheckId: string;
    artifactVersionIds: string[];
    baselineId: string;
    approvalReceiptIds: string[];
    provenanceNote: string;
    expectedRevision: number;
    responsibilityEpoch: number;
  },
): Promise<DeliveryCommitRecord> {
  return writeWithSession(
    `/workbench/claimable-tasks/${taskId}/deliveries`,
    "POST",
    session,
    body,
    "submit delivery",
  );
}

/**
 * OA 确认。
 */
export function confirmOaDelivery(
  session: WorkbenchSession,
  deliveryId: string,
): Promise<DeliveryCommitRecord> {
  return writeWithSession(
    `/workbench/deliveries/${deliveryId}/confirm-oa`,
    "POST",
    session,
    {},
    "confirm oa delivery",
  );
}

/**
 * 交付视图。
 */
export function fetchDeliveryView(
  session: WorkbenchSession,
  deliveryId: string,
): Promise<DeliveryView> {
  return fetchWithSession(
    `/workbench/deliveries/${deliveryId}/view`,
    session,
    "delivery view",
  );
}
