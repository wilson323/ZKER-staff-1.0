/**
 * API 客户端：只请求真实后端，不做业务假数据兜底。
 */

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
}

export interface DigitalEmployeeRecord {
  id: string;
  name: string;
  createdAt: string;
}

export interface DigitalEmployeeListResponse {
  items: DigitalEmployeeRecord[];
  total: number;
}

export interface AiProbeResult {
  ok: boolean;
  provider: string;
  configured: boolean;
  message: string;
  model?: string;
}

export type BindingMode = "MANUAL" | "ASSISTED" | "AUTONOMOUS";

export interface WorkItemRecord {
  id: string;
  title: string;
  createdAt: string;
}

export interface HumanTaskRecord {
  id: string;
  workId: string;
  assigneePersonId: string;
  title: string;
  state: string;
  createdAt: string;
}

export interface TaskBindingRecord {
  id: string;
  workId: string;
  humanTaskId: string;
  configuredBy: string;
  mode: BindingMode;
  digitalEmployeeId: string | null;
  state: string;
  responsibilityEpoch: number;
  configVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
}

/**
 * 拉取健康检查。
 *
 * Args:
 *   baseUrl: API 前缀，默认 `/api/v1`。
 *
 * Returns:
 *   Promise<HealthStatus>
 *
 * Raises:
 *   Error: 当 HTTP 非 2xx 时抛出。
 */
export async function fetchHealth(
  baseUrl = "/api/v1",
): Promise<HealthStatus> {
  const response = await fetch(`${baseUrl}/health`);
  if (!response.ok) {
    throw new Error(`health request failed: ${response.status}`);
  }
  return (await response.json()) as HealthStatus;
}

/**
 * 拉取数字员工列表。
 *
 * Args:
 *   baseUrl: API 前缀。
 *
 * Returns:
 *   Promise<DigitalEmployeeListResponse>
 */
export async function fetchDigitalEmployees(
  baseUrl = "/api/v1",
): Promise<DigitalEmployeeListResponse> {
  const response = await fetch(`${baseUrl}/digital-employees`);
  if (!response.ok) {
    throw new Error(`digital-employees request failed: ${response.status}`);
  }
  return (await response.json()) as DigitalEmployeeListResponse;
}

/**
 * 创建数字员工（真实 POST，服务端持久化）。
 *
 * Args:
 *   name: 员工显示名。
 *   baseUrl: API 前缀。
 *
 * Returns:
 *   Promise<DigitalEmployeeRecord>
 *
 * Raises:
 *   Error: 当 HTTP 非 2xx 时抛出。
 */
export async function createDigitalEmployee(
  name: string,
  baseUrl = "/api/v1",
): Promise<DigitalEmployeeRecord> {
  const response = await fetch(`${baseUrl}/digital-employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `create digital-employee failed: ${response.status} ${detail}`,
    );
  }
  return (await response.json()) as DigitalEmployeeRecord;
}

/**
 * 探测 AI 适配器状态。
 *
 * Args:
 *   baseUrl: API 前缀。
 *
 * Returns:
 *   Promise<AiProbeResult>
 */
export async function fetchAiProbe(
  baseUrl = "/api/v1",
): Promise<AiProbeResult> {
  const response = await fetch(`${baseUrl}/ai/probe`);
  if (!response.ok) {
    throw new Error(`ai probe request failed: ${response.status}`);
  }
  return (await response.json()) as AiProbeResult;
}

/**
 * 读取 JSON 列表响应；非 2xx 抛错。
 *
 * Args:
 *   path: API 相对路径。
 *   label: 错误标签。
 *   baseUrl: API 前缀。
 *
 * Returns:
 *   Promise<ListResponse<T>>
 */
async function fetchList<T>(
  path: string,
  label: string,
  baseUrl = "/api/v1",
): Promise<ListResponse<T>> {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`${label} request failed: ${response.status}`);
  }
  return (await response.json()) as ListResponse<T>;
}

/**
 * POST JSON 并返回创建结果。
 *
 * Args:
 *   path: API 相对路径。
 *   body: 请求体。
 *   label: 错误标签。
 *   baseUrl: API 前缀。
 *
 * Returns:
 *   Promise<T>
 */
async function postJson<T>(
  path: string,
  body: unknown,
  label: string,
  baseUrl = "/api/v1",
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${label} failed: ${response.status} ${detail}`);
  }
  return (await response.json()) as T;
}

/**
 * 拉取工作项列表。
 */
export async function fetchWorkItems(
  baseUrl = "/api/v1",
): Promise<ListResponse<WorkItemRecord>> {
  return fetchList<WorkItemRecord>("/work-items", "work-items", baseUrl);
}

/**
 * 创建工作项。
 */
export async function createWorkItem(
  title: string,
  baseUrl = "/api/v1",
): Promise<WorkItemRecord> {
  return postJson<WorkItemRecord>(
    "/work-items",
    { title },
    "create work-item",
    baseUrl,
  );
}

/**
 * 拉取人任务列表。
 */
export async function fetchHumanTasks(
  baseUrl = "/api/v1",
): Promise<ListResponse<HumanTaskRecord>> {
  return fetchList<HumanTaskRecord>("/human-tasks", "human-tasks", baseUrl);
}

/**
 * 创建人任务。
 */
export async function createHumanTask(
  input: {
    workId: string;
    assigneePersonId: string;
    title: string;
  },
  baseUrl = "/api/v1",
): Promise<HumanTaskRecord> {
  return postJson<HumanTaskRecord>(
    "/human-tasks",
    input,
    "create human-task",
    baseUrl,
  );
}

/**
 * 拉取任务绑定列表。
 */
export async function fetchTaskBindings(
  baseUrl = "/api/v1",
): Promise<ListResponse<TaskBindingRecord>> {
  return fetchList<TaskBindingRecord>(
    "/task-bindings",
    "task-bindings",
    baseUrl,
  );
}

/**
 * 创建任务绑定（人 + 任务 + 可选数字员工）。
 */
export async function createTaskBinding(
  input: {
    workId: string;
    humanTaskId: string;
    configuredBy: string;
    mode: BindingMode;
    digitalEmployeeId?: string | null;
  },
  baseUrl = "/api/v1",
): Promise<TaskBindingRecord> {
  return postJson<TaskBindingRecord>(
    "/task-bindings",
    input,
    "create task-binding",
    baseUrl,
  );
}
