/**
 * M1-03 来源确认 / 预览 / 执行快照登记表。
 *
 * C16 确认不可变 Baseline；C05 人员预览不含私有正文；
 * C06 重验漂移后生成 Manifest+Snapshot；预览永不授权执行。
 * TRACE-snapshot-20260912-撤销必需来源阻断快照
 */
import { Injectable, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { ClaimRegistry } from "./claim.registry";
import { ClaimableHumanTaskRecord } from "./claim.types";
import {
  assertConfirmRequest,
  baselineDigest,
  findSourceDrift,
  normalizeRegisterSource,
  personVisibleSources,
  toBaselineRefs,
} from "./snapshot.rules";
import {
  loadBaselines,
  loadManifests,
  loadPreviews,
  loadSnapshots,
  loadTaskSources,
  resolveSnapshotStorePaths,
  saveBaselines,
  saveManifests,
  savePreviews,
  saveSnapshots,
  saveTaskSources,
  SnapshotStorePaths,
} from "./snapshot.store";
import {
  activeConfigId,
  assertAllRequiredSelected,
  buildBlockedSnapshot,
  buildReadyManifestAndSnapshot,
  collectSourcesForTask,
  computeMissingRequired,
  normalizePreviewId,
  pickLatestBaseline,
  requireAssigneeTask,
  resolveActiveSources,
} from "./snapshot.support";
import {
  BuildSnapshotRequest,
  ConfirmBaselineRequest,
  ContextManifestRecord,
  ContextPreviewRecord,
  ExecutionSnapshotRecord,
  FactBaselineRecord,
  RegisterSourceRequest,
  SnapshotListResponse,
  TaskSourceRecord,
} from "./snapshot.types";
import { WorkbenchSession } from "./workbench.types";

@Injectable()
export class SnapshotRegistry implements OnModuleInit {
  private readonly sources = new Map<string, TaskSourceRecord>();
  private readonly baselines = new Map<string, FactBaselineRecord>();
  private readonly previews = new Map<string, ContextPreviewRecord>();
  private readonly manifests = new Map<string, ContextManifestRecord>();
  private readonly snapshots = new Map<string, ExecutionSnapshotRecord>();
  private paths: SnapshotStorePaths = resolveSnapshotStorePaths();

  constructor(private readonly claims: ClaimRegistry) {}

  onModuleInit(): void {
    this.reloadFromDisk();
  }

  /** 测试辅助：切换数据目录并清空内存。 */
  useDataDirForTest(dataDir: string): void {
    this.paths = resolveSnapshotStorePaths(dataDir);
    this.clearMemory();
  }

  /** 从磁盘重新装载五类记录。 */
  reloadFromDisk(): void {
    this.clearMemory();
    this.fill(this.sources, loadTaskSources(this.paths.sources));
    this.fill(this.baselines, loadBaselines(this.paths.baselines));
    this.fill(this.previews, loadPreviews(this.paths.previews));
    this.fill(this.manifests, loadManifests(this.paths.manifests));
    this.fill(this.snapshots, loadSnapshots(this.paths.snapshots));
  }

  /** 登记任务来源（按 humanTask/work 隔离）。 */
  registerSource(
    session: WorkbenchSession,
    taskId: string,
    request: RegisterSourceRequest,
  ): TaskSourceRecord {
    const task = requireAssigneeTask(this.claims, session, taskId);
    const normalized = normalizeRegisterSource(request);
    const now = new Date().toISOString();
    const record: TaskSourceRecord = {
      id: randomUUID(),
      humanTaskId: task.id,
      workId: task.workId,
      tenantId: task.tenantId,
      label: normalized.label,
      version: 1,
      visibility: normalized.visibility,
      required: normalized.required,
      state: "ACTIVE",
      supplementHint: normalized.supplementHint,
      createdAt: now,
      updatedAt: now,
    };
    this.sources.set(record.id, record);
    saveTaskSources(this.paths.sources, Array.from(this.sources.values()));
    return record;
  }

  /** 列出本任务人员可见来源（隐藏 BACKEND_ONLY）。 */
  listSourcesForTask(
    session: WorkbenchSession,
    taskId: string,
  ): SnapshotListResponse<TaskSourceRecord> {
    const task = this.requireTask(session, taskId);
    const items = collectSourcesForTask(this.sources, task.id).filter(
      (item) => item.visibility === "PERSON",
    );
    return { items, total: items.length };
  }

  /** 撤销来源；必需源撤销后快照应阻断。 */
  revokeSource(
    session: WorkbenchSession,
    taskId: string,
    sourceId: string,
  ): TaskSourceRecord {
    const task = requireAssigneeTask(this.claims, session, taskId);
    const source = this.sources.get(sourceId);
    if (!source || source.humanTaskId !== task.id) {
      throw new Error(`source not found: ${sourceId}`);
    }
    if (source.state === "REVOKED") {
      return source;
    }
    const updated: TaskSourceRecord = {
      ...source,
      state: "REVOKED",
      version: source.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.sources.set(updated.id, updated);
    saveTaskSources(this.paths.sources, Array.from(this.sources.values()));
    return updated;
  }

  /** C16：确认形成不可变 Baseline。 */
  confirmBaseline(
    session: WorkbenchSession,
    taskId: string,
    request: ConfirmBaselineRequest,
  ): FactBaselineRecord {
    const task = requireAssigneeTask(this.claims, session, taskId);
    const sourceIds = assertConfirmRequest(task, request);
    const selected = resolveActiveSources(this.sources, task.id, sourceIds);
    assertAllRequiredSelected(this.sources, task.id, selected);
    const refs = toBaselineRefs(selected);
    const now = new Date().toISOString();
    const record: FactBaselineRecord = {
      id: randomUUID(),
      humanTaskId: task.id,
      workId: task.workId,
      tenantId: task.tenantId,
      confirmedBy: session.personId,
      responsibilityEpoch: task.responsibilityEpoch,
      sourceRefs: refs,
      digest: baselineDigest(task.workId, task.responsibilityEpoch, refs),
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.baselines.set(record.id, record);
    saveBaselines(this.paths.baselines, Array.from(this.baselines.values()));
    return record;
  }

  /** 读取任务最新基线（同 epoch）。 */
  getLatestBaseline(
    session: WorkbenchSession,
    taskId: string,
  ): FactBaselineRecord | undefined {
    return pickLatestBaseline(this.baselines, this.requireTask(session, taskId));
  }

  /**
   * 按 id 读取基线（租户隔离）。
   *
   * Args:
   *   session: 会话。
   *   baselineId: 基线 id。
   *
   * Returns:
   *   基线或 undefined。
   */
  getBaselineById(
    session: WorkbenchSession,
    baselineId: string,
  ): FactBaselineRecord | undefined {
    const item = this.baselines.get(baselineId);
    if (!item || item.tenantId !== session.tenantId) {
      return undefined;
    }
    return item;
  }

  /** C05：人员预览；永不授权执行。 */
  previewContext(
    session: WorkbenchSession,
    taskId: string,
  ): ContextPreviewRecord {
    const task = requireAssigneeTask(this.claims, session, taskId);
    const all = collectSourcesForTask(this.sources, task.id);
    const baseline = pickLatestBaseline(this.baselines, task);
    const preview: ContextPreviewRecord = {
      id: randomUUID(),
      humanTaskId: task.id,
      workId: task.workId,
      tenantId: task.tenantId,
      personId: session.personId,
      baselineId: baseline?.id ?? null,
      visibleSources: personVisibleSources(all).map((item) => ({
        sourceId: item.id,
        label: item.label,
        version: item.version,
        required: item.required,
        state: item.state,
      })),
      missingRequired: computeMissingRequired(all, baseline),
      backendOnlyActiveCount: all.filter(
        (item) => item.visibility === "BACKEND_ONLY" && item.state === "ACTIVE",
      ).length,
      previewAuthorizedExecution: false,
      createdAt: new Date().toISOString(),
    };
    this.previews.set(preview.id, preview);
    savePreviews(this.paths.previews, Array.from(this.previews.values()));
    return preview;
  }

  /** C06：启动前重验；漂移则 BLOCKED。 */
  buildExecutionSnapshot(
    session: WorkbenchSession,
    taskId: string,
    request: BuildSnapshotRequest,
  ): ExecutionSnapshotRecord {
    const task = requireAssigneeTask(this.claims, session, taskId);
    const now = new Date().toISOString();
    const previewId = normalizePreviewId(
      this.previews,
      task.id,
      request.previewId,
    );
    const configId = activeConfigId(this.claims, session, taskId);
    const baseline = pickLatestBaseline(this.baselines, task);
    if (!baseline) {
      return this.persistBlocked(
        task,
        null,
        configId,
        previewId,
        "baseline required before execution snapshot",
        now,
      );
    }
    const drift = findSourceDrift(
      baseline.sourceRefs,
      collectSourcesForTask(this.sources, task.id),
    );
    if (drift) {
      return this.persistBlocked(
        task,
        baseline.id,
        configId,
        previewId,
        drift,
        now,
      );
    }
    const digest = baselineDigest(
      task.workId,
      task.responsibilityEpoch,
      baseline.sourceRefs,
    );
    const pair = buildReadyManifestAndSnapshot(
      task,
      baseline,
      configId,
      previewId,
      request.purpose,
      now,
      digest,
    );
    this.manifests.set(pair.manifest.id, pair.manifest);
    this.snapshots.set(pair.snapshot.id, pair.snapshot);
    saveManifests(this.paths.manifests, Array.from(this.manifests.values()));
    saveSnapshots(this.paths.snapshots, Array.from(this.snapshots.values()));
    return pair.snapshot;
  }

  /** 读取任务最新快照。 */
  getLatestSnapshot(
    session: WorkbenchSession,
    taskId: string,
  ): ExecutionSnapshotRecord | undefined {
    const task = this.requireTask(session, taskId);
    return Array.from(this.snapshots.values())
      .filter((item) => item.humanTaskId === task.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }

  private persistBlocked(
    task: ClaimableHumanTaskRecord,
    baselineId: string | null,
    configId: string | null,
    previewId: string | null,
    reason: string,
    now: string,
  ): ExecutionSnapshotRecord {
    const snapshot = buildBlockedSnapshot(
      task,
      baselineId,
      configId,
      previewId,
      reason,
      now,
    );
    this.snapshots.set(snapshot.id, snapshot);
    saveSnapshots(this.paths.snapshots, Array.from(this.snapshots.values()));
    return snapshot;
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

  private fill<T extends { id: string }>(target: Map<string, T>, items: T[]): void {
    for (const item of items) {
      target.set(item.id, item);
    }
  }

  private clearMemory(): void {
    this.sources.clear();
    this.baselines.clear();
    this.previews.clear();
    this.manifests.clear();
    this.snapshots.clear();
  }
}
