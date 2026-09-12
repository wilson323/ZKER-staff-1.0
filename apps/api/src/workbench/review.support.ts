/**
 * M1-06 审核/交付辅助：摘要、视图与 TTL。
 *
 * TRACE-review-20260912-辅助
 */
import { createHash } from "node:crypto";
import {
  CompletionCheckRecord,
  DeliveryCommitRecord,
  DeliveryView,
  ReviewReceiptRecord,
  ReviewRequestRecord,
} from "./review.types";

/**
 * 计算产物集合摘要（排序后拼接）。
 *
 * Args:
 *   digests: 各产物 digest 列表。
 *
 * Returns:
 *   sha256:hex
 */
export function artifactSetDigest(digests: string[]): string {
  const joined = [...digests]
    .sort((left, right) => left.localeCompare(right))
    .join("|");
  return `sha256:${createHash("sha256").update(joined, "utf8").digest("hex")}`;
}

/**
 * 计算交付记录摘要。
 *
 * Args:
 *   payload: 关键字段拼接源。
 *
 * Returns:
 *   sha256:hex
 */
export function deliveryDigest(payload: string): string {
  return `sha256:${createHash("sha256").update(payload, "utf8").digest("hex")}`;
}

/**
 * 人员交付视图：仅 COMMITTED 视为已交付。
 *
 * Args:
 *   record: 交付记录。
 *
 * Returns:
 *   DeliveryView
 */
export function buildDeliveryView(record: DeliveryCommitRecord): DeliveryView {
  return {
    id: record.id,
    workId: record.workId,
    responsibilityEpoch: record.responsibilityEpoch,
    oaSyncState: record.oaSyncState,
    delivered: record.oaSyncState === "COMMITTED",
    digest: record.digest,
    committedAt: record.committedAt,
  };
}

/**
 * 预检是否仍有效（未消费且未过期）。
 *
 * Args:
 *   check: 预检记录。
 *   nowMs: 当前毫秒时间。
 *
 * Returns:
 *   是否可用。
 */
export function isCompletionCheckUsable(
  check: CompletionCheckRecord,
  nowMs: number,
): boolean {
  if (check.state !== "VALID") {
    return false;
  }
  return Date.parse(check.expiresAt) > nowMs;
}

/**
 * 比较两组 id 集合是否一致（顺序无关）。
 *
 * Args:
 *   left: 左侧。
 *   right: 右侧。
 *
 * Returns:
 *   是否相等。
 */
export function sameIdSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const a = [...left].sort((x, y) => x.localeCompare(y));
  const b = [...right].sort((x, y) => x.localeCompare(y));
  return a.every((value, index) => value === b[index]);
}

/**
 * 标记请求与同候选旧回执过时。
 *
 * Args:
 *   request: 审核请求。
 *   receipts: 全部回执。
 *
 * Returns:
 *   需写回的过时回执列表。
 */
export function obsoleteReceiptsForRequest(
  request: ReviewRequestRecord,
  receipts: ReviewReceiptRecord[],
): ReviewReceiptRecord[] {
  return receipts
    .filter(
      (item) =>
        item.reviewRequestId === request.id && item.state === "ACTIVE",
    )
    .map((item) => ({ ...item, state: "OBSOLETE" as const }));
}
