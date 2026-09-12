/**
 * 数字员工登记表：进程内权威存储。
 *
 * M0 启动时为空；仅通过显式登记写入，禁止内置假数据。
 */
import { Injectable } from "@nestjs/common";
import {
  DigitalEmployeeListResponse,
  DigitalEmployeeRecord,
} from "./digital-employee.types";

@Injectable()
export class DigitalEmployeeRegistry {
  private readonly employees = new Map<string, DigitalEmployeeRecord>();

  /**
   * 列出全部已登记数字员工。
   *
   * Returns:
   *   DigitalEmployeeListResponse: items 与 total；无登记时 total=0。
   */
  list(): DigitalEmployeeListResponse {
    const items = Array.from(this.employees.values());
    return { items, total: items.length };
  }

  /**
   * 登记一名数字员工（供后续真实写入路径使用）。
   *
   * Args:
   *   record: 已校验的员工记录。
   *
   * Returns:
   *   DigitalEmployeeRecord: 写入后的记录。
   *
   * Raises:
   *   Error: 当 id 已存在时抛出。
   */
  register(record: DigitalEmployeeRecord): DigitalEmployeeRecord {
    if (this.employees.has(record.id)) {
      throw new Error(`digital employee already exists: ${record.id}`);
    }
    this.employees.set(record.id, record);
    return record;
  }
}
