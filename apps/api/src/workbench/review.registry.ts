/**
 * M1-06 C10 独立审核登记表。
 *
 * 自批拒绝；候选变更使请求 OBSOLETE；退回抬升责任 epoch。
 * TRACE-review-20260912-C10审核
 */
import { Injectable, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { ClaimRegistry } from "./claim.registry";
import { ClaimableHumanTaskRecord } from "./claim.types";
import { PublishRegistry } from "./publish.registry";
import {
  assertTaskCas,
  normalizeDecideReview,
  normalizeRequestReview,
} from "./review.rules";
import {
  loadReviewReceipts,
  loadReviewRequests,
  resolveReviewStorePaths,
  ReviewStorePaths,
  saveReviewReceipts,
  saveReviewRequests,
} from "./review.store";
import { obsoleteReceiptsForRequest } from "./review.support";
import {
  DecideReviewBody,
  RequestReviewBody,
  ReviewListResponse,
  ReviewReceiptRecord,
  ReviewRequestRecord,
} from "./review.types";
import { SnapshotRegistry } from "./snapshot.registry";
import { WorkbenchSession } from "./workbench.types";

@Injectable()
export class ReviewRegistry implements OnModuleInit {
  private readonly requests = new Map<string, ReviewRequestRecord>();
  private readonly receipts = new Map<string, ReviewReceiptRecord>();
  private paths: ReviewStorePaths = resolveReviewStorePaths();

  constructor(
    private readonly claims: ClaimRegistry,
    private readonly publish: PublishRegistry,
    private readonly snapshots: SnapshotRegistry,
  ) {}

  onModuleInit(): void {
    this.reloadFromDisk();
  }

  /** 测试辅助：切换数据目录。 */
  useDataDirForTest(dataDir: string): void {
    this.paths = resolveReviewStorePaths(dataDir);
    this.requests.clear();
    this.receipts.clear();
  }

  /** 从磁盘装载。 */
  reloadFromDisk(): void {
    this.requests.clear();
    this.receipts.clear();
    for (const item of loadReviewRequests(this.paths.requests)) {
      this.requests.set(item.id, item);
    }
    for (const item of loadReviewReceipts(this.paths.receipts)) {
      this.receipts.set(item.id, item);
    }
  }

  /**
   * C10 requestReview：承担人送审；禁止自批。
   */
  requestReview(
    session: WorkbenchSession,
    taskId: string,
    request: RequestReviewBody,
  ): ReviewRequestRecord {
    const task = this.requireAssignee(session, taskId);
    const body = normalizeRequestReview(request);
    assertTaskCas(task, body.expectedRevision, body.responsibilityEpoch);
    if (body.reviewerMemberId === session.personId) {
      throw new Error("self-approval denied: reviewer cannot be requester");
    }
    if (
      body.reviewerMemberId === "service" ||
      body.reviewerMemberId.startsWith("svc_")
    ) {
      throw new Error("service account proxy approval denied");
    }
    const release = this.publish.getRelease(session, body.candidateReleaseId);
    if (!release || release.humanTaskId !== task.id) {
      throw new Error("candidate release not found for task");
    }
    if (release.state !== "RELEASED" && release.state !== "CANDIDATE") {
      throw new Error("candidate release blocked");
    }
    const baseline = this.snapshots.getBaselineById(session, body.baselineId);
    if (!baseline || baseline.humanTaskId !== task.id) {
      throw new Error("baseline not found for task");
    }
    if (baseline.responsibilityEpoch !== task.responsibilityEpoch) {
      throw new Error("baseline epoch mismatch");
    }
    const now = new Date().toISOString();
    const record: ReviewRequestRecord = {
      id: randomUUID(),
      humanTaskId: task.id,
      workId: task.workId,
      tenantId: task.tenantId,
      requestedByPersonId: session.personId,
      reviewerMemberId: body.reviewerMemberId,
      responsibilityEpoch: task.responsibilityEpoch,
      workRevision: task.revision,
      candidateReleaseId: release.id,
      candidateDigest: release.artifactDigest,
      baselineId: baseline.id,
      baselineDigest: baseline.digest,
      state: "PENDING",
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.requests.set(record.id, record);
    saveReviewRequests(this.paths.requests, [...this.requests.values()]);
    return record;
  }

  /**
   * C10 decideReview：独立审核人决定；候选变更 → conflict/OBSOLETE。
   */
  decideReview(
    session: WorkbenchSession,
    reviewId: string,
    request: DecideReviewBody,
  ): ReviewReceiptRecord {
    const review = this.requests.get(reviewId);
    if (!review || review.tenantId !== session.tenantId) {
      throw new Error(`review request not found: ${reviewId}`);
    }
    if (review.state !== "PENDING") {
      throw new Error(`review not pending: ${review.state}`);
    }
    if (session.personId !== review.reviewerMemberId) {
      throw new Error("only designated independent reviewer may decide");
    }
    if (session.personId === review.requestedByPersonId) {
      throw new Error("self-approval denied");
    }
    const body = normalizeDecideReview(request);
    if (body.expectedRevision !== review.revision) {
      throw new Error(
        `revision mismatch: expected ${review.revision}, got ${body.expectedRevision}`,
      );
    }
    const live = this.publish.getRelease(session, review.candidateReleaseId);
    if (!live || live.artifactDigest !== review.candidateDigest) {
      this.requests.set(review.id, { ...review, state: "OBSOLETE" });
      saveReviewRequests(this.paths.requests, [...this.requests.values()]);
      throw new Error("conflict: candidate changed; receipt OBSOLETE");
    }
    if (body.candidateDigest !== review.candidateDigest) {
      throw new Error("candidateDigest mismatch with review request");
    }
    const now = new Date().toISOString();
    const receipt: ReviewReceiptRecord = {
      id: randomUUID(),
      reviewRequestId: review.id,
      humanTaskId: review.humanTaskId,
      workId: review.workId,
      tenantId: review.tenantId,
      decidedByPersonId: session.personId,
      decision: body.decision,
      reason: body.reason,
      candidateDigest: review.candidateDigest,
      responsibilityEpoch: review.responsibilityEpoch,
      baselineId: review.baselineId,
      baselineDigest: review.baselineDigest,
      state: "ACTIVE",
      createdAt: now,
    };
    if (body.decision === "RETURN") {
      for (const item of obsoleteReceiptsForRequest(review, [
        ...this.receipts.values(),
      ])) {
        this.receipts.set(item.id, item);
      }
      this.claims.applyReviewReturnEpoch(review.humanTaskId, review.tenantId);
    }
    this.receipts.set(receipt.id, receipt);
    this.requests.set(review.id, {
      ...review,
      state: "DECIDED",
      updatedAt: now,
    });
    saveReviewReceipts(this.paths.receipts, [...this.receipts.values()]);
    saveReviewRequests(this.paths.requests, [...this.requests.values()]);
    return receipt;
  }

  /** 列出任务审核请求。 */
  listReviews(
    session: WorkbenchSession,
    taskId: string,
  ): ReviewListResponse<ReviewRequestRecord> {
    this.requireTask(session, taskId);
    const items = [...this.requests.values()]
      .filter((item) => item.humanTaskId === taskId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { items, total: items.length };
  }

  /** 列出任务回执。 */
  listReceipts(
    session: WorkbenchSession,
    taskId: string,
  ): ReviewListResponse<ReviewReceiptRecord> {
    this.requireTask(session, taskId);
    const items = [...this.receipts.values()]
      .filter((item) => item.humanTaskId === taskId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { items, total: items.length };
  }

  /**
   * 读取回执（供 C11 守卫）。
   *
   * Args:
   *   receiptId: 回执 id。
   *
   * Returns:
   *   回执或 null。
   */
  getReceipt(receiptId: string): ReviewReceiptRecord | null {
    return this.receipts.get(receiptId) ?? null;
  }

  private requireAssignee(
    session: WorkbenchSession,
    taskId: string,
  ): ClaimableHumanTaskRecord {
    const task = this.requireTask(session, taskId);
    if (task.state !== "CLAIMED" || task.assigneePersonId !== session.personId) {
      throw new Error("only CLAIMED assignee may perform this action");
    }
    return task;
  }

  private requireTask(
    session: WorkbenchSession,
    taskId: string,
  ): ClaimableHumanTaskRecord {
    const task = this.claims.getTaskForSession(session, taskId);
    if (!task) {
      throw new Error(`claimable task not found: ${taskId}`);
    }
    return task;
  }
}
