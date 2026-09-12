/**
 * M1-06 审核/交付请求规范化与守卫。
 *
 * TRACE-review-20260912-规则
 */
import { ClaimableHumanTaskRecord } from "./claim.types";
import {
  CheckCompletionBody,
  DecideReviewBody,
  RequestReviewBody,
  ReviewDecision,
  SubmitDeliveryBody,
} from "./review.types";

/** 预检默认有效期（毫秒）。 */
export const COMPLETION_CHECK_TTL_MS = 5 * 60 * 1000;

/**
 * 规范化送审请求。
 *
 * Args:
 *   request: 原始正文。
 *
 * Returns:
 *   规范化字段。
 */
export function normalizeRequestReview(
  request: RequestReviewBody,
): Required<RequestReviewBody> {
  const candidateReleaseId = (request.candidateReleaseId ?? "").trim();
  const baselineId = (request.baselineId ?? "").trim();
  const reviewerMemberId = (request.reviewerMemberId ?? "").trim();
  if (!candidateReleaseId) {
    throw new Error("candidateReleaseId is required");
  }
  if (!baselineId) {
    throw new Error("baselineId is required");
  }
  if (!reviewerMemberId) {
    throw new Error("reviewerMemberId is required");
  }
  assertCasFields(request.expectedRevision, request.responsibilityEpoch);
  return {
    candidateReleaseId,
    baselineId,
    reviewerMemberId,
    expectedRevision: request.expectedRevision,
    responsibilityEpoch: request.responsibilityEpoch,
  };
}

/**
 * 规范化审核决定。
 *
 * Args:
 *   request: 原始正文。
 *
 * Returns:
 *   规范化字段。
 */
export function normalizeDecideReview(request: DecideReviewBody): {
  decision: ReviewDecision;
  reason: string;
  candidateDigest: string;
  expectedRevision: number;
} {
  const decision = request.decision;
  if (
    decision !== "APPROVE" &&
    decision !== "REJECT" &&
    decision !== "RETURN"
  ) {
    throw new Error("decision must be APPROVE, REJECT or RETURN");
  }
  const reason = (request.reason ?? "").trim();
  if (!reason) {
    throw new Error("reason is required");
  }
  if (reason.length > 500) {
    throw new Error("reason exceeds 500 characters");
  }
  const candidateDigest = (request.candidateDigest ?? "").trim();
  if (!/^sha256:[a-f0-9]{64}$/.test(candidateDigest)) {
    throw new Error("candidateDigest must be sha256:hex");
  }
  if (!Number.isInteger(request.expectedRevision)) {
    throw new Error("expectedRevision must be an integer");
  }
  return {
    decision,
    reason,
    candidateDigest,
    expectedRevision: request.expectedRevision,
  };
}

/**
 * 规范化完成预检请求。
 *
 * Args:
 *   request: 原始正文。
 *
 * Returns:
 *   规范化字段。
 */
export function normalizeCheckCompletion(request: CheckCompletionBody): {
  artifactVersionIds: string[];
  baselineId: string;
  approvalReceiptIds: string[];
  expectedRevision: number;
  responsibilityEpoch: number;
} {
  assertCasFields(request.expectedRevision, request.responsibilityEpoch);
  const baselineId = (request.baselineId ?? "").trim();
  if (!baselineId) {
    throw new Error("baselineId is required");
  }
  const artifactVersionIds = uniqueIds(request.artifactVersionIds, "artifact");
  if (artifactVersionIds.length === 0) {
    throw new Error("artifactVersionIds must not be empty");
  }
  const approvalReceiptIds = uniqueIds(
    request.approvalReceiptIds ?? [],
    "approval",
  );
  return {
    artifactVersionIds,
    baselineId,
    approvalReceiptIds,
    expectedRevision: request.expectedRevision,
    responsibilityEpoch: request.responsibilityEpoch,
  };
}

/**
 * 规范化提交交付请求。
 *
 * Args:
 *   request: 原始正文。
 *
 * Returns:
 *   规范化字段。
 */
export function normalizeSubmitDelivery(request: SubmitDeliveryBody): {
  completionCheckId: string;
  artifactVersionIds: string[];
  baselineId: string;
  approvalReceiptIds: string[];
  provenanceNote: string;
  expectedRevision: number;
  responsibilityEpoch: number;
} {
  assertCasFields(request.expectedRevision, request.responsibilityEpoch);
  const completionCheckId = (request.completionCheckId ?? "").trim();
  if (!completionCheckId) {
    throw new Error("completionCheckId is required");
  }
  const baselineId = (request.baselineId ?? "").trim();
  if (!baselineId) {
    throw new Error("baselineId is required");
  }
  const provenanceNote = (request.provenanceNote ?? "").trim();
  if (!provenanceNote) {
    throw new Error("provenanceNote is required for MANUAL path");
  }
  return {
    completionCheckId,
    artifactVersionIds: uniqueIds(request.artifactVersionIds, "artifact"),
    baselineId,
    approvalReceiptIds: uniqueIds(
      request.approvalReceiptIds ?? [],
      "approval",
    ),
    provenanceNote,
    expectedRevision: request.expectedRevision,
    responsibilityEpoch: request.responsibilityEpoch,
  };
}

/**
 * CAS：revision + epoch。
 *
 * Args:
 *   task: 当前任务。
 *   expectedRevision: 客户端期望 revision。
 *   responsibilityEpoch: 客户端期望 epoch。
 */
export function assertTaskCas(
  task: ClaimableHumanTaskRecord,
  expectedRevision: number,
  responsibilityEpoch: number,
): void {
  if (
    !Number.isInteger(expectedRevision) ||
    expectedRevision !== task.revision
  ) {
    throw new Error(
      `revision mismatch: expected ${task.revision}, got ${expectedRevision}`,
    );
  }
  if (
    !Number.isInteger(responsibilityEpoch) ||
    responsibilityEpoch !== task.responsibilityEpoch
  ) {
    throw new Error(
      `epoch mismatch: expected ${task.responsibilityEpoch}, got ${responsibilityEpoch}`,
    );
  }
}

function assertCasFields(
  expectedRevision: number,
  responsibilityEpoch: number,
): void {
  if (!Number.isInteger(expectedRevision)) {
    throw new Error("expectedRevision must be an integer");
  }
  if (!Number.isInteger(responsibilityEpoch)) {
    throw new Error("responsibilityEpoch must be an integer");
  }
}

function uniqueIds(values: string[] | undefined, label: string): string[] {
  if (!Array.isArray(values)) {
    throw new TypeError(`${label} ids must be an array`);
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    if (typeof raw !== "string" || raw.trim() === "") {
      throw new Error(`invalid ${label} id`);
    }
    const id = raw.trim();
    if (seen.has(id)) {
      throw new Error(`duplicate ${label} id: ${id}`);
    }
    seen.add(id);
    out.push(id);
  }
  return out;
}
