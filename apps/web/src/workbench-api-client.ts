/**
 * M1-01 双实例工作台 API 客户端：会话头派生主体，禁 mock。
 */

/** 通用列表响应。 */
export interface ListResponse<T> {
  items: T[];
  total: number;
}

/** 工作台会话（由请求头派生）。 */
export interface WorkbenchSession {
  tenantId: string;
  personId: string;
}

/** 已发布流程模板。 */
export interface ProcessTemplateRecord {
  id: string;
  code: string;
  title: string;
  published: boolean;
  createdAt: string;
}

/** 流程实例。 */
export interface ProcessInstanceRecord {
  id: string;
  templateId: string;
  tenantId: string;
  initiatorPersonId: string;
  title: string;
  idempotencyKey: string;
  intentKey: string;
  state: string;
  draft: string;
  threadId: string;
  configId: string;
  urlPath: string;
  createdAt: string;
  updatedAt: string;
}

/** 工作台待办。 */
export interface WorkbenchTodoRecord {
  id: string;
  instanceId: string;
  tenantId: string;
  assigneePersonId: string;
  title: string;
  createdAt: string;
}

/**
 * 组装工作台会话请求头。
 *
 * Args:
 *   session: 租户与人员。
 *
 * Returns:
 *   HeadersInit
 */
export function workbenchHeaders(session: WorkbenchSession): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Tenant-Id": session.tenantId,
    "X-Person-Id": session.personId,
  };
}

/**
 * 带会话头的 GET JSON。
 */
async function fetchWithSession<T>(
  path: string,
  session: WorkbenchSession,
  label: string,
  baseUrl = "/api/v1",
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: workbenchHeaders(session),
  });
  if (!response.ok) {
    throw new Error(`${label} request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

/**
 * 带会话头的 JSON 写请求。
 */
async function writeWithSession<T>(
  path: string,
  method: "POST" | "PUT",
  session: WorkbenchSession,
  body: unknown,
  label: string,
  baseUrl = "/api/v1",
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: workbenchHeaders(session),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${label} failed: ${response.status} ${detail}`);
  }
  return (await response.json()) as T;
}

/**
 * 读取当前会话回显。
 */
export async function fetchWorkbenchSession(
  session: WorkbenchSession,
  baseUrl = "/api/v1",
): Promise<WorkbenchSession> {
  return fetchWithSession<WorkbenchSession>(
    "/workbench/session",
    session,
    "workbench session",
    baseUrl,
  );
}

/**
 * 拉取已发布模板。
 */
export async function fetchWorkbenchTemplates(
  session: WorkbenchSession,
  baseUrl = "/api/v1",
): Promise<ListResponse<ProcessTemplateRecord>> {
  return fetchWithSession<ListResponse<ProcessTemplateRecord>>(
    "/workbench/templates",
    session,
    "workbench templates",
    baseUrl,
  );
}

/**
 * 确保已发布模板存在。
 */
export async function ensureWorkbenchTemplate(
  session: WorkbenchSession,
  input: { code: string; title: string },
  baseUrl = "/api/v1",
): Promise<ProcessTemplateRecord> {
  return writeWithSession<ProcessTemplateRecord>(
    "/workbench/templates",
    "POST",
    session,
    input,
    "ensure workbench template",
    baseUrl,
  );
}

/**
 * 拉取租户内实例列表。
 */
export async function fetchWorkbenchInstances(
  session: WorkbenchSession,
  baseUrl = "/api/v1",
): Promise<ListResponse<ProcessInstanceRecord>> {
  return fetchWithSession<ListResponse<ProcessInstanceRecord>>(
    "/workbench/instances",
    session,
    "workbench instances",
    baseUrl,
  );
}

/**
 * 发起或回放流程实例。
 */
export async function createWorkbenchInstance(
  session: WorkbenchSession,
  input: {
    templateId: string;
    title: string;
    idempotencyKey: string;
    intentKey: string;
  },
  baseUrl = "/api/v1",
): Promise<ProcessInstanceRecord> {
  return writeWithSession<ProcessInstanceRecord>(
    "/workbench/instances",
    "POST",
    session,
    input,
    "create workbench instance",
    baseUrl,
  );
}

/**
 * 读取单个实例详情。
 */
export async function fetchWorkbenchInstance(
  session: WorkbenchSession,
  id: string,
  baseUrl = "/api/v1",
): Promise<ProcessInstanceRecord> {
  return fetchWithSession<ProcessInstanceRecord>(
    `/workbench/instances/${id}`,
    session,
    "workbench instance",
    baseUrl,
  );
}

/**
 * 保存实例私有草稿。
 */
export async function saveWorkbenchDraft(
  session: WorkbenchSession,
  id: string,
  draft: string,
  baseUrl = "/api/v1",
): Promise<ProcessInstanceRecord> {
  return writeWithSession<ProcessInstanceRecord>(
    `/workbench/instances/${id}/draft`,
    "PUT",
    session,
    { draft },
    "save workbench draft",
    baseUrl,
  );
}

/**
 * 拉取本人待办。
 */
export async function fetchWorkbenchTodos(
  session: WorkbenchSession,
  baseUrl = "/api/v1",
): Promise<ListResponse<WorkbenchTodoRecord>> {
  return fetchWithSession<ListResponse<WorkbenchTodoRecord>>(
    "/workbench/todos",
    session,
    "workbench todos",
    baseUrl,
  );
}
