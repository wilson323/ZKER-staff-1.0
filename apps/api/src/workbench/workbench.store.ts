/**
 * 双实例工作台 JSON 文件存储。
 *
 * 禁止 SQLite 与 mock；路径复用 ZKER_DATA_DIR。
 * TRACE-workbench-20260912-双实例落盘隔离
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { resolveDataDir } from "../digital-employees/digital-employee.store";
import {
  ProcessInstanceRecord,
  ProcessInstanceState,
  ProcessTemplateRecord,
  WorkbenchTodoRecord,
} from "./workbench.types";

const TEMPLATES_FILE = "process-templates.json";
const INSTANCES_FILE = "process-instances.json";
const TODOS_FILE = "workbench-todos.json";

/**
 * 解析工作台三类存储路径。
 *
 * Args:
 *   dataDir: 可选数据目录。
 *
 * Returns:
 *   三类 JSON 绝对路径。
 */
export function resolveWorkbenchStorePaths(dataDir?: string): {
  templates: string;
  instances: string;
  todos: string;
} {
  const root = dataDir ?? resolveDataDir();
  return {
    templates: join(root, TEMPLATES_FILE),
    instances: join(root, INSTANCES_FILE),
    todos: join(root, TODOS_FILE),
  };
}

/**
 * 读取 JSON 数组；缺失文件返回空数组。
 *
 * Args:
 *   storePath: 文件路径。
 *   label: 错误标签。
 *
 * Returns:
 *   unknown[]
 */
function loadArray(storePath: string, label: string): unknown[] {
  if (!existsSync(storePath)) {
    return [];
  }
  const parsed = JSON.parse(readFileSync(storePath, "utf8")) as unknown;
  if (!Array.isArray(parsed)) {
    throw new TypeError(
      `invalid ${label} store: expected array at ${storePath}`,
    );
  }
  return parsed;
}

/**
 * 原子写入 JSON 数组。
 *
 * Args:
 *   storePath: 目标路径。
 *   records: 待写入对象列表。
 */
function saveArray(storePath: string, records: unknown[]): void {
  mkdirSync(join(storePath, ".."), { recursive: true });
  const tempPath = `${storePath}.${process.pid}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  renameSync(tempPath, storePath);
}

/**
 * 加载已发布模板。
 */
export function loadTemplates(storePath: string): ProcessTemplateRecord[] {
  return loadArray(storePath, "process-templates").map((item) =>
    assertTemplate(item),
  );
}

/**
 * 保存模板列表。
 */
export function saveTemplates(
  storePath: string,
  items: ProcessTemplateRecord[],
): void {
  saveArray(storePath, items);
}

/**
 * 加载流程实例。
 */
export function loadInstances(storePath: string): ProcessInstanceRecord[] {
  return loadArray(storePath, "process-instances").map((item) =>
    assertInstance(item),
  );
}

/**
 * 保存流程实例。
 */
export function saveInstances(
  storePath: string,
  items: ProcessInstanceRecord[],
): void {
  saveArray(storePath, items);
}

/**
 * 加载待办。
 */
export function loadTodos(storePath: string): WorkbenchTodoRecord[] {
  return loadArray(storePath, "workbench-todos").map((item) =>
    assertTodo(item),
  );
}

/**
 * 保存待办。
 */
export function saveTodos(
  storePath: string,
  items: WorkbenchTodoRecord[],
): void {
  saveArray(storePath, items);
}

/**
 * 校验模板形状。
 */
function assertTemplate(value: unknown): ProcessTemplateRecord {
  const record = asObject(value, "process template");
  return {
    id: requireNonEmptyString(record, "id"),
    code: requireNonEmptyString(record, "code"),
    title: requireNonEmptyString(record, "title"),
    published: requireBoolean(record, "published"),
    createdAt: requireNonEmptyString(record, "createdAt"),
  };
}

/**
 * 校验实例形状。
 */
function assertInstance(value: unknown): ProcessInstanceRecord {
  const record = asObject(value, "process instance");
  const state = requireNonEmptyString(record, "state") as ProcessInstanceState;
  if (state !== "OPEN" && state !== "CLOSED") {
    throw new Error("invalid process instance record: state");
  }
  return {
    id: requireNonEmptyString(record, "id"),
    templateId: requireNonEmptyString(record, "templateId"),
    tenantId: requireNonEmptyString(record, "tenantId"),
    initiatorPersonId: requireNonEmptyString(record, "initiatorPersonId"),
    title: requireNonEmptyString(record, "title"),
    idempotencyKey: requireNonEmptyString(record, "idempotencyKey"),
    intentKey: requireNonEmptyString(record, "intentKey"),
    state,
    draft: requireStringAllowEmpty(record, "draft"),
    threadId: requireNonEmptyString(record, "threadId"),
    configId: requireNonEmptyString(record, "configId"),
    urlPath: requireNonEmptyString(record, "urlPath"),
    createdAt: requireNonEmptyString(record, "createdAt"),
    updatedAt: requireNonEmptyString(record, "updatedAt"),
  };
}

/**
 * 校验待办形状。
 */
function assertTodo(value: unknown): WorkbenchTodoRecord {
  const record = asObject(value, "workbench todo");
  return {
    id: requireNonEmptyString(record, "id"),
    instanceId: requireNonEmptyString(record, "instanceId"),
    tenantId: requireNonEmptyString(record, "tenantId"),
    assigneePersonId: requireNonEmptyString(record, "assigneePersonId"),
    title: requireNonEmptyString(record, "title"),
    createdAt: requireNonEmptyString(record, "createdAt"),
  };
}

/**
 * 将未知值转为普通对象。
 */
function asObject(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    throw new Error(`invalid ${label} record: not an object`);
  }
  return value as Record<string, unknown>;
}

/**
 * 读取非空字符串字段。
 */
function requireNonEmptyString(
  record: Record<string, unknown>,
  key: string,
): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`invalid record: ${key}`);
  }
  return value;
}

/**
 * 读取允许空串的字符串字段。
 */
function requireStringAllowEmpty(
  record: Record<string, unknown>,
  key: string,
): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new Error(`invalid record: ${key}`);
  }
  return value;
}

/**
 * 读取布尔字段。
 */
function requireBoolean(
  record: Record<string, unknown>,
  key: string,
): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new Error(`invalid record: ${key}`);
  }
  return value;
}
