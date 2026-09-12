/**
 * M1-06 C11 完成预检与唯一交付登记表。
 *
 * 预检有期限；提交再校验；tenant+work+epoch 唯一；无 OA 确认不交付。
 * TRACE-review-20260912-C11交付
 */
import { Injectable, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { ClaimRegistry } from "./claim.registry";
import { ClaimableHumanTaskRecord } from "./claim.types";
import { PublishRegistry } from "./publish.registry";
import { ReviewRegistry } from "./review.registry";
import {
  assertTaskCas,
  COMPLETION_CHECK_TTL_MS,
  normalizeCheckCompletion,
  normalizeSubmitDelivery,
} from "./review.rules";
import {
  loadCompletionChecks,
  loadDeliveries,
  resolveReviewStorePaths,
  ReviewStorePaths,
  saveCompletionChecks,
  saveDeliveries,
} from "./review.store";
import {
  artifactSetDigest,
  buildDeliveryView,
  deliveryDigest,
  isCompletionCheckUsable,
  sameIdSet,
} from "./review.support";
import {
  CheckCompletionBody,
  CompletionCheckRecord,
  DeliveryCommitRecord,
  DeliveryView,
  ReviewListResponse,
  SubmitDeliveryBody,
} from "./review.types";
import { SnapshotRegistry } from "./snapshot.registry";
import { FactBaselineRecord } from "./snapshot.types";
import { WorkbenchSession } from "./workbench.types";

@Injectable()
export class DeliveryRegistry implements OnModuleInit {
  private readonly checks = new Map<string, CompletionCheckRecord>();
  private readonly deliveries = new Map<string, DeliveryCommitRecord>();
  private paths: ReviewStorePaths = resolveReviewStorePaths();

  constructor(
    private readonly claims: ClaimRegistry,
    private readonly publish: PublishRegistry,
    private readonly snapshots: SnapshotRegistry,
    private readonly reviews: ReviewRegistry,
  ) {}

  onModuleInit(): void {
    this.reloadFromDisk();
  }

  /** 测试辅助：切换数据目录。 */
  useDataDirForTest(dataDir: string): void {
    this.paths = resolveReviewStorePaths(dataDir);
    this.checks.clear();
    this.deliveries.clear();
  }

  /** 从磁盘装载。 */
  reloadFromDisk(): void {
    this.checks.clear();
    this.deliveries.clear();
    for (const item of loadCompletionChecks(this.paths.checks)) {
      this.checks.set(item.id, item);
    }
    for (const item of loadDeliveries(this.paths.deliveries)) {
      this.deliveries.set(item.id, item);
    }
  }

  /**
   * C11 checkCompletion：签发有期限预检凭据。
   */
  checkCompletion(
    session: WorkbenchSession,
    taskId: string,
    request: CheckCompletionBody,
  ): CompletionCheckRecord {
    const task = this.requireAssignee(session, taskId);
    const body = normalizeCheckCompletion(request);
    assertTaskCas(task, body.expectedRevision, body.responsibilityEpoch);
    const baseline = this.requireBaseline(session, task, body.baselineId);
    const digests = this.requireArtifactDigests(
      session,
      task,
      body.artifactVersionIds,
    );
    this.requireActiveApprovals(
      task,
      body.approvalReceiptIds,
      digests,
      baseline,
    );
    const nowMs = Date.now();
    const record: CompletionCheckRecord = {
      id: randomUUID(),
      humanTaskId: task.id,
      workId: task.workId,
      tenantId: task.tenantId,
      createdByPersonId: session.personId,
      responsibilityEpoch: task.responsibilityEpoch,
      workRevision: task.revision,
      artifactVersionIds: body.artifactVersionIds,
      artifactSetDigest: artifactSetDigest(digests),
      baselineId: baseline.id,
      baselineDigest: baseline.digest,
      approvalReceiptIds: body.approvalReceiptIds,
      expiresAt: new Date(nowMs + COMPLETION_CHECK_TTL_MS).toISOString(),
      state: "VALID",
      createdAt: new Date(nowMs).toISOString(),
    };
    this.checks.set(record.id, record);
    saveCompletionChecks(this.paths.checks, [...this.checks.values()]);
    return record;
  }

  /**
   * C11 submitDelivery：再次校验；唯一约束；先 PENDING_COMMIT。
   */
  submitDelivery(
    session: WorkbenchSession,
    taskId: string,
    request: SubmitDeliveryBody,
  ): DeliveryCommitRecord {
    const task = this.requireAssignee(session, taskId);
    const body = normalizeSubmitDelivery(request);
    assertTaskCas(task, body.expectedRevision, body.responsibilityEpoch);
    const uniqueKey = `${task.tenantId}|${task.workId}|${task.responsibilityEpoch}`;
    for (const item of this.deliveries.values()) {
      if (
        `${item.tenantId}|${item.workId}|${item.responsibilityEpoch}` ===
        uniqueKey
      ) {
        throw new Error(
          "conflict: delivery already exists for tenant+work+epoch",
        );
      }
    }
    const check = this.checks.get(body.completionCheckId);
    if (!check || check.humanTaskId !== task.id) {
      throw new Error("completion check not found");
    }
    const nowMs = Date.now();
    if (!isCompletionCheckUsable(check, nowMs)) {
      if (check.state === "VALID") {
        this.checks.set(check.id, { ...check, state: "EXPIRED" });
        saveCompletionChecks(this.paths.checks, [...this.checks.values()]);
      }
      throw new Error("conflict: completion check expired or consumed");
    }
    if (
      check.responsibilityEpoch !== task.responsibilityEpoch ||
      check.workRevision !== task.revision
    ) {
      throw new Error("completion check epoch/revision stale");
    }
    if (
      !sameIdSet(check.artifactVersionIds, body.artifactVersionIds) ||
      !sameIdSet(check.approvalReceiptIds, body.approvalReceiptIds) ||
      check.baselineId !== body.baselineId
    ) {
      throw new Error("submit payload mismatch with completion check");
    }
    const baseline = this.requireBaseline(session, task, body.baselineId);
    if (baseline.digest !== check.baselineDigest) {
      throw new Error("baseline digest changed since preflight");
    }
    const digests = this.requireArtifactDigests(
      session,
      task,
      body.artifactVersionIds,
    );
    const setDigest = artifactSetDigest(digests);
    if (setDigest !== check.artifactSetDigest) {
      throw new Error("artifact set digest changed since preflight");
    }
    this.requireActiveApprovals(
      task,
      body.approvalReceiptIds,
      digests,
      baseline,
    );
    const now = new Date(nowMs).toISOString();
    const record: DeliveryCommitRecord = {
      id: randomUUID(),
      humanTaskId: task.id,
      workId: task.workId,
      tenantId: task.tenantId,
      responsibilityEpoch: task.responsibilityEpoch,
      workRevision: task.revision,
      completionCheckId: check.id,
      artifactVersionIds: body.artifactVersionIds,
      artifactSetDigest: setDigest,
      baselineId: baseline.id,
      baselineDigest: baseline.digest,
      approvalReceiptIds: body.approvalReceiptIds,
      provenanceNote: body.provenanceNote,
      confirmedByPersonId: session.personId,
      oaSyncState: "PENDING_COMMIT",
      committedAt: null,
      digest: deliveryDigest(
        `${uniqueKey}|${setDigest}|${baseline.digest}|${check.id}`,
      ),
      createdAt: now,
      updatedAt: now,
    };
    this.checks.set(check.id, { ...check, state: "CONSUMED" });
    this.deliveries.set(record.id, record);
    saveCompletionChecks(this.paths.checks, [...this.checks.values()]);
    saveDeliveries(this.paths.deliveries, [...this.deliveries.values()]);
    return record;
  }

  /**
   * 本地 OA 确认：PENDING_COMMIT → COMMITTED。
   */
  confirmOaDelivery(
    session: WorkbenchSession,
    deliveryId: string,
  ): DeliveryCommitRecord {
    const record = this.deliveries.get(deliveryId);
    if (!record || record.tenantId !== session.tenantId) {
      throw new Error(`delivery not found: ${deliveryId}`);
    }
    this.requireAssignee(session, record.humanTaskId);
    if (record.oaSyncState === "COMMITTED") {
      return record;
    }
    const now = new Date().toISOString();
    const updated: DeliveryCommitRecord = {
      ...record,
      oaSyncState: "COMMITTED",
      committedAt: now,
      updatedAt: now,
    };
    this.deliveries.set(updated.id, updated);
    saveDeliveries(this.paths.deliveries, [...this.deliveries.values()]);
    return updated;
  }

  /** 列出交付。 */
  listDeliveries(
    session: WorkbenchSession,
    taskId: string,
  ): ReviewListResponse<DeliveryCommitRecord> {
    this.requireTask(session, taskId);
    const items = [...this.deliveries.values()]
      .filter((item) => item.humanTaskId === taskId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { items, total: items.length };
  }

  /** 交付人员视图。 */
  viewDelivery(session: WorkbenchSession, deliveryId: string): DeliveryView {
    const record = this.deliveries.get(deliveryId);
    if (!record || record.tenantId !== session.tenantId) {
      throw new Error(`delivery not found: ${deliveryId}`);
    }
    return buildDeliveryView(record);
  }

  /** 测试：强制过期预检。 */
  expireCheckForTest(checkId: string): void {
    const check = this.checks.get(checkId);
    if (!check) {
      return;
    }
    this.checks.set(checkId, {
      ...check,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
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

  private requireBaseline(
    session: WorkbenchSession,
    task: ClaimableHumanTaskRecord,
    baselineId: string,
  ): FactBaselineRecord {
    const baseline = this.snapshots.getBaselineById(session, baselineId);
    if (!baseline || baseline.humanTaskId !== task.id) {
      throw new Error("baseline not found for task");
    }
    if (baseline.responsibilityEpoch !== task.responsibilityEpoch) {
      throw new Error("baseline epoch mismatch");
    }
    return baseline;
  }

  private requireArtifactDigests(
    session: WorkbenchSession,
    task: ClaimableHumanTaskRecord,
    artifactVersionIds: string[],
  ): string[] {
    const digests: string[] = [];
    for (const id of artifactVersionIds) {
      const art = this.publish.getVersion(session, id);
      if (!art || art.humanTaskId !== task.id) {
        throw new Error(`artifact not found for task: ${id}`);
      }
      if (art.scanStatus === "REJECTED") {
        throw new Error(`artifact rejected: ${id}`);
      }
      digests.push(art.digest);
    }
    return digests;
  }

  private requireActiveApprovals(
    task: ClaimableHumanTaskRecord,
    approvalReceiptIds: string[],
    artifactDigests: string[],
    baseline: FactBaselineRecord,
  ): void {
    if (approvalReceiptIds.length === 0) {
      throw new Error("approvalReceiptIds required");
    }
    const digestSet = new Set(artifactDigests);
    for (const id of approvalReceiptIds) {
      const receipt = this.reviews.getReceipt(id);
      if (!receipt || receipt.humanTaskId !== task.id) {
        throw new Error(`approval receipt not found: ${id}`);
      }
      if (receipt.state !== "ACTIVE" || receipt.decision !== "APPROVE") {
        throw new Error(`approval not active APPROVE: ${id}`);
      }
      if (receipt.responsibilityEpoch !== task.responsibilityEpoch) {
        throw new Error(`approval epoch mismatch: ${id}`);
      }
      if (!digestSet.has(receipt.candidateDigest)) {
        throw new Error(`approval candidateDigest not in artifacts: ${id}`);
      }
      if (
        receipt.baselineId !== baseline.id ||
        receipt.baselineDigest !== baseline.digest
      ) {
        throw new Error(`approval baseline mismatch: ${id}`);
      }
    }
  }
}
