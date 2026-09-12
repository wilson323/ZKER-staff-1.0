/**
 * M1-02 领取 / 配置 / 转派登记表。
 *
 * C03：OPEN→CLAIMED 原子领取；并发后到者 409。
 * C04：保存配置核对 humanTaskId+workId+epoch+expectedRevision；不启动。
 * TRACE-claim-20260912-并发领取唯一成功
 */
import { Injectable, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DigitalEmployeeRegistry } from "../digital-employees/digital-employee.registry";
import {
  assertEmployeeForMode,
  normalizeOptionalId,
} from "./claim.rules";
import {
  loadClaimableTasks,
  loadPersonConfigs,
  resolveClaimStorePaths,
  saveClaimableTasks,
  savePersonConfigs,
} from "./claim.store";
import {
  ClaimableHumanTaskRecord,
  ClaimListResponse,
  PersonConfigRecord,
  SavePersonConfigRequest,
  TransferTaskRequest,
} from "./claim.types";
import { ProcessInstanceRecord, WorkbenchSession } from "./workbench.types";

const DEFAULT_OUTPUTS = ["交付摘要"];
const DEFAULT_BUDGET = 8000;

@Injectable()
export class ClaimRegistry implements OnModuleInit {
  private readonly tasks = new Map<string, ClaimableHumanTaskRecord>();
  private readonly configs = new Map<string, PersonConfigRecord>();
  private paths = resolveClaimStorePaths();

  /**
   * 注入数字员工登记表做真实存在性校验。
   */
  constructor(private readonly digitalEmployees: DigitalEmployeeRegistry) {}

  /**
   * 启动时从磁盘回读。
   */
  onModuleInit(): void {
    this.reloadFromDisk();
  }

  /**
   * 测试辅助：切换数据目录并清空内存。
   */
  useDataDirForTest(dataDir: string): void {
    this.paths = resolveClaimStorePaths(dataDir);
    this.tasks.clear();
    this.configs.clear();
  }

  /**
   * 从磁盘重新装载。
   */
  reloadFromDisk(): { tasks: number; configs: number } {
    this.tasks.clear();
    this.configs.clear();
    for (const item of loadClaimableTasks(this.paths.tasks)) {
      this.tasks.set(item.id, item);
    }
    for (const item of loadPersonConfigs(this.paths.configs)) {
      this.configs.set(item.id, item);
    }
    return { tasks: this.tasks.size, configs: this.configs.size };
  }

