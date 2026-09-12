/**
 * 数字员工登记表：内存索引 + JSON 文件持久化。
 *
 * 启动时从磁盘回读；默认空仓，禁止内置假数据。
 * TRACE-digital-employees-20260912-重启可回读真实登记
 */
import { Injectable, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  loadEmployees,
  resolveStorePath,
  saveEmployees,
} from "./digital-employee.store";
import {
  DigitalEmployeeListResponse,
  DigitalEmployeeRecord,
} from "./digital-employee.types";

@Injectable()
export class DigitalEmployeeRegistry implements OnModuleInit {
  private readonly employees = new Map<string, DigitalEmployeeRecord>();
  private storePath: string;

  /**
   * 使用环境变量 ZKER_DATA_DIR（或默认 data/）初始化存储路径。
   */
  constructor() {
    this.storePath = resolveStorePath();
  }

  /**
   * 模块初始化时从磁盘加载已有登记。
   */
  onModuleInit(): void {
    this.reloadFromDisk();
  }

  /**
   * 测试辅助：切换存储文件并清空内存索引。
   *
   * Args:
   *   storePath: 目标 JSON 文件路径。
   */
  useStorePathForTest(storePath: string): void {
    this.storePath = storePath;
    this.employees.clear();
  }

  /**
   * 从磁盘重新装载内存索引。
   *
   * Returns:
   *   number: 装载条数。
   */
  reloadFromDisk(): number {
    const records = loadEmployees(this.storePath);
    this.employees.clear();
    for (const record of records) {
      this.employees.set(record.id, record);
    }
    return this.employees.size;
  }

  /**
   * 列出全部已登记数字员工。
   *
   * Returns:
   *   DigitalEmployeeListResponse: items 与 total；无登记时 total=0。
   */
  list(): DigitalEmployeeListResponse {
    const items = Array.from(this.employees.values()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    return { items, total: items.length };
  }

  /**
   * 按名称创建并持久化一名数字员工。
   *
   * Args:
   *   name: 员工显示名（已 trim）。
   *
   * Returns:
   *   DigitalEmployeeRecord: 新建记录。
   *
   * Raises:
   *   Error: 当名称为空时抛出。
   *
   * Examples:
   *   >>> registry.create("doc-writer")
   */
  create(name: string): DigitalEmployeeRecord {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error("digital employee name is required");
    }
    const record: DigitalEmployeeRecord = {
      id: randomUUID(),
      name: trimmed,
      createdAt: new Date().toISOString(),
    };
    return this.register(record);
  }

  /**
   * 登记一名数字员工并落盘。
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
    this.persist();
    return record;
  }

  /**
   * 将当前内存索引写入磁盘。
   */
  private persist(): void {
    saveEmployees(this.storePath, Array.from(this.employees.values()));
  }
}
