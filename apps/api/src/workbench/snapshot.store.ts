/**
 * M1-03 来源 / 基线 / 预览 / 快照 JSON 落盘。
 *
 * 复用 common/json-array-store，禁止再造平行落盘实现。
 * TRACE-snapshot-20260912-来源确认落盘
 */
import { createHash } from "node:crypto";
import { join } from "node:path";
import {
  asObject,
  loadJsonArray,
  requireBoolean,
  requireNonEmptyString,
  requireNonNegativeInt,
  requireStringAllowEmpty,
  saveJsonArray,
} from "../common/json-array-store";
import { resolveDataDir } from "../digital-employees/digital-employee.store";
import {
  BaselineSourceRef,
  ContextManifestRecord,
  ContextPreviewRecord,
  ExecutionSnapshotRecord,
  FactBaselineRecord,
  SourceState,
  SourceVisibility,
  TaskSourceRecord,
} from "./snapshot.types";

const SOURCES = "task-sources.json";
const BASELINES = "fact-baselines.json";
const PREVIEWS = "context-previews.json";
const MANIFESTS = "context-manifests.json";
const SNAPSHOTS = "execution-snapshots.json";

/** 模块存储路径集合。 */
export interface SnapshotStorePaths {
  sources: string;
  baselines: string;
  previews: string;
  manifests: string;
  snapshots: string;
}

/**
 * 解析快照模块存储路径。
 *
 * Args:
 *   dataDir: 可选数据目录。
 *
 * Returns:
 *   五类 JSON 绝对路径。
 */
export function resolveSnapshotStorePaths(dataDir?: string): SnapshotStorePaths {
  const root = dataDir ?? resolveDataDir();
  return {
    sources: join(root, SOURCES),
    baselines: join(root, BASELINES),
    previews: join(root, PREVIEWS),
    manifests: join(root, MANIFESTS),
    snapshots: join(root, SNAPSHOTS),
  };
}

/**
 * 计算基线 / Manifest / 快照摘要。
 */
export function digestParts(parts: string[]): string {
  const hash = createHash("sha256");
  hash.update(parts.join("|"));
  return `sha256:${hash.digest("hex")}`;
}

/**
 * 读取可空字符串（null 或 string）。
 */
function requireNullableString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`invalid record: ${key}`);
  }
  return value;
}

export function loadTaskSources(path: string): TaskSourceRecord[] {
  return loadJsonArray(path, "task-sources").map(assertSource);
}

export function saveTaskSources(path: string, items: TaskSourceRecord[]): void {
  saveJsonArray(path, items);
}

export function loadBaselines(path: string): FactBaselineRecord[] {
  return loadJsonArray(path, "fact-baselines").map(assertBaseline);
}

export function saveBaselines(path: string, items: FactBaselineRecord[]): void {
  saveJsonArray(path, items);
}

export function loadPreviews(path: string): ContextPreviewRecord[] {
  return loadJsonArray(path, "context-previews").map(assertPreview);
}

export function savePreviews(path: string, items: ContextPreviewRecord[]): void {
  saveJsonArray(path, items);
}

export function loadManifests(path: string): ContextManifestRecord[] {
  return loadJsonArray(path, "context-manifests").map(assertManifest);
}

export function saveManifests(
  path: string,
  items: ContextManifestRecord[],
): void {
  saveJsonArray(path, items);
}

export function loadSnapshots(path: string): ExecutionSnapshotRecord[] {
  return loadJsonArray(path, "execution-snapshots").map(assertSnapshot);
}

export function saveSnapshots(
  path: string,
  items: ExecutionSnapshotRecord[],
): void {
  saveJsonArray(path, items);
}

function assertSource(value: unknown): TaskSourceRecord {
  const record = asObject(value, "task source");
  const visibility = requireNonEmptyString(
    record,
    "visibility",
  ) as SourceVisibility;
  if (visibility !== "PERSON" && visibility !== "BACKEND_ONLY") {
    throw new Error("invalid task source record: visibility");
  }
  const state = requireNonEmptyString(record, "state") as SourceState;
  if (state !== "ACTIVE" && state !== "REVOKED") {
    throw new Error("invalid task source record: state");
  }
  return {
    id: requireNonEmptyString(record, "id"),
    humanTaskId: requireNonEmptyString(record, "humanTaskId"),
    workId: requireNonEmptyString(record, "workId"),
    tenantId: requireNonEmptyString(record, "tenantId"),
    label: requireNonEmptyString(record, "label"),
    version: requireNonNegativeInt(record, "version"),
    visibility,
    required: requireBoolean(record, "required"),
    state,
    supplementHint: requireStringAllowEmpty(record, "supplementHint"),
    createdAt: requireNonEmptyString(record, "createdAt"),
    updatedAt: requireNonEmptyString(record, "updatedAt"),
  };
}

