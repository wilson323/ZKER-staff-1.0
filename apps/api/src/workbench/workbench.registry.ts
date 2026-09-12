/**
 * 双实例工作台登记表：模板 / 实例 / 待办内存索引 + JSON 持久化。
 *
 * C02 最小语义：同租户 + 同幂等键返回既有实例；新意图键生成另一实例。
 * TRACE-workbench-20260912-幂等键防重复建单
 */
import { Injectable, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  loadInstances,
  loadTemplates,
  loadTodos,
  resolveWorkbenchStorePaths,
  saveInstances,
  saveTemplates,
  saveTodos,
} from "./workbench.store";
import {
  CreateInstanceRequest,
  EnsureTemplateRequest,
  ListResponse,
  ProcessInstanceRecord,
  ProcessTemplateRecord,
  WorkbenchSession,
  WorkbenchTodoRecord,
} from "./workbench.types";

@Injectable()
export class WorkbenchRegistry implements OnModuleInit {
  private readonly templates = new Map<string, ProcessTemplateRecord>();
  private readonly instances = new Map<string, ProcessInstanceRecord>();
  private readonly todos = new Map<string, WorkbenchTodoRecord>();
  private paths = resolveWorkbenchStorePaths();

  /**
   * 启动时从磁盘回读。
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
    this.paths = resolveWorkbenchStorePaths(dataDir);
    this.templates.clear();
    this.instances.clear();
    this.todos.clear();
  }

  /**
   * 从磁盘重新装载。
   *
   * Returns:
   *   三类记录条数。
   */
  reloadFromDisk(): {
    templates: number;
    instances: number;
    todos: number;
  } {
    this.templates.clear();
    this.instances.clear();
    this.todos.clear();
    for (const item of loadTemplates(this.paths.templates)) {
      this.templates.set(item.id, item);
    }
    for (const item of loadInstances(this.paths.instances)) {
      this.instances.set(item.id, item);
    }
    for (const item of loadTodos(this.paths.todos)) {
      this.todos.set(item.id, item);
    }
    return {
      templates: this.templates.size,
      instances: this.instances.size,
      todos: this.todos.size,
    };
  }

  /**
   * 列出已发布模板（全局可见的已发布清单）。
   */
  listPublishedTemplates(): ListResponse<ProcessTemplateRecord> {
    const items = Array.from(this.templates.values())
      .filter((item) => item.published)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { items, total: items.length };
  }

  /**
   * 确保存在已发布模板（按 code 幂等）。
   *
   * Args:
   *   request: code / title。
   *
   * Returns:
   *   ProcessTemplateRecord
   */
  ensurePublishedTemplate(
    request: EnsureTemplateRequest,
  ): ProcessTemplateRecord {
    const code = request.code?.trim() ?? "";
    const title = request.title?.trim() ?? "";
    if (!code) {
      throw new Error("template code is required");
    }
    if (!title) {
      throw new Error("template title is required");
    }
    for (const existing of this.templates.values()) {
      if (existing.code === code) {
        return existing;
      }
    }
    const record: ProcessTemplateRecord = {
      id: randomUUID(),
      code,
      title,
      published: true,
      createdAt: new Date().toISOString(),
    };
    this.templates.set(record.id, record);
    this.persistTemplates();
    return record;
  }

