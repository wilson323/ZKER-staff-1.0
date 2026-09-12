/**
 * 双实例工作台 JSON 文件存储。
 *
 * 禁止 SQLite 与 mock；路径复用 ZKER_DATA_DIR。
 * TRACE-workbench-20260912-双实例落盘隔离
 */
import { join } from "node:path";
import {
  asObject,
  loadJsonArray,
  requireBoolean,
  requireNonEmptyString,
  requireStringAllowEmpty,
  saveJsonArray,
} from "../common/json-array-store";
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
 * 加载已发布模板。
 */
export function loadTemplates(storePath: string): ProcessTemplateRecord[] {
  return loadJsonArray(storePath, "process-templates").map((item) =>
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
  saveJsonArray(storePath, items);
}

/**
 * 加载流程实例。
 */
export function loadInstances(storePath: string): ProcessInstanceRecord[] {
  return loadJsonArray(storePath, "process-instances").map((item) =>
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
  saveJsonArray(storePath, items);
}

/**
 * 加载待办。
 */
export function loadTodos(storePath: string): WorkbenchTodoRecord[] {
  return loadJsonArray(storePath, "workbench-todos").map((item) =>
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
  saveJsonArray(storePath, items);
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
