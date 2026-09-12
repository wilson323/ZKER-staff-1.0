/**
 * M1-04 Attempt JSON 落盘；复用 common/json-array-store。
 *
 * TRACE-attempt-20260912-落盘
 */
import { createHash } from "node:crypto";
import { join } from "node:path";
import {
  asObject,
  loadJsonArray,
  requireBoolean,
  requireNonEmptyString,
  requireNonNegativeInt,
  requirePositiveInt,
  requireStringAllowEmpty,
  saveJsonArray,
} from "../common/json-array-store";
import { resolveDataDir } from "../digital-employees/digital-employee.store";
import { PersonConfigMode } from "./claim.types";
import {
  AttemptRecord,
  AttemptState,
  PersonEvidenceRef,
  PublishedOutputRef,
} from "./attempt.types";

const ATTEMPTS = "execution-attempts.json";

/** Attempt 存储路径。 */
export interface AttemptStorePaths {
  attempts: string;
}

/**
 * 解析 Attempt 存储路径。
 *
 * Args:
 *   dataDir: 可选数据目录。
 *
 * Returns:
 *   AttemptStorePaths
 */
export function resolveAttemptStorePaths(dataDir?: string): AttemptStorePaths {
  const root = dataDir ?? resolveDataDir();
  return { attempts: join(root, ATTEMPTS) };
}

/**
 * 计算输出摘要。
 *
 * Args:
 *   parts: 参与摘要的字符串。
 *
 * Returns:
 *   sha256:hex
 */
export function attemptDigest(parts: string[]): string {
  const hash = createHash("sha256");
  hash.update(parts.join("|"));
  return `sha256:${hash.digest("hex")}`;
}

/**
 * 读取 Attempt 列表。
 *
 * Args:
 *   storePath: JSON 路径。
 *
 * Returns:
 *   AttemptRecord[]
 */
export function loadAttempts(storePath: string): AttemptRecord[] {
  return loadJsonArray(storePath, "attempts").map(assertAttempt);
}

/**
 * 写入 Attempt 列表。
 *
 * Args:
 *   storePath: JSON 路径。
 *   items: 记录。
 */
export function saveAttempts(storePath: string, items: AttemptRecord[]): void {
  saveJsonArray(storePath, items);
}

/**
 * 校验并解析单条 Attempt。
 */
function assertAttempt(value: unknown): AttemptRecord {
  const record = asObject(value, "attempt");
  const state = requireNonEmptyString(record, "state") as AttemptState;
  assertState(state);
  const mode = requireNonEmptyString(record, "mode") as PersonConfigMode;
  if (mode !== "MANUAL" && mode !== "ASSISTED" && mode !== "AUTONOMOUS") {
    throw new Error("invalid attempt: mode");
  }
  const pauseResumeSupported = requireBoolean(record, "pauseResumeSupported");
  if (pauseResumeSupported !== false) {
    throw new Error("invalid attempt: pauseResumeSupported must be false");
  }
  return {
    id: requireNonEmptyString(record, "id"),
    humanTaskId: requireNonEmptyString(record, "humanTaskId"),
    workId: requireNonEmptyString(record, "workId"),
    tenantId: requireNonEmptyString(record, "tenantId"),
    personId: requireNonEmptyString(record, "personId"),
    snapshotId: requireNonEmptyString(record, "snapshotId"),
    snapshotDigest: requireNonEmptyString(record, "snapshotDigest"),
    personConfigId: requireNonEmptyString(record, "personConfigId"),
    mode,
    responsibilityEpoch: requireNonNegativeInt(record, "responsibilityEpoch"),
    fence: requirePositiveInt(record, "fence"),
    attemptNumber: requirePositiveInt(record, "attemptNumber"),
    state,
    stage: requireNonEmptyString(record, "stage"),
    idempotencyKey: requireNonEmptyString(record, "idempotencyKey"),
    parentAttemptId: requireNullableString(record, "parentAttemptId"),
    newAttemptNotice: requireNullableString(record, "newAttemptNotice"),
    publishedOutputs: assertOutputs(record.publishedOutputs),
    personEvidence: assertEvidence(record.personEvidence),
    modelInvoked: requireBoolean(record, "modelInvoked"),
    pauseResumeSupported: false,
    unknownReason: requireNullableString(record, "unknownReason"),
    reconcileNote: requireNullableString(record, "reconcileNote"),
    createdAt: requireNonEmptyString(record, "createdAt"),
    updatedAt: requireNonEmptyString(record, "updatedAt"),
  };
}

function assertState(state: string): void {
  const allowed: AttemptState[] = [
    "QUEUED",
    "PREPARING",
    "RUNNING",
    "SUCCEEDED",
    "FAILED",
    "CANCEL_REQUESTED",
    "CANCELLED",
    "RESULT_UNKNOWN",
  ];
  if (!allowed.includes(state as AttemptState)) {
    throw new Error(`invalid attempt: state ${state}`);
  }
}

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

function assertOutputs(value: unknown): PublishedOutputRef[] {
  if (!Array.isArray(value)) {
    throw new Error("invalid attempt: publishedOutputs");
  }
  return value.map((item) => {
    const row = asObject(item, "publishedOutput");
    return {
      id: requireNonEmptyString(row, "id"),
      label: requireNonEmptyString(row, "label"),
      digest: requireNonEmptyString(row, "digest"),
    };
  });
}

function assertEvidence(value: unknown): PersonEvidenceRef[] {
  if (!Array.isArray(value)) {
    throw new Error("invalid attempt: personEvidence");
  }
  return value.map((item) => {
    const row = asObject(item, "personEvidence");
    return {
      kind: requireNonEmptyString(row, "kind"),
      detail: requireStringAllowEmpty(row, "detail"),
      sourceVersionNote: requireStringAllowEmpty(row, "sourceVersionNote"),
    };
  });
}
