/**
 * 工作流登记表：工作项、人任务、任务绑定的内存索引 + JSON 持久化。
 *
 * 绑定 ASSISTED/AUTONOMOUS 时校验数字员工真实存在。
 * TRACE-workflow-20260912-绑定前校验员工存在
 */
import { Injectable, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "crypto";
import { DigitalEmployeeRegistry } from "../digital-employees/digital-employee.registry";
import {
  loadHumanTasks,
  loadTaskBindings,
  loadWorkItems,
  resolveWorkflowStorePaths,
  saveHumanTasks,
  saveTaskBindings,
  saveWorkItems,
} from "./workflow.store";
import {
  BindingMode,
  CreateHumanTaskRequest,
  CreateTaskBindingRequest,
  CreateWorkItemRequest,
  HumanTaskRecord,
  ListResponse,
  TaskBindingRecord,
  WorkItemRecord,
} from "./workflow.types";

@Injectable()
export class WorkflowRegistry implements OnModuleInit {
  private readonly workItems = new Map<string, WorkItemRecord>();
  private readonly humanTasks = new Map<string, HumanTaskRecord>();
  private readonly bindings = new Map<string, TaskBindingRecord>();
  private paths = resolveWorkflowStorePaths();

  /**
   * 注入数字员工登记表以做真实存在性校验。
   *
   * Args:
   *   digitalEmployees: 已持久化的员工登记服务。
   */
  constructor(private readonly digitalEmployees: DigitalEmployeeRegistry) {}

  /**
   * 启动时从磁盘回读三类记录。
   */
  onModuleInit(): void {
    this.reloadFromDisk();
  }

  /**
   * 测试辅助：切换数据目录并清空内存。
   *
   * Args:
   *   dataDir: 临时数据目录。
   */
  useDataDirForTest(dataDir: string): void {
    this.paths = resolveWorkflowStorePaths(dataDir);
    this.workItems.clear();
    this.humanTasks.clear();
    this.bindings.clear();
  }

  /**
   * 从磁盘重新装载。
   *
   * Returns:
   *   三类记录条数。
   */
  reloadFromDisk(): {
    workItems: number;
    humanTasks: number;
    bindings: number;
  } {
    this.workItems.clear();
    this.humanTasks.clear();
    this.bindings.clear();
    for (const item of loadWorkItems(this.paths.workItems)) {
      this.workItems.set(item.id, item);
    }
    for (const item of loadHumanTasks(this.paths.humanTasks)) {
      this.humanTasks.set(item.id, item);
    }
    for (const item of loadTaskBindings(this.paths.taskBindings)) {
      this.bindings.set(item.id, item);
    }
    return {
      workItems: this.workItems.size,
      humanTasks: this.humanTasks.size,
      bindings: this.bindings.size,
    };
  }

  /**
   * 列出工作项。
   */
  listWorkItems(): ListResponse<WorkItemRecord> {
    const items = Array.from(this.workItems.values()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    return { items, total: items.length };
  }

  /**
   * 创建工作项并落盘。
   *
   * Args:
   *   request: 含 title。
   *
   * Returns:
   *   WorkItemRecord
   */
  createWorkItem(request: CreateWorkItemRequest): WorkItemRecord {
    const title = request.title?.trim() ?? "";
    if (!title) {
      throw new Error("work item title is required");
    }
    const record: WorkItemRecord = {
      id: randomUUID(),
      title,
      createdAt: new Date().toISOString(),
    };
    this.workItems.set(record.id, record);
    this.persistWorkItems();
    return record;
  }

  /**
   * 列出人任务。
   */
  listHumanTasks(): ListResponse<HumanTaskRecord> {
    const items = Array.from(this.humanTasks.values()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    return { items, total: items.length };
  }

  /**
   * 创建人任务并落盘。
   *
   * Args:
   *   request: workId / assigneePersonId / title。
   *
   * Returns:
   *   HumanTaskRecord
   */
  createHumanTask(request: CreateHumanTaskRequest): HumanTaskRecord {
    const workId = request.workId?.trim() ?? "";
    const assigneePersonId = request.assigneePersonId?.trim() ?? "";
    const title = request.title?.trim() ?? "";
    if (!workId) {
      throw new Error("workId is required");
    }
    if (!this.workItems.has(workId)) {
      throw new Error(`work item not found: ${workId}`);
    }
    if (!assigneePersonId) {
      throw new Error("assigneePersonId is required");
    }
    if (!title) {
      throw new Error("human task title is required");
    }
    const record: HumanTaskRecord = {
      id: randomUUID(),
      workId,
      assigneePersonId,
      title,
      state: "ASSIGNED",
      createdAt: new Date().toISOString(),
    };
    this.humanTasks.set(record.id, record);
    this.persistHumanTasks();
    return record;
  }

  /**
   * 列出任务绑定。
   */
  listBindings(): ListResponse<TaskBindingRecord> {
    const items = Array.from(this.bindings.values()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    return { items, total: items.length };
  }

  /**
   * 按 id 读取绑定。
   *
   * Args:
   *   id: 绑定 id。
   *
   * Returns:
   *   TaskBindingRecord | undefined
   */
  getBinding(id: string): TaskBindingRecord | undefined {
    return this.bindings.get(id);
  }

  /**
   * 创建任务绑定并落盘。
   *
   * Args:
   *   request: 人/任务/模式/可选员工。
   *
   * Returns:
   *   TaskBindingRecord
   *
   * Raises:
   *   Error: 校验失败。
   */
  createBinding(request: CreateTaskBindingRequest): TaskBindingRecord {
    const workId = request.workId?.trim() ?? "";
    const humanTaskId = request.humanTaskId?.trim() ?? "";
    const configuredBy = request.configuredBy?.trim() ?? "";
    const mode = request.mode;
    const epoch = request.responsibilityEpoch ?? 1;
    if (!workId) {
      throw new Error("workId is required");
    }
    if (!humanTaskId) {
      throw new Error("humanTaskId is required");
    }
    if (!configuredBy) {
      throw new Error("configuredBy is required");
    }
    if (!isBindingMode(mode)) {
      throw new Error("mode must be MANUAL, ASSISTED or AUTONOMOUS");
    }
    if (!Number.isInteger(epoch) || epoch < 1) {
      throw new Error("responsibilityEpoch must be a positive integer");
    }
    if (!this.workItems.has(workId)) {
      throw new Error(`work item not found: ${workId}`);
    }
    const humanTask = this.humanTasks.get(humanTaskId);
    if (!humanTask) {
      throw new Error(`human task not found: ${humanTaskId}`);
    }
    if (humanTask.workId !== workId) {
      throw new Error("humanTask does not belong to workId");
    }

    const digitalEmployeeId = normalizeOptionalId(request.digitalEmployeeId);
    if (mode === "MANUAL") {
      if (digitalEmployeeId) {
        throw new Error("MANUAL mode must not bind a digital employee");
      }
    } else {
      if (!digitalEmployeeId) {
        throw new Error("digitalEmployeeId is required for ASSISTED/AUTONOMOUS");
      }
      const employees = this.digitalEmployees.list().items;
      if (!employees.some((item) => item.id === digitalEmployeeId)) {
        throw new Error(`digital employee not found: ${digitalEmployeeId}`);
      }
    }

    const conflictKey = `${humanTaskId}:${epoch}`;
    for (const existing of this.bindings.values()) {
      if (
        existing.humanTaskId === humanTaskId &&
        existing.responsibilityEpoch === epoch &&
        existing.state !== "REVOKED"
      ) {
        throw new Error(
          `binding already exists for humanTask/epoch: ${conflictKey}`,
        );
      }
    }

    const now = new Date().toISOString();
    const record: TaskBindingRecord = {
      id: randomUUID(),
      workId,
      humanTaskId,
      configuredBy,
      mode,
      digitalEmployeeId,
      state: "ACTIVE",
      responsibilityEpoch: epoch,
      configVersion: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.bindings.set(record.id, record);
    this.persistBindings();
    return record;
  }

  /**
   * 落盘工作项。
   */
  private persistWorkItems(): void {
    saveWorkItems(this.paths.workItems, Array.from(this.workItems.values()));
  }

  /**
   * 落盘人任务。
   */
  private persistHumanTasks(): void {
    saveHumanTasks(this.paths.humanTasks, Array.from(this.humanTasks.values()));
  }

  /**
   * 落盘绑定。
   */
  private persistBindings(): void {
    saveTaskBindings(
      this.paths.taskBindings,
      Array.from(this.bindings.values()),
    );
  }
}

/**
 * 判断是否为合法绑定模式。
 */
function isBindingMode(value: unknown): value is BindingMode {
  return value === "MANUAL" || value === "ASSISTED" || value === "AUTONOMOUS";
}

/**
 * 规范化可选 id；空串视为 null。
 */
function normalizeOptionalId(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
