/**
 * M1-02 领取任务与本人配置 JSON 落盘。
 *
 * 禁止 SQLite / mock；路径复用 ZKER_DATA_DIR。
 * TRACE-claim-20260912-领取配置落盘
 */
import { join } from "node:path";
import {
  asObject,
  loadJsonArray,
  requireNonEmptyString,
  requireNonNegativeInt,
  requireStringAllowEmpty,
  saveJsonArray,
} from "../common/json-array-store";
import { resolveDataDir } from "../digital-employees/digital-employee.store";
import {
  ClaimableHumanTaskRecord,
  ClaimableTaskState,
  PersonConfigMode,
  PersonConfigRecord,
  PersonConfigState,
} from "./claim.types";

const TASKS_FILE = "claimable-human-tasks.json";
const CONFIGS_FILE = "person-configs.json";

/**
 * 解析领取模块存储路径。
 *
 * Args:
 *   dataDir: 可选数据目录。
 *
 * Returns:
 *   两类 JSON 绝对路径。
 */
export function resolveClaimStorePaths(dataDir?: string): {
  tasks: string;
  configs: string;
} {
  const root = dataDir ?? resolveDataDir();
  return {
    tasks: join(root, TASKS_FILE),
    configs: join(root, CONFIGS_FILE),
  };
}

/**
 * 加载可领取人任务。
 */
export function loadClaimableTasks(
  storePath: string,
): ClaimableHumanTaskRecord[] {
  return loadJsonArray(storePath, "claimable-human-tasks").map((item) =>
    assertTask(item),
  );
}

/**
 * 保存可领取人任务。
 */
export function saveClaimableTasks(
  storePath: string,
  items: ClaimableHumanTaskRecord[],
): void {
  saveJsonArray(storePath, items);
}

/**
 * 加载本人配置。
 */
export function loadPersonConfigs(storePath: string): PersonConfigRecord[] {
  return loadJsonArray(storePath, "person-configs").map((item) =>
    assertConfig(item),
  );
}

/**
 * 保存本人配置。
 */
export function savePersonConfigs(
  storePath: string,
  items: PersonConfigRecord[],
): void {
  saveJsonArray(storePath, items);
}

/**
 * 校验人任务形状。
 */
function assertTask(value: unknown): ClaimableHumanTaskRecord {
  const record = asObject(value, "claimable human task");
  const state = requireNonEmptyString(record, "state") as ClaimableTaskState;
  if (state !== "OPEN" && state !== "CLAIMED") {
    throw new Error("invalid claimable human task record: state");
  }
  const assignee = record.assigneePersonId;
  if (assignee !== null && typeof assignee !== "string") {
    throw new Error("invalid claimable human task record: assigneePersonId");
  }
  const requiredOutputs = record.requiredOutputs;
  if (
    !Array.isArray(requiredOutputs) ||
    !requiredOutputs.every((item) => typeof item === "string")
  ) {
    throw new TypeError("invalid claimable human task record: requiredOutputs");
  }
  return {
    id: requireNonEmptyString(record, "id"),
    workId: requireNonEmptyString(record, "workId"),
    instanceId: requireNonEmptyString(record, "instanceId"),
    tenantId: requireNonEmptyString(record, "tenantId"),
    title: requireNonEmptyString(record, "title"),
    state,
    assigneePersonId: assignee === null ? null : String(assignee),
    responsibilityEpoch: requireNonNegativeInt(record, "responsibilityEpoch"),
    revision: requireNonNegativeInt(record, "revision"),
    requiredOutputs: requiredOutputs as string[],
    budgetTokens: requireNonNegativeInt(record, "budgetTokens"),
    createdAt: requireNonEmptyString(record, "createdAt"),
    updatedAt: requireNonEmptyString(record, "updatedAt"),
  };
}

/**
 * 校验本人配置形状。
 */
function assertConfig(value: unknown): PersonConfigRecord {
  const record = asObject(value, "person config");
  const mode = requireNonEmptyString(record, "mode") as PersonConfigMode;
  if (mode !== "MANUAL" && mode !== "ASSISTED" && mode !== "AUTONOMOUS") {
    throw new Error("invalid person config record: mode");
  }
  const state = requireNonEmptyString(record, "state") as PersonConfigState;
  if (state !== "ACTIVE" && state !== "REVOKED") {
    throw new Error("invalid person config record: state");
  }
  if (record.started !== false) {
    throw new Error("invalid person config record: started must be false");
  }
  const employeeId = record.digitalEmployeeId;
  if (employeeId !== null && typeof employeeId !== "string") {
    throw new Error("invalid person config record: digitalEmployeeId");
  }
  const requiredOutputs = record.requiredOutputs;
  if (
    !Array.isArray(requiredOutputs) ||
    !requiredOutputs.every((item) => typeof item === "string")
  ) {
    throw new TypeError("invalid person config record: requiredOutputs");
  }
  return {
    id: requireNonEmptyString(record, "id"),
    humanTaskId: requireNonEmptyString(record, "humanTaskId"),
    workId: requireNonEmptyString(record, "workId"),
    configuredBy: requireNonEmptyString(record, "configuredBy"),
    mode,
    digitalEmployeeId: employeeId === null ? null : String(employeeId),
    responsibilityEpoch: requireNonNegativeInt(record, "responsibilityEpoch"),
    revision: requireNonNegativeInt(record, "revision"),
    requiredOutputs: requiredOutputs as string[],
    budgetTokens: requireNonNegativeInt(record, "budgetTokens"),
    preferenceNote: requireStringAllowEmpty(record, "preferenceNote"),
    started: false,
    state,
    createdAt: requireNonEmptyString(record, "createdAt"),
    updatedAt: requireNonEmptyString(record, "updatedAt"),
  };
}
