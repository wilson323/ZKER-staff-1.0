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

export interface DigitalEmployeeListResponse {
  items: Array<{ id: string; name: string; createdAt: string }>;
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
