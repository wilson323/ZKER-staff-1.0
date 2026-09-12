/**
 * M1-04 有界执行 Attempt 登记表。
 *
 * C06 仅受理为 QUEUED；真实状态靠 advance/cancel/reconcile。
 * MANUAL 不调模型；RESULT_UNKNOWN 仅 C14 落定；无 pause/resume。
 * TRACE-attempt-20260912-fence幂等查证
 */
import { Injectable, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { ClaimRegistry } from "./claim.registry";
import { ClaimableHumanTaskRecord, PersonConfigRecord } from "./claim.types";
import {
  assertModeModelFlag,
  buildNewAttemptNotice,
  isActiveAttempt,
  nextAdvanceState,
  normalizeStartRequest,
  stageForState,
} from "./attempt.rules";
import {
  attemptDigest,
  AttemptStorePaths,
  loadAttempts,
  resolveAttemptStorePaths,
  saveAttempts,
} from "./attempt.store";
import {
  AttemptListResponse,
  AttemptRecord,
  CancelAttemptRequest,
  ReconcileAttemptRequest,
  StartAttemptRequest,
} from "./attempt.types";
import { SnapshotRegistry } from "./snapshot.registry";
import { ExecutionSnapshotRecord } from "./snapshot.types";
import { WorkbenchSession } from "./workbench.types";

@Injectable()
export class AttemptRegistry implements OnModuleInit {
  private readonly attempts = new Map<string, AttemptRecord>();
  private paths: AttemptStorePaths = resolveAttemptStorePaths();

  constructor(
    private readonly claims: ClaimRegistry,
    private readonly snapshots: SnapshotRegistry,
  ) {}

  onModuleInit(): void {
    this.reloadFromDisk();
  }

  /** 测试辅助：切换数据目录并清空内存。 */
  useDataDirForTest(dataDir: string): void {
    this.paths = resolveAttemptStorePaths(dataDir);
    this.attempts.clear();
  }

  /** 从磁盘装载 Attempt。 */
  reloadFromDisk(): void {
    this.attempts.clear();
    for (const item of loadAttempts(this.paths.attempts)) {
      this.attempts.set(item.id, item);
    }
  }

  /**
   * C06 启动：返回 QUEUED；幂等键命中返回原记录。
   */
  startAttempt(
    session: WorkbenchSession,
    taskId: string,
    request: StartAttemptRequest,
  ): AttemptRecord {
    const task = this.requireAssigneeTask(session, taskId);
    const normalized = normalizeStartRequest(request);
    const existing = this.findByIdempotency(
      task.id,
      task.responsibilityEpoch,
      normalized.idempotencyKey,
    );
    if (existing) {
      return existing;
    }
    const config = this.requireActiveConfig(session, task);
    const snapshot = this.requireReadySnapshot(
      session,
      task,
      normalized.snapshotId,
    );
    const siblings = this.listForTaskEpoch(task.id, task.responsibilityEpoch);
    const active = siblings.find(isActiveAttempt);
    if (active) {
      throw new Error(
        `active attempt fence occupied: ${active.id} state=${active.state}`,
      );
    }
    const cancelled = siblings
      .filter((item) => item.state === "CANCELLED")
      .sort((a, b) => b.attemptNumber - a.attemptNumber)[0];
    if (cancelled && !normalized.acknowledgeNewAttempt) {
      throw new Error(
        "previous attempt cancelled; set acknowledgeNewAttempt=true to create a new Attempt (not a resume)",
      );
    }
    const attemptNumber =
      siblings.reduce((max, item) => Math.max(max, item.attemptNumber), 0) + 1;
    const fence =
      siblings.reduce((max, item) => Math.max(max, item.fence), 0) + 1;
    const now = new Date().toISOString();
    const record: AttemptRecord = {
      id: randomUUID(),
      humanTaskId: task.id,
      workId: task.workId,
      tenantId: task.tenantId,
      personId: session.personId,
      snapshotId: snapshot.id,
      snapshotDigest: snapshot.digest,
      personConfigId: config.id,
      mode: config.mode,
      responsibilityEpoch: task.responsibilityEpoch,
      fence,
      attemptNumber,
      state: "QUEUED",
      stage: stageForState("QUEUED", config.mode),
      idempotencyKey: normalized.idempotencyKey,
      parentAttemptId: cancelled ? cancelled.id : null,
      newAttemptNotice: cancelled
        ? buildNewAttemptNotice(cancelled.id, attemptNumber)
        : null,
      publishedOutputs: [],
      personEvidence: [],
      modelInvoked: false,
      pauseResumeSupported: false,
      unknownReason: null,
      reconcileNote: null,
      createdAt: now,
      updatedAt: now,
    };
    this.attempts.set(record.id, record);
    this.persist();
    return record;
  }

  /** 列出任务全部 Attempt。 */
  listAttempts(
    session: WorkbenchSession,
    taskId: string,
  ): AttemptListResponse {
    const task = this.requireTask(session, taskId);
    const items = Array.from(this.attempts.values())
      .filter((item) => item.humanTaskId === task.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { items, total: items.length };
  }

  /** 按 id 读取（租户隔离）。 */
  getAttempt(
    session: WorkbenchSession,
    attemptId: string,
  ): AttemptRecord | undefined {
    const record = this.attempts.get(attemptId);
    if (!record || record.tenantId !== session.tenantId) {
      return undefined;
    }
    return record;
  }

  /**
   * 本地 runner 推进一步真实状态。
   * RESULT_UNKNOWN 禁止 advance，须 reconcile。
   */
  advanceAttempt(session: WorkbenchSession, attemptId: string): AttemptRecord {
    const current = this.requireOwnedAttempt(session, attemptId);
    if (current.state === "RESULT_UNKNOWN") {
      throw new Error(
        "RESULT_UNKNOWN cannot advance; use C14 reconcile only (no auto-resend)",
      );
    }
    const next = nextAdvanceState(current.state);
    if (!next) {
      throw new Error(`attempt not advanceable: ${current.state}`);
    }
    const now = new Date().toISOString();
    let modelInvoked = current.modelInvoked;
    let personEvidence = current.personEvidence;
    let publishedOutputs = current.publishedOutputs;
    if (next === "RUNNING" && current.mode !== "MANUAL") {
      modelInvoked = true;
    }
    if (next === "SUCCEEDED") {
      assertModeModelFlag(current.mode, modelInvoked);
      if (current.mode === "MANUAL") {
        personEvidence = [
          {
            kind: "manual_completion",
            detail: "承担人完成人工路径，未调用模型",
            sourceVersionNote: `snapshot=${current.snapshotDigest}`,
          },
        ];
      }
      publishedOutputs = [
        {
          id: randomUUID(),
          label: current.mode === "MANUAL" ? "人工交付摘要" : "AI 辅助候选成果",
          digest: attemptDigest([
            current.id,
            current.snapshotDigest,
            current.mode,
            now,
          ]),
        },
      ];
    }
    const updated: AttemptRecord = {
      ...current,
      state: next,
      stage: stageForState(next, current.mode),
      modelInvoked,
      personEvidence,
      publishedOutputs,
      updatedAt: now,
    };
    this.attempts.set(updated.id, updated);
    this.persist();
    return updated;
  }

  /** 取消：QUEUED 直接 CANCELLED，否则 CANCEL_REQUESTED。 */
  cancelAttempt(
    session: WorkbenchSession,
    attemptId: string,
    request: CancelAttemptRequest,
  ): AttemptRecord {
    const reason = (request.reason ?? "").trim();
    if (!reason) {
      throw new Error("cancel reason is required");
    }
    const current = this.requireOwnedAttempt(session, attemptId);
    if (!isActiveAttempt(current) && current.state !== "CANCEL_REQUESTED") {
      throw new Error(`attempt not cancellable: ${current.state}`);
    }
    const now = new Date().toISOString();
    const nextState =
      current.state === "QUEUED" ? "CANCELLED" : "CANCEL_REQUESTED";
    const updated: AttemptRecord = {
      ...current,
      state: nextState,
      stage: `${stageForState(nextState, current.mode)}; reason=${reason}`,
      updatedAt: now,
    };
    this.attempts.set(updated.id, updated);
    this.persist();
    return updated;
  }

  /**
   * 模拟外部写超时 → RESULT_UNKNOWN（真实状态落盘，供 C14 验收）。
   */
  markExternalWriteUnknown(
    session: WorkbenchSession,
    attemptId: string,
  ): AttemptRecord {
    const current = this.requireOwnedAttempt(session, attemptId);
    if (current.state !== "RUNNING") {
      throw new Error("external write timeout only from RUNNING");
    }
    const now = new Date().toISOString();
    const updated: AttemptRecord = {
      ...current,
      state: "RESULT_UNKNOWN",
      stage: stageForState("RESULT_UNKNOWN", current.mode),
      unknownReason: "external write timeout; effect unverified",
      updatedAt: now,
    };
    this.attempts.set(updated.id, updated);
    this.persist();
    return updated;
  }

  /** C14 查证：仅从 RESULT_UNKNOWN 落定。 */
  reconcileAttempt(
    session: WorkbenchSession,
    attemptId: string,
    request: ReconcileAttemptRequest,
  ): AttemptRecord {
    const evidence = (request.evidence ?? "").trim();
    if (!evidence) {
      throw new Error("reconcile evidence is required");
    }
    if (request.outcome !== "SUCCEEDED" && request.outcome !== "FAILED") {
      throw new Error("reconcile outcome must be SUCCEEDED or FAILED");
    }
    const current = this.requireOwnedAttempt(session, attemptId);
    if (current.state !== "RESULT_UNKNOWN") {
      throw new Error("reconcile only allowed from RESULT_UNKNOWN");
    }
    const now = new Date().toISOString();
    const publishedOutputs =
      request.outcome === "SUCCEEDED" && current.publishedOutputs.length === 0
        ? [
            {
              id: randomUUID(),
              label: "查证确认成果",
              digest: attemptDigest([current.id, evidence, now]),
            },
          ]
        : current.publishedOutputs;
    const updated: AttemptRecord = {
      ...current,
      state: request.outcome,
      stage: stageForState(request.outcome, current.mode),
      reconcileNote: evidence,
      publishedOutputs,
      updatedAt: now,
    };
    this.attempts.set(updated.id, updated);
    this.persist();
    return updated;
  }

  private findByIdempotency(
    taskId: string,
    epoch: number,
    key: string,
  ): AttemptRecord | undefined {
    return Array.from(this.attempts.values()).find(
      (item) =>
        item.humanTaskId === taskId &&
        item.responsibilityEpoch === epoch &&
        item.idempotencyKey === key,
    );
  }

  private listForTaskEpoch(taskId: string, epoch: number): AttemptRecord[] {
    return Array.from(this.attempts.values()).filter(
      (item) =>
        item.humanTaskId === taskId && item.responsibilityEpoch === epoch,
    );
  }

  private requireReadySnapshot(
    session: WorkbenchSession,
    task: ClaimableHumanTaskRecord,
    snapshotId: string | null,
  ): ExecutionSnapshotRecord {
    const latest = this.snapshots.getLatestSnapshot(session, task.id);
    if (!latest || latest.state !== "READY") {
      throw new Error("READY execution snapshot required before startAttempt");
    }
    if (snapshotId && latest.id !== snapshotId) {
      throw new Error(
        `snapshot not found or not latest READY: ${snapshotId}`,
      );
    }
    if (latest.responsibilityEpoch !== task.responsibilityEpoch) {
      throw new Error("snapshot epoch mismatch");
    }
    return latest;
  }

  private requireActiveConfig(
    session: WorkbenchSession,
    task: ClaimableHumanTaskRecord,
  ): PersonConfigRecord {
    const config = this.claims.getActiveConfigForTask(session, task.id);
    if (!config) {
      throw new Error("ACTIVE person config required before startAttempt");
    }
    return config;
  }

  private requireAssigneeTask(
    session: WorkbenchSession,
    taskId: string,
  ): ClaimableHumanTaskRecord {
    const task = this.requireTask(session, taskId);
    if (task.state !== "CLAIMED" || task.assigneePersonId !== session.personId) {
      throw new Error("only assignee may start attempt");
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

  private requireOwnedAttempt(
    session: WorkbenchSession,
    attemptId: string,
  ): AttemptRecord {
    const record = this.getAttempt(session, attemptId);
    if (!record) {
      throw new Error(`attempt not found: ${attemptId}`);
    }
    if (record.personId !== session.personId) {
      throw new Error("only owner may mutate attempt");
    }
    return record;
  }

  private persist(): void {
    saveAttempts(this.paths.attempts, Array.from(this.attempts.values()));
  }
}