  /**
   * 为流程实例确保一条 OPEN 可领取任务（幂等回放不重复建）。
   */
  ensureOpenTaskForInstance(
    session: WorkbenchSession,
    instance: ProcessInstanceRecord,
  ): ClaimableHumanTaskRecord {
    for (const existing of this.tasks.values()) {
      if (
        existing.tenantId === session.tenantId &&
        existing.instanceId === instance.id
      ) {
        return existing;
      }
    }
    const now = new Date().toISOString();
    const record: ClaimableHumanTaskRecord = {
      id: randomUUID(),
      workId: instance.id,
      instanceId: instance.id,
      tenantId: session.tenantId,
      title: `领取：${instance.title}`,
      state: "OPEN",
      assigneePersonId: null,
      responsibilityEpoch: 0,
      revision: 0,
      requiredOutputs: [...DEFAULT_OUTPUTS],
      budgetTokens: DEFAULT_BUDGET,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(record.id, record);
    this.persistTasks();
    return record;
  }

  /**
   * 列出本租户可见的可领取/已领任务。
   */
  listTasksForSession(
    session: WorkbenchSession,
  ): ClaimListResponse<ClaimableHumanTaskRecord> {
    const items = Array.from(this.tasks.values())
      .filter((item) => item.tenantId === session.tenantId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { items, total: items.length };
  }

  /**
   * 读取任务；跨租户视为不存在。
   */
  getTaskForSession(
    session: WorkbenchSession,
    id: string,
  ): ClaimableHumanTaskRecord | undefined {
    const record = this.tasks.get(id);
    if (!record || record.tenantId !== session.tenantId) {
      return undefined;
    }
    return record;
  }

  /**
   * 原子领取：仅 OPEN 可领；已被他人领取 → already claimed。
   */
  claimTask(
    session: WorkbenchSession,
    taskId: string,
  ): ClaimableHumanTaskRecord {
    const task = this.requireTask(session, taskId);
    if (task.state === "CLAIMED") {
      if (task.assigneePersonId === session.personId) {
        return task;
      }
      throw new Error(
        `already claimed by ${task.assigneePersonId}: ${taskId}`,
      );
    }
    const now = new Date().toISOString();
    const updated: ClaimableHumanTaskRecord = {
      ...task,
      state: "CLAIMED",
      assigneePersonId: session.personId,
      revision: task.revision + 1,
      updatedAt: now,
    };
    this.tasks.set(updated.id, updated);
    this.persistTasks();
    return updated;
  }

  /**
   * 转派：抬升 epoch，撤销旧配置，新责任人 CLAIMED。
   */
  transferTask(
    session: WorkbenchSession,
    taskId: string,
    request: TransferTaskRequest,
  ): ClaimableHumanTaskRecord {
    const task = this.requireTask(session, taskId);
    this.assertAssignee(session, task);
    this.assertCas(task, request.expectedRevision, request.responsibilityEpoch);
    const toPersonId = request.toPersonId?.trim() ?? "";
    if (!toPersonId) {
      throw new Error("toPersonId is required");
    }
    if (toPersonId === session.personId) {
      throw new Error("cannot transfer to self");
    }
    this.revokeActiveConfigs(task.id, task.responsibilityEpoch);
    const now = new Date().toISOString();
    const updated: ClaimableHumanTaskRecord = {
      ...task,
      state: "CLAIMED",
      assigneePersonId: toPersonId,
      responsibilityEpoch: task.responsibilityEpoch + 1,
      revision: task.revision + 1,
      updatedAt: now,
    };
    this.tasks.set(updated.id, updated);
    this.persistTasks();
    return updated;
  }

  /**
   * 保存本人配置（不启动）；CAS 核对 epoch + revision。
   */
  savePersonConfig(
    session: WorkbenchSession,
    taskId: string,
    request: SavePersonConfigRequest,
  ): PersonConfigRecord {
    const task = this.requireTask(session, taskId);
    this.assertAssignee(session, task);
    this.assertCas(task, request.expectedRevision, request.responsibilityEpoch);
    this.rejectForbiddenOverrides(task, request);
    const mode = request.mode;
    const digitalEmployeeId = normalizeOptionalId(request.digitalEmployeeId);
    assertEmployeeForMode(mode, digitalEmployeeId, this.digitalEmployees);

    this.revokeActiveConfigs(task.id, task.responsibilityEpoch);
    const now = new Date().toISOString();
    const nextRevision = task.revision + 1;
    const config: PersonConfigRecord = {
      id: randomUUID(),
      humanTaskId: task.id,
      workId: task.workId,
      configuredBy: session.personId,
      mode,
      digitalEmployeeId,
      responsibilityEpoch: task.responsibilityEpoch,
      revision: nextRevision,
      requiredOutputs: [...task.requiredOutputs],
      budgetTokens: task.budgetTokens,
      preferenceNote: (request.preferenceNote ?? "").trim(),
      started: false,
      state: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };
    this.configs.set(config.id, config);
    const bumped: ClaimableHumanTaskRecord = {
      ...task,
      revision: nextRevision,
      updatedAt: now,
    };
    this.tasks.set(bumped.id, bumped);
    this.persistConfigs();
    this.persistTasks();
    return config;
  }

  /**
   * 读取任务当前 ACTIVE 配置（若有）。
   */
  getActiveConfigForTask(
    session: WorkbenchSession,
    taskId: string,
  ): PersonConfigRecord | undefined {
    const task = this.getTaskForSession(session, taskId);
    if (!task) {
      return undefined;
    }
    return Array.from(this.configs.values()).find(
      (item) =>
        item.humanTaskId === taskId &&
        item.state === "ACTIVE" &&
        item.responsibilityEpoch === task.responsibilityEpoch,
    );
  }

  /**
   * 列出本租户下本人相关配置。
   */
  listConfigsForSession(
    session: WorkbenchSession,
  ): ClaimListResponse<PersonConfigRecord> {
    const tenantTaskIds = new Set(
      Array.from(this.tasks.values())
        .filter((item) => item.tenantId === session.tenantId)
        .map((item) => item.id),
    );
    const items = Array.from(this.configs.values())
      .filter((item) => tenantTaskIds.has(item.humanTaskId))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { items, total: items.length };
  }

  /**
   * 要求任务存在且同租户。
   */
  private requireTask(
    session: WorkbenchSession,
    taskId: string,
  ): ClaimableHumanTaskRecord {
    const task = this.getTaskForSession(session, taskId);
    if (!task) {
      throw new Error(`claimable task not found: ${taskId}`);
    }
    return task;
  }

  /**
   * 要求当前人是承担人。
   */
  private assertAssignee(
    session: WorkbenchSession,
    task: ClaimableHumanTaskRecord,
  ): void {
    if (task.state !== "CLAIMED" || task.assigneePersonId !== session.personId) {
      throw new Error("only current assignee may mutate this task");
    }
  }

  /**
   * CAS：expectedRevision + responsibilityEpoch。
   */
  private assertCas(
    task: ClaimableHumanTaskRecord,
    expectedRevision: number,
    responsibilityEpoch: number,
  ): void {
    if (
      !Number.isInteger(expectedRevision) ||
      expectedRevision !== task.revision
    ) {
      throw new Error(
        `revision mismatch: expected ${task.revision}, got ${expectedRevision}`,
      );
    }
    if (
      !Number.isInteger(responsibilityEpoch) ||
      responsibilityEpoch !== task.responsibilityEpoch
    ) {
      throw new Error(
        `epoch mismatch: expected ${task.responsibilityEpoch}, got ${responsibilityEpoch}`,
      );
    }
  }

  /**
   * 拒绝客户端覆盖必需输出/预算。
   */
  private rejectForbiddenOverrides(
    task: ClaimableHumanTaskRecord,
    request: SavePersonConfigRequest,
  ): void {
    if (request.requiredOutputs !== undefined) {
      const same =
        Array.isArray(request.requiredOutputs) &&
        request.requiredOutputs.length === task.requiredOutputs.length &&
        request.requiredOutputs.every(
          (item, index) => item === task.requiredOutputs[index],
        );
      if (!same) {
        throw new Error("requiredOutputs cannot be overridden by preference");
      }
    }
    if (
      request.budgetTokens !== undefined &&
      request.budgetTokens !== task.budgetTokens
    ) {
      throw new Error("budgetTokens cannot be overridden by preference");
    }
  }

  /**
   * 撤销指定任务+epoch 的 ACTIVE 配置。
   */
  private revokeActiveConfigs(humanTaskId: string, epoch: number): void {
    let changed = false;
    const now = new Date().toISOString();
    for (const [id, item] of this.configs.entries()) {
      if (
        item.humanTaskId === humanTaskId &&
        item.responsibilityEpoch === epoch &&
        item.state === "ACTIVE"
      ) {
        this.configs.set(id, { ...item, state: "REVOKED", updatedAt: now });
        changed = true;
      }
    }
    if (changed) {
      this.persistConfigs();
    }
  }

  private persistTasks(): void {
    saveClaimableTasks(this.paths.tasks, Array.from(this.tasks.values()));
  }

  private persistConfigs(): void {
    savePersonConfigs(this.paths.configs, Array.from(this.configs.values()));
  }
}
