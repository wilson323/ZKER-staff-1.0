/**
 * M1-02 领取配置领域规则辅助。
 */
import { DigitalEmployeeRegistry } from "../digital-employees/digital-employee.registry";
import { PersonConfigMode } from "./claim.types";

/**
 * 规范化可选员工 id。
 *
 * Args:
 *   value: 原始可选 id。
 *
 * Returns:
 *   去空白后的 id 或 null。
 */
export function normalizeOptionalId(
  value: string | null | undefined,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * 按模式校验数字员工是否真实存在。
 *
 * Args:
 *   mode: 执行模式。
 *   digitalEmployeeId: 可选员工 id。
 *   digitalEmployees: 员工登记表。
 *
 * Raises:
 *   Error: 模式与员工引用不合法时抛出。
 */
export function assertEmployeeForMode(
  mode: PersonConfigMode,
  digitalEmployeeId: string | null,
  digitalEmployees: DigitalEmployeeRegistry,
): void {
  if (mode === "MANUAL") {
    if (digitalEmployeeId) {
      throw new Error("MANUAL mode forbids digitalEmployeeId");
    }
    return;
  }
  if (!digitalEmployeeId) {
    throw new Error(`${mode} mode requires digitalEmployeeId`);
  }
  const found = digitalEmployees
    .list()
    .items.some((item) => item.id === digitalEmployeeId);
  if (!found) {
    throw new Error(`digital employee not found: ${digitalEmployeeId}`);
  }
}
