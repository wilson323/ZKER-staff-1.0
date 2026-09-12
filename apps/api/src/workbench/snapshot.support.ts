/**
 * SnapshotRegistry 内部辅助（控制单文件行数、降低重复）。
 */
import { randomUUID } from "node:crypto";
import { ClaimRegistry } from "./claim.registry";
import {
  ClaimableHumanTaskRecord,
  PersonConfigRecord,
} from "./claim.types";
import { assertTaskAssignee } from "./snapshot.rules";
import {
  ContextManifestRecord,
  ContextPreviewRecord,
  ExecutionSnapshotRecord,
  FactBaselineRecord,
  TaskSourceRecord,
} from "./snapshot.types";
import { WorkbenchSession } from "./workbench.types";

/**
 * 收集任务下全部来源（按创建时间排序）。
 */
export function collectSourcesForTask(
  sources: Map<string, TaskSourceRecord>,
  humanTaskId: string,
): TaskSourceRecord[] {
  return Array.from(sources.values())
    .filter((item) => item.humanTaskId === humanTaskId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * 取同任务同 epoch 最新基线。
 */
export function pickLatestBaseline(
  baselines: Map<string, FactBaselineRecord>,
  task: ClaimableHumanTaskRecord,
): FactBaselineRecord | undefined {
  return Array.from(baselines.values())
    .filter(
      (item) =>
        item.humanTaskId === task.id &&
        item.responsibilityEpoch === task.responsibilityEpoch,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

/**
 * 计算人员预览缺项。
 */
export function computeMissingRequired(
  all: TaskSourceRecord[],
  baseline: FactBaselineRecord | undefined,
): ContextPreviewRecord["missingRequired"] {
  const required = all.filter((item) => item.required);
  if (!baseline) {
    const activePerson = required.filter(
      (item) => item.state === "ACTIVE" && item.visibility === "PERSON",
    );
    if (activePerson.length > 0) {
      return activePerson.map((item) => ({
        sourceId: item.id,
        label: item.label,
        supplementHint: item.supplementHint,
      }));
    }
    if (!required.some((item) => item.state === "ACTIVE")) {
      return [
        {
          sourceId: null,
          label: "必需事实尚未登记",
          supplementHint: "有权人员可在本任务补充来源",
        },
      ];
    }
    return [];
  }
  const missing: ContextPreviewRecord["missingRequired"] = [];
  for (const ref of baseline.sourceRefs) {
    if (!ref.required) {
      continue;
    }
    const current = all.find((item) => item.id === ref.sourceId);
    if (!current || current.state !== "ACTIVE" || current.version !== ref.version) {
      missing.push({
        sourceId: ref.sourceId,
        label: ref.label,
        supplementHint: "请重新确认基线或恢复来源",
      });
    }
  }
  return missing;
}

/**
 * 构造 BLOCKED 执行快照记录。
 */
export function buildBlockedSnapshot(
  task: ClaimableHumanTaskRecord,
  baselineId: string | null,
  personConfigId: string | null,
  previewId: string | null,
  blockReason: string,
  now: string,
): ExecutionSnapshotRecord {
  return {
    id: randomUUID(),
    humanTaskId: task.id,
    workId: task.workId,
    tenantId: task.tenantId,
    baselineId,
    manifestId: null,
    personConfigId,
    responsibilityEpoch: task.responsibilityEpoch,
    digest: "blocked",
    sourceRefs: [],
    state: "BLOCKED",
    blockReason,
    previewId,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 解析任务并校验承担人。
 */
export function requireAssigneeTask(
  claims: ClaimRegistry,
  session: WorkbenchSession,
  taskId: string,
): ClaimableHumanTaskRecord {
  const task = claims.getTaskForSession(session, taskId);
  if (!task) {
    throw new Error(`claimable task not found: ${taskId}`);
  }
  assertTaskAssignee(session, task);
  return task;
}

/**
 * 读取任务 ACTIVE 配置 id（可空）。
 */
export function activeConfigId(
  claims: ClaimRegistry,
  session: WorkbenchSession,
  taskId: string,
): string | null {
  const config: PersonConfigRecord | undefined = claims.getActiveConfigForTask(
    session,
    taskId,
  );
  return config?.id ?? null;
}

/**
 * 解析并校验预览 id。
 */
export function normalizePreviewId(
  previews: Map<string, ContextPreviewRecord>,
  taskId: string,
  previewId: string | null | undefined,
): string | null {
  if (previewId === undefined || previewId === null) {
    return null;
  }
  const id = String(previewId).trim();
  if (!id) {
    return null;
  }
  const preview = previews.get(id);
  if (!preview || preview.humanTaskId !== taskId) {
    throw new Error(`preview not found: ${id}`);
  }
  return id;
}

/**
 * 按 id 解析 ACTIVE 来源。
 */
export function resolveActiveSources(
  sources: Map<string, TaskSourceRecord>,
  taskId: string,
  sourceIds: string[],
): TaskSourceRecord[] {
  const selected: TaskSourceRecord[] = [];
  for (const id of sourceIds) {
    const source = sources.get(id);
    if (!source || source.humanTaskId !== taskId) {
      throw new Error(`source not found: ${id}`);
    }
    if (source.state !== "ACTIVE") {
      throw new Error(`source not active: ${id}`);
    }
    selected.push(source);
  }
  return selected;
}

/**
 * 确认时必须覆盖全部必需 ACTIVE 来源。
 */
export function assertAllRequiredSelected(
  sources: Map<string, TaskSourceRecord>,
  taskId: string,
  selected: TaskSourceRecord[],
): void {
  for (const required of collectSourcesForTask(sources, taskId)) {
    if (!required.required || required.state !== "ACTIVE") {
      continue;
    }
    if (!selected.some((item) => item.id === required.id)) {
      throw new Error(`required source missing from confirm: ${required.id}`);
    }
  }
}

/**
 * 构造 READY 快照与 Manifest 对。
 */
export function buildReadyManifestAndSnapshot(
  task: ClaimableHumanTaskRecord,
  baseline: FactBaselineRecord,
  configId: string | null,
  previewId: string | null,
  purposeRaw: string | undefined,
  now: string,
  digest: string,
): { manifest: ContextManifestRecord; snapshot: ExecutionSnapshotRecord } {
  const purpose = (purposeRaw ?? "task-execution").trim() || "task-execution";
  const manifest: ContextManifestRecord = {
    id: randomUUID(),
    humanTaskId: task.id,
    workId: task.workId,
    tenantId: task.tenantId,
    purpose,
    baselineId: baseline.id,
    sourceRefs: baseline.sourceRefs,
    digest,
    createdAt: now,
  };
  const snapshot: ExecutionSnapshotRecord = {
    id: randomUUID(),
    humanTaskId: task.id,
    workId: task.workId,
    tenantId: task.tenantId,
    baselineId: baseline.id,
    manifestId: manifest.id,
    personConfigId: configId,
    responsibilityEpoch: task.responsibilityEpoch,
    digest,
    sourceRefs: baseline.sourceRefs,
    state: "READY",
    blockReason: null,
    previewId,
    createdAt: now,
    updatedAt: now,
  };
  return { manifest, snapshot };
}
