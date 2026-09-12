/**
 * 工作台会话解析：从请求头派生租户与人员，禁止信任正文主体。
 *
 * Headers:
 *   X-Tenant-Id / X-Person-Id
 */
import { UnauthorizedException } from "@nestjs/common";
import { WorkbenchSession } from "./workbench.types";

export const HEADER_TENANT = "x-tenant-id";
export const HEADER_PERSON = "x-person-id";

/**
 * 自请求头解析会话；缺失或空值视为未授权。
 *
 * Args:
 *   headers: 原始请求头映射（键已小写或任意大小写）。
 *
 * Returns:
 *   WorkbenchSession
 *
 * Raises:
 *   UnauthorizedException: 会话头缺失。
 *
 * Examples:
 *   >>> resolveSessionFromHeaders({ "x-tenant-id": "t1", "x-person-id": "p1" })
 */
export function resolveSessionFromHeaders(
  headers: Record<string, string | string[] | undefined>,
): WorkbenchSession {
  const tenantId = readHeader(headers, HEADER_TENANT);
  const personId = readHeader(headers, HEADER_PERSON);
  if (!tenantId || !personId) {
    throw new UnauthorizedException(
      "session requires X-Tenant-Id and X-Person-Id headers",
    );
  }
  return { tenantId, personId };
}

/**
 * 读取单个请求头并规范化。
 *
 * Args:
 *   headers: 请求头。
 *   name: 小写头名。
 *
 * Returns:
 *   非空字符串或 null。
 */
function readHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | null {
  const raw = headers[name] ?? headers[name.toUpperCase()];
  if (raw === undefined || raw === null) {
    return null;
  }
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
