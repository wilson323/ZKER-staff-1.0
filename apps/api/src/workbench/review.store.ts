/**
 * M1-06 审核/交付 JSON 落盘；复用 common/json-array-store。
 *
 * TRACE-review-20260912-落盘
 */
import { join } from "node:path";
import {
  asObject,
  loadJsonArray,
  requireNonEmptyString,
  requireNonNegativeInt,
  requirePositiveInt,
  saveJsonArray,
} from "../common/json-array-store";
import { resolveDataDir } from "../digital-employees/digital-employee.store";
import {
  CompletionCheckRecord,
  CompletionCheckState,
  DeliveryCommitRecord,
  DeliveryOaSyncState,
  ReviewDecision,
  ReviewReceiptRecord,
  ReviewReceiptState,
  ReviewRequestRecord,
  ReviewRequestState,
} from "./review.types";

const REQUESTS = "review-requests.json";
const RECEIPTS = "review-receipts.json";
const CHECKS = "completion-checks.json";
const DELIVERIES = "delivery-commits.json";

/** 存储路径集合。 */
export interface ReviewStorePaths {
  requests: string;
  receipts: string;
  checks: string;
  deliveries: string;
}

/**
 * 解析审核交付存储路径。
 *
 * Args:
 *   dataDir: 可选根目录。
 *
 * Returns:
 *   ReviewStorePaths
 */
export function resolveReviewStorePaths(dataDir?: string): ReviewStorePaths {
  const root = dataDir ?? resolveDataDir();
  return {
    requests: join(root, REQUESTS),
    receipts: join(root, RECEIPTS),
    checks: join(root, CHECKS),
    deliveries: join(root, DELIVERIES),
  };
}

/** 装载审核请求。 */
export function loadReviewRequests(path: string): ReviewRequestRecord[] {
  return loadJsonArray(path, "review-requests").map(assertRequest);
}

/** 保存审核请求。 */
export function saveReviewRequests(
  path: string,
  records: ReviewRequestRecord[],
): void {
  saveJsonArray(path, records);
}

/** 装载回执。 */
export function loadReviewReceipts(path: string): ReviewReceiptRecord[] {
  return loadJsonArray(path, "review-receipts").map(assertReceipt);
}

/** 保存回执。 */
export function saveReviewReceipts(
  path: string,
  records: ReviewReceiptRecord[],
): void {
  saveJsonArray(path, records);
}

/** 装载预检。 */
export function loadCompletionChecks(path: string): CompletionCheckRecord[] {
  return loadJsonArray(path, "completion-checks").map(assertCheck);
}

/** 保存预检。 */
export function saveCompletionChecks(
  path: string,
  records: CompletionCheckRecord[],
): void {
  saveJsonArray(path, records);
}

/** 装载交付。 */
export function loadDeliveries(path: string): DeliveryCommitRecord[] {
  return loadJsonArray(path, "delivery-commits").map(assertDelivery);
}

/** 保存交付。 */
export function saveDeliveries(
  path: string,
  records: DeliveryCommitRecord[],
): void {
  saveJsonArray(path, records);
}

function assertRequest(value: unknown): ReviewRequestRecord {
  const record = asObject(value, "review request");
  return {
    id: requireNonEmptyString(record, "id"),
    humanTaskId: requireNonEmptyString(record, "humanTaskId"),
    workId: requireNonEmptyString(record, "workId"),
    tenantId: requireNonEmptyString(record, "tenantId"),
    requestedByPersonId: requireNonEmptyString(record, "requestedByPersonId"),
    reviewerMemberId: requireNonEmptyString(record, "reviewerMemberId"),
    responsibilityEpoch: requireNonNegativeInt(record, "responsibilityEpoch"),
    workRevision: requireNonNegativeInt(record, "workRevision"),
    candidateReleaseId: requireNonEmptyString(record, "candidateReleaseId"),
    candidateDigest: requireNonEmptyString(record, "candidateDigest"),
    baselineId: requireNonEmptyString(record, "baselineId"),
    baselineDigest: requireNonEmptyString(record, "baselineDigest"),
    state: requireEnum(record, "state", ["PENDING", "DECIDED", "OBSOLETE"]),
    revision: requirePositiveInt(record, "revision"),
    createdAt: requireNonEmptyString(record, "createdAt"),
    updatedAt: requireNonEmptyString(record, "updatedAt"),
  };
}