  /**
   * 列出当前租户可见实例。
   *
   * Args:
   *   session: 会话主体。
   */
  listInstancesForSession(
    session: WorkbenchSession,
  ): ListResponse<ProcessInstanceRecord> {
    const items = Array.from(this.instances.values())
      .filter((item) => item.tenantId === session.tenantId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { items, total: items.length };
  }

  /**
   * 读取实例；跨租户返回 undefined（控制器映射 404）。
   *
   * Args:
   *   session: 会话。
   *   id: 实例 id。
   */
  getInstanceForSession(
    session: WorkbenchSession,
    id: string,
  ): ProcessInstanceRecord | undefined {
    const record = this.instances.get(id);
    if (!record || record.tenantId !== session.tenantId) {
      return undefined;
    }
    return record;
  }

  /**
   * 发起或回放实例（同租户同幂等键返回既有记录）。
   *
   * Args:
   *   session: 会话派生主体。
   *   request: 模板/标题/幂等键/意图键。
   *
   * Returns:
   *   ProcessInstanceRecord
   */
  createOrReplayInstance(
    session: WorkbenchSession,
    request: CreateInstanceRequest,
  ): ProcessInstanceRecord {
    const templateId = request.templateId?.trim() ?? "";
    const title = request.title?.trim() ?? "";
    const idempotencyKey = request.idempotencyKey?.trim() ?? "";
    const intentKey = request.intentKey?.trim() ?? "";
    if (!templateId) {
      throw new Error("templateId is required");
    }
    if (!title) {
      throw new Error("instance title is required");
    }
    if (!idempotencyKey) {
      throw new Error("idempotencyKey is required");
    }
    if (!intentKey) {
      throw new Error("intentKey is required");
    }
    const template = this.templates.get(templateId);
    if (!template || !template.published) {
      throw new Error(`published template not found: ${templateId}`);
    }

    for (const existing of this.instances.values()) {
      if (
        existing.tenantId === session.tenantId &&
        existing.idempotencyKey === idempotencyKey
      ) {
        return existing;
      }
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const record: ProcessInstanceRecord = {
      id,
      templateId,
      tenantId: session.tenantId,
      initiatorPersonId: session.personId,
      title,
      idempotencyKey,
      intentKey,
      state: "OPEN",
      draft: "",
      threadId: `thread-${id}`,
      configId: `config-${id}`,
      urlPath: `/workbench/instances/${id}`,
      createdAt: now,
      updatedAt: now,
    };
    this.instances.set(record.id, record);

    const todo: WorkbenchTodoRecord = {
      id: randomUUID(),
      instanceId: record.id,
      tenantId: session.tenantId,
      assigneePersonId: session.personId,
      title: `待办：${title}`,
      createdAt: now,
    };
    this.todos.set(todo.id, todo);

    this.persistInstances();
    this.persistTodos();
    return record;
  }

  /**
   * 保存实例私有草稿（禁止跨实例污染）。
   *
   * Args:
   *   session: 会话。
   *   id: 实例 id。
   *   draft: 草稿文本。
   *
   * Returns:
   *   更新后的实例。
   */
  saveDraftForSession(
    session: WorkbenchSession,
    id: string,
    draft: string,
  ): ProcessInstanceRecord {
    const record = this.getInstanceForSession(session, id);
    if (!record) {
      throw new Error(`instance not found: ${id}`);
    }
    if (typeof draft !== "string") {
      throw new Error("draft must be a string");
    }
    const updated: ProcessInstanceRecord = {
      ...record,
      draft,
      updatedAt: new Date().toISOString(),
    };
    this.instances.set(updated.id, updated);
    this.persistInstances();
    return updated;
  }

  /**
   * 列出本人在当前租户的待办。
   *
   * Args:
   *   session: 会话。
   */
  listTodosForSession(
    session: WorkbenchSession,
  ): ListResponse<WorkbenchTodoRecord> {
    const items = Array.from(this.todos.values())
      .filter(
        (item) =>
          item.tenantId === session.tenantId &&
          item.assigneePersonId === session.personId,
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { items, total: items.length };
  }

  /**
   * 落盘模板。
   */
  private persistTemplates(): void {
    saveTemplates(this.paths.templates, Array.from(this.templates.values()));
  }

  /**
   * 落盘实例。
   */
  private persistInstances(): void {
    saveInstances(this.paths.instances, Array.from(this.instances.values()));
  }

  /**
   * 落盘待办。
   */
  private persistTodos(): void {
    saveTodos(this.paths.todos, Array.from(this.todos.values()));
  }
}
