/**
 * 共享 JSON 数组落盘与字段校验（消除 store 间重复）。
 *
 * TRACE-common-20260912-json-array-store-dedup
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

/**
 * 读取 JSON 数组；缺失文件返回空数组。
 *
 * Args:
 *   storePath: 文件路径。
 *   label: 错误标签。
 *
 * Returns:
 *   unknown[]: 原始数组。
 */
export function loadJsonArray(storePath: string, label: string): unknown[] {
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
export function saveJsonArray(storePath: string, records: unknown[]): void {
  mkdirSync(join(storePath, ".."), { recursive: true });
  const tempPath = `${storePath}.${process.pid}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  renameSync(tempPath, storePath);
}

/**
 * 将未知值转为普通对象。
 *
 * Args:
 *   value: 待校验值。
 *   label: 错误标签。
 *
 * Returns:
 *   Record<string, unknown>
 */
export function asObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    throw new Error(`invalid ${label} record: not an object`);
  }
  return value as Record<string, unknown>;
}

/**
 * 读取非空字符串字段。
 *
 * Args:
 *   record: 对象记录。
 *   key: 字段名。
 *
 * Returns:
 *   string
 */
export function requireNonEmptyString(
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
 *
 * Args:
 *   record: 对象记录。
 *   key: 字段名。
 *
 * Returns:
 *   string
 */
export function requireStringAllowEmpty(
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
 * 读取非负整数字段。
 *
 * Args:
 *   record: 对象记录。
 *   key: 字段名。
 *
 * Returns:
 *   number
 */
export function requireNonNegativeInt(
  record: Record<string, unknown>,
  key: string,
): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`invalid record: ${key}`);
  }
  return value;
}

/**
 * 读取正整数字段（≥1）。
 *
 * Args:
 *   record: 对象记录。
 *   key: 字段名。
 *
 * Returns:
 *   number
 */
export function requirePositiveInt(
  record: Record<string, unknown>,
  key: string,
): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`invalid record: ${key}`);
  }
  return value;
}

/**
 * 读取布尔字段。
 *
 * Args:
 *   record: 对象记录。
 *   key: 字段名。
 *
 * Returns:
 *   boolean
 */
export function requireBoolean(
  record: Record<string, unknown>,
  key: string,
): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new Error(`invalid record: ${key}`);
  }
  return value;
}
