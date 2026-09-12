/**
 * 数字员工 JSON 文件存储。
 *
 * 使用本地文件作为 M0+ 最小持久化，禁止 SQLite/mock；
 * 路径由 ZKER_DATA_DIR 控制，默认 <cwd>/data。
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { DigitalEmployeeRecord } from "./digital-employee.types";

const STORE_FILENAME = "digital-employees.json";

/**
 * 解析数据目录绝对路径。
 *
 * Returns:
 *   string: 数据目录路径。
 */
export function resolveDataDir(): string {
  const configured = process.env.ZKER_DATA_DIR?.trim();
  if (configured) {
    return configured;
  }
  return join(process.cwd(), "data");
}

/**
 * 解析登记文件路径。
 *
 * Args:
 *   dataDir: 可选数据目录；缺省走 resolveDataDir()。
 *
 * Returns:
 *   string: JSON 文件绝对路径。
 */
export function resolveStorePath(dataDir?: string): string {
  return join(dataDir ?? resolveDataDir(), STORE_FILENAME);
}

/**
 * 从磁盘加载数字员工列表；文件不存在时返回空数组。
 *
 * Args:
 *   storePath: JSON 文件路径。
 *
 * Returns:
 *   DigitalEmployeeRecord[]: 已持久化记录。
 *
 * Raises:
 *   Error: 当文件存在但 JSON 非法时抛出。
 */
export function loadEmployees(storePath: string): DigitalEmployeeRecord[] {
  if (!existsSync(storePath)) {
    return [];
  }
  const raw = readFileSync(storePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`invalid digital-employees store: expected array at ${storePath}`);
  }
  return parsed.map((item) => assertRecord(item));
}

/**
 * 原子写入数字员工列表到磁盘。
 *
 * Args:
 *   storePath: JSON 文件路径。
 *   employees: 待持久化记录。
 */
export function saveEmployees(
  storePath: string,
  employees: DigitalEmployeeRecord[],
): void {
  const dir = join(storePath, "..");
  mkdirSync(dir, { recursive: true });
  const tempPath = `${storePath}.${process.pid}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(employees, null, 2)}\n`, "utf8");
  renameSync(tempPath, storePath);
}

/**
 * 校验单条登记记录形状。
 *
 * Args:
 *   value: 未知输入。
 *
 * Returns:
 *   DigitalEmployeeRecord: 合法记录。
 *
 * Raises:
 *   Error: 字段缺失或类型错误。
 */
function assertRecord(value: unknown): DigitalEmployeeRecord {
  if (value === null || typeof value !== "object") {
    throw new Error("invalid digital employee record: not an object");
  }
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || record.id.trim() === "") {
    throw new Error("invalid digital employee record: id");
  }
  if (typeof record.name !== "string" || record.name.trim() === "") {
    throw new Error("invalid digital employee record: name");
  }
  if (typeof record.createdAt !== "string" || record.createdAt.trim() === "") {
    throw new Error("invalid digital employee record: createdAt");
  }
  return {
    id: record.id,
    name: record.name,
    createdAt: record.createdAt,
  };
}