function assertSourceRefs(value: unknown): BaselineSourceRef[] {
  if (!Array.isArray(value)) {
    throw new TypeError("invalid baseline sourceRefs");
  }
  return value.map((item) => {
    const ref = asObject(item, "baseline sourceRef");
    return {
      sourceId: requireNonEmptyString(ref, "sourceId"),
      version: requireNonNegativeInt(ref, "version"),
      label: requireNonEmptyString(ref, "label"),
      required: requireBoolean(ref, "required"),
    };
  });
}

function assertBaseline(value: unknown): FactBaselineRecord {
  const record = asObject(value, "fact baseline");
  return {
    id: requireNonEmptyString(record, "id"),
    humanTaskId: requireNonEmptyString(record, "humanTaskId"),
    workId: requireNonEmptyString(record, "workId"),
    tenantId: requireNonEmptyString(record, "tenantId"),
    confirmedBy: requireNonEmptyString(record, "confirmedBy"),
    responsibilityEpoch: requireNonNegativeInt(record, "responsibilityEpoch"),
    sourceRefs: assertSourceRefs(record.sourceRefs),
    digest: requireNonEmptyString(record, "digest"),
    revision: requireNonNegativeInt(record, "revision"),
    createdAt: requireNonEmptyString(record, "createdAt"),
    updatedAt: requireNonEmptyString(record, "updatedAt"),
  };
}

function assertPreview(value: unknown): ContextPreviewRecord {
  const record = asObject(value, "context preview");
  if (record.previewAuthorizedExecution !== false) {
    throw new Error("previewAuthorizedExecution must be false");
  }
  if (!Array.isArray(record.visibleSources)) {
    throw new TypeError("invalid context preview: visibleSources");
  }
  if (!Array.isArray(record.missingRequired)) {
    throw new TypeError("invalid context preview: missingRequired");
  }
  return {
    id: requireNonEmptyString(record, "id"),
    humanTaskId: requireNonEmptyString(record, "humanTaskId"),
    workId: requireNonEmptyString(record, "workId"),
    tenantId: requireNonEmptyString(record, "tenantId"),
    personId: requireNonEmptyString(record, "personId"),
    baselineId: requireNullableString(record, "baselineId"),
    visibleSources:
      record.visibleSources as ContextPreviewRecord["visibleSources"],
    missingRequired:
      record.missingRequired as ContextPreviewRecord["missingRequired"],
    backendOnlyActiveCount: requireNonNegativeInt(
      record,
      "backendOnlyActiveCount",
    ),
    previewAuthorizedExecution: false,
    createdAt: requireNonEmptyString(record, "createdAt"),
  };
}

function assertManifest(value: unknown): ContextManifestRecord {
  const record = asObject(value, "context manifest");
  return {
    id: requireNonEmptyString(record, "id"),
    humanTaskId: requireNonEmptyString(record, "humanTaskId"),
    workId: requireNonEmptyString(record, "workId"),
    tenantId: requireNonEmptyString(record, "tenantId"),
    purpose: requireNonEmptyString(record, "purpose"),
    baselineId: requireNonEmptyString(record, "baselineId"),
    sourceRefs: assertSourceRefs(record.sourceRefs),
    digest: requireNonEmptyString(record, "digest"),
    createdAt: requireNonEmptyString(record, "createdAt"),
  };
}

function assertSnapshot(value: unknown): ExecutionSnapshotRecord {
  const record = asObject(value, "execution snapshot");
  const state = requireNonEmptyString(record, "state");
  if (state !== "READY" && state !== "BLOCKED") {
    throw new Error("invalid execution snapshot: state");
  }
  return {
    id: requireNonEmptyString(record, "id"),
    humanTaskId: requireNonEmptyString(record, "humanTaskId"),
    workId: requireNonEmptyString(record, "workId"),
    tenantId: requireNonEmptyString(record, "tenantId"),
    baselineId: requireNullableString(record, "baselineId"),
    manifestId: requireNullableString(record, "manifestId"),
    personConfigId: requireNullableString(record, "personConfigId"),
    responsibilityEpoch: requireNonNegativeInt(record, "responsibilityEpoch"),
    digest: requireNonEmptyString(record, "digest"),
    sourceRefs: assertSourceRefs(record.sourceRefs),
    state,
    blockReason: requireNullableString(record, "blockReason"),
    previewId: requireNullableString(record, "previewId"),
    createdAt: requireNonEmptyString(record, "createdAt"),
    updatedAt: requireNonEmptyString(record, "updatedAt"),
  };
}
