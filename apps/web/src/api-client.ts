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