function assertReceipt(value: unknown): ReviewReceiptRecord {
  const record = asObject(value, "review receipt");
  return {
    id: requireNonEmptyString(record, "id"),
    reviewRequestId: requireNonEmptyString(record, "reviewRequestId"),
    humanTaskId: requireNonEmptyString(record, "humanTaskId"),
    workId: requireNonEmptyString(record, "workId"),
    tenantId: requireNonEmptyString(record, "tenantId"),
    decidedByPersonId: requireNonEmptyString(record, "decidedByPersonId"),
    decision: requireEnum(record, "decision", [
      "APPROVE",
      "REJECT",
      "RETURN",
    ]) as ReviewDecision,
    reason: requireNonEmptyString(record, "reason"),
    candidateDigest: requireNonEmptyString(record, "candidateDigest"),
    responsibilityEpoch: requireNonNegativeInt(record, "responsibilityEpoch"),
    baselineId: requireNonEmptyString(record, "baselineId"),
    baselineDigest: requireNonEmptyString(record, "baselineDigest"),
    state: requireEnum(record, "state", ["ACTIVE", "OBSOLETE"]),
    createdAt: requireNonEmptyString(record, "createdAt"),
  };
}

function assertCheck(value: unknown): CompletionCheckRecord {
  const record = asObject(value, "completion check");
  return {
    id: requireNonEmptyString(record, "id"),
    humanTaskId: requireNonEmptyString(record, "humanTaskId"),
    workId: requireNonEmptyString(record, "workId"),
    tenantId: requireNonEmptyString(record, "tenantId"),
    createdByPersonId: requireNonEmptyString(record, "createdByPersonId"),
    responsibilityEpoch: requireNonNegativeInt(record, "responsibilityEpoch"),
    workRevision: requireNonNegativeInt(record, "workRevision"),
    artifactVersionIds: requireStringArray(record, "artifactVersionIds"),
    artifactSetDigest: requireNonEmptyString(record, "artifactSetDigest"),
    baselineId: requireNonEmptyString(record, "baselineId"),
    baselineDigest: requireNonEmptyString(record, "baselineDigest"),
    approvalReceiptIds: requireStringArray(record, "approvalReceiptIds"),
    expiresAt: requireNonEmptyString(record, "expiresAt"),
    state: requireEnum(record, "state", [
      "VALID",
      "EXPIRED",
      "CONSUMED",
    ]) as CompletionCheckState,
    createdAt: requireNonEmptyString(record, "createdAt"),
  };
}

function assertDelivery(value: unknown): DeliveryCommitRecord {
  const record = asObject(value, "delivery commit");
  return {
    id: requireNonEmptyString(record, "id"),
    humanTaskId: requireNonEmptyString(record, "humanTaskId"),
    workId: requireNonEmptyString(record, "workId"),
    tenantId: requireNonEmptyString(record, "tenantId"),
    responsibilityEpoch: requireNonNegativeInt(record, "responsibilityEpoch"),
    workRevision: requireNonNegativeInt(record, "workRevision"),
    completionCheckId: requireNonEmptyString(record, "completionCheckId"),
    artifactVersionIds: requireStringArray(record, "artifactVersionIds"),
    artifactSetDigest: requireNonEmptyString(record, "artifactSetDigest"),
    baselineId: requireNonEmptyString(record, "baselineId"),
    baselineDigest: requireNonEmptyString(record, "baselineDigest"),
    approvalReceiptIds: requireStringArray(record, "approvalReceiptIds"),
    provenanceNote: requireNonEmptyString(record, "provenanceNote"),
    confirmedByPersonId: requireNonEmptyString(record, "confirmedByPersonId"),
    oaSyncState: requireEnum(record, "oaSyncState", [
      "PENDING_COMMIT",
      "COMMITTED",
    ]) as DeliveryOaSyncState,
    committedAt:
      record.committedAt === null
        ? null
        : requireNonEmptyString(record, "committedAt"),
    digest: requireNonEmptyString(record, "digest"),
    createdAt: requireNonEmptyString(record, "createdAt"),
    updatedAt: requireNonEmptyString(record, "updatedAt"),
  };
}

function requireEnum<T extends string>(
  record: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
): T {
  const value = requireNonEmptyString(record, key);
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`invalid ${key}: ${value}`);
  }
  return value as T;
}

function requireStringArray(
  record: Record<string, unknown>,
  key: string,
): string[] {
  const raw = record[key];
  if (!Array.isArray(raw)) {
    throw new TypeError(`invalid ${key}: expected string array`);
  }
  return raw.map((item, index) => {
    if (typeof item !== "string" || item.trim() === "") {
      throw new Error(`invalid ${key}[${index}]`);
    }
    return item.trim();
  });
}
