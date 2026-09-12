/**
 * 最小工作流连接 API：工作项 / 人任务 / 任务绑定。
 */
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common";
import { WorkflowRegistry } from "./workflow.registry";
import {
  CreateHumanTaskRequest,
  CreateTaskBindingRequest,
  CreateWorkItemRequest,
  HumanTaskRecord,
  ListResponse,
  TaskBindingRecord,
  WorkItemRecord,
} from "./workflow.types";

@Controller()
export class WorkflowController {
  constructor(private readonly registry: WorkflowRegistry) {}

  /**
   * GET /api/v1/work-items
   */
  @Get("work-items")
  listWorkItems(): ListResponse<WorkItemRecord> {
    return this.registry.listWorkItems();
  }

  /**
   * POST /api/v1/work-items
   */
  @Post("work-items")
  @HttpCode(201)
  createWorkItem(@Body() body: CreateWorkItemRequest): WorkItemRecord {
    return this.runCreate(() => this.registry.createWorkItem(body));
  }

  /**
   * GET /api/v1/human-tasks
   */
  @Get("human-tasks")
  listHumanTasks(): ListResponse<HumanTaskRecord> {
    return this.registry.listHumanTasks();
  }

  /**
   * POST /api/v1/human-tasks
   */
  @Post("human-tasks")
  @HttpCode(201)
  createHumanTask(@Body() body: CreateHumanTaskRequest): HumanTaskRecord {
    return this.runCreate(() => this.registry.createHumanTask(body));
  }

  /**
   * GET /api/v1/task-bindings
   */
  @Get("task-bindings")
  listBindings(): ListResponse<TaskBindingRecord> {
    return this.registry.listBindings();
  }

  /**
   * GET /api/v1/task-bindings/:id
   */
  @Get("task-bindings/:id")
  getBinding(@Param("id") id: string): TaskBindingRecord {
    const record = this.registry.getBinding(id);
    if (!record) {
      throw new NotFoundException(`task binding not found: ${id}`);
    }
    return record;
  }

  /**
   * POST /api/v1/task-bindings
   */
  @Post("task-bindings")
  @HttpCode(201)
  createBinding(@Body() body: CreateTaskBindingRequest): TaskBindingRecord {
    return this.runCreate(() => this.registry.createBinding(body));
  }

  /**
   * 将领域错误映射为 HTTP 4xx。
   *
   * Args:
   *   action: 创建动作。
   *
   * Returns:
   *   创建结果。
   */
  private runCreate<T>(action: () => T): T {
    try {
      return action();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("already exists")) {
        throw new ConflictException(message);
      }
      throw new BadRequestException(message);
    }
  }
}
