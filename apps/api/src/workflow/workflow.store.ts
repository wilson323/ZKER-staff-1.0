/**
 * 工作流 JSON 文件存储：工作项 / 人任务 / 绑定。
 *
 * 禁止 SQLite 与 mock；路径复用 ZKER_DATA_DIR。
 * TRACE-workflow-20260912-人任务员工绑定落盘
 */
import { join } from "node:path";
import {
  asObject,
  loadJsonArray,
  requireNonEmptyString,
  requirePositiveInt,
  saveJsonArray,
} from "../common/json-array-store";
import { resolveDataDir } from "../digital-employees/digital-employee.store";
import {
  BindingMode,
  BindingState,
  HumanTaskRecord,
  HumanTaskState,
  TaskBindingRecord,
  WorkItemRecord,
} from "./workflow.types";

const WORK_ITEMS_FILE = "work-items.json";
const HUMAN_TASKS_FILE = "human-tasks.json";
const TASK_BINDINGS_FILE = "task-bindings.json";

/**
 * 解析三类存储文件路径。
 *
 * Args:
 *   dataDir: 可选数据目录。
 *
 * Returns:
 *   三类 JSON 绝对路径。
 */
export function resolveWorkflowStorePaths(dataDir?: string): {
  workItems: string;
  humanTasks: string;
  taskBindings: string;
} {
  const root = dataDir ?? resolveDataDir();
  return {
    workItems: join(root, WORK_ITEMS_FILE),
    humanTasks: join(root, HUMAN_TASKS_FILE),
    taskBindings: join(root, TASK_BINDINGS_FILE),
  };
}

/**
 * 加载工作项列表。
 */
export function loadWorkItems(storePath: string): WorkItemRecord[] {
  return loadJsonArray(storePath, "work-items").map((item) =>
    assertWorkItem(item),
  );
}

/**
 * 保存工作项列表。
 */
export function saveWorkItems(
  storePath: string,
  items: WorkItemRecord[],
): void {
  saveJsonArray(storePath, items);
}

/**
 * 加载人任务列表。
 */
export function loadHumanTasks(storePath: string): HumanTaskRecord[] {
  return loadJsonArray(storePath, "human-tasks").map((item) =>
    assertHumanTask(item),
  );
}

/**
 * 保存人任务列表。
 */
export function saveHumanTasks(
  storePath: string,
  items: HumanTaskRecord[],
): void {
  saveJsonArray(storePath, items);
}

/**
 * 加载任务绑定列表。
 */
export function loadTaskBindings(storePath: string): TaskBindingRecord[] {
  return loadJsonArray(storePath, "task-bindings").map((item) =>
    assertTaskBinding(item),
  );
}

/**
 * 保存任务绑定列表。
 */
export function saveTaskBindings(
  storePath: string,
  items: TaskBindingRecord[],
): void {
  saveJsonArray(storePath, items);
}

/**
 * 校验工作项形状。
 */
function assertWorkItem(value: unknown): WorkItemRecord {
  const record = asObject(value, "work item");
  return {
    id: requireNonEmptyString(record, "id"),
    title: requireNonEmptyString(record, "title"),
    createdAt: requireNonEmptyString(record, "createdAt"),
  };
}

/**
 * 校验人任务形状。
 */
function assertHumanTask(value: unknown): HumanTaskRecord {
  const record = asObject(value, "human task");
  const state = requireNonEmptyString(record, "state") as HumanTaskState;
  if (state !== "AVAILABLE" && state !== "ASSIGNED") {
    throw new Error("invalid human task record: state");
  }
  return {
    id: requireNonEmptyString(record, "id"),
    workId: requireNonEmptyString(record, "workId"),
    assigneePersonId: requireNonEmptyString(record, "assigneePersonId"),
    title: requireNonEmptyString(record, "title"),
    state,
    createdAt: requireNonEmptyString(record, "createdAt"),
  };
}

/**
 * 校验任务绑定形状。
 */
function assertTaskBinding(value: unknown): TaskBindingRecord {
  const record = asObject(value, "task binding");
  const mode = requireNonEmptyString(record, "mode") as BindingMode;
  if (mode !== "MANUAL" && mode !== "ASSISTED" && mode !== "AUTONOMOUS") {
    throw new Error("invalid task binding record: mode");
  }
  const state = requireNonEmptyString(record, "state") as BindingState;
  if (state !== "DRAFT" && state !== "ACTIVE" && state !== "REVOKED") {
    throw new Error("invalid task binding record: state");
  }
  const digitalEmployeeId =
    record.digitalEmployeeId === null || record.digitalEmployeeId === undefined
      ? null
      : requireNonEmptyString(record, "digitalEmployeeId");
  return {
    id: requireNonEmptyString(record, "id"),
    workId: requireNonEmptyString(record, "workId"),
    humanTaskId: requireNonEmptyString(record, "humanTaskId"),
    configuredBy: requireNonEmptyString(record, "configuredBy"),
    mode,
    digitalEmployeeId,
    state,
    responsibilityEpoch: requirePositiveInt(record, "responsibilityEpoch"),
    configVersion: requirePositiveInt(record, "configVersion"),
    createdAt: requireNonEmptyString(record, "createdAt"),
    updatedAt: requireNonEmptyString(record, "updatedAt"),
  };
}
