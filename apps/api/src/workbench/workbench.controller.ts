/**
 * M1-01 双实例工作台 API。
 *
 * 主体只从会话头派生；列表与详情强制租户隔离。
 */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  UnauthorizedException,
} from "@nestjs/common";
import { WorkbenchRegistry } from "./workbench.registry";
import { resolveSessionFromHeaders } from "./workbench.session";
import {
  CreateInstanceRequest,
  EnsureTemplateRequest,
  ListResponse,
  ProcessInstanceRecord,
  ProcessTemplateRecord,
  SaveDraftRequest,
  WorkbenchSession,
  WorkbenchTodoRecord,
} from "./workbench.types";

@Controller("workbench")
export class WorkbenchController {
  constructor(private readonly registry: WorkbenchRegistry) {}

  /**
   * GET /api/v1/workbench/session
   */
  @Get("session")
  getSession(
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): WorkbenchSession {
    return this.requireSession(headers);
  }

  /**
   * GET /api/v1/workbench/templates
   */
  @Get("templates")
  listTemplates(
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): ListResponse<ProcessTemplateRecord> {
    this.requireSession(headers);
    return this.registry.listPublishedTemplates();
  }

  /**
   * POST /api/v1/workbench/templates
   */
  @Post("templates")
  @HttpCode(201)
  ensureTemplate(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: EnsureTemplateRequest,
  ): ProcessTemplateRecord {
    this.requireSession(headers);
    return this.runDomain(() => this.registry.ensurePublishedTemplate(body));
  }

  /**
   * GET /api/v1/workbench/instances
   */
  @Get("instances")
  listInstances(
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): ListResponse<ProcessInstanceRecord> {
    const session = this.requireSession(headers);
    return this.registry.listInstancesForSession(session);
  }

  /**
   * POST /api/v1/workbench/instances
   */
  @Post("instances")
  @HttpCode(201)
  createInstance(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: CreateInstanceRequest,
  ): ProcessInstanceRecord {
    const session = this.requireSession(headers);
    return this.runDomain(() =>
      this.registry.createOrReplayInstance(session, body),
    );
  }

  /**
   * GET /api/v1/workbench/instances/:id
   */
  @Get("instances/:id")
  getInstance(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("id") id: string,
  ): ProcessInstanceRecord {
    const session = this.requireSession(headers);
    const record = this.registry.getInstanceForSession(session, id);
    if (!record) {
      throw new NotFoundException(`instance not found: ${id}`);
    }
    return record;
  }

  /**
   * PUT /api/v1/workbench/instances/:id/draft
   */
  @Put("instances/:id/draft")
  saveDraft(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("id") id: string,
    @Body() body: SaveDraftRequest,
  ): ProcessInstanceRecord {
    const session = this.requireSession(headers);
    return this.runDomain(() =>
      this.registry.saveDraftForSession(session, id, body?.draft ?? ""),
    );
  }

  /**
   * GET /api/v1/workbench/todos
   */
  @Get("todos")
  listTodos(
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): ListResponse<WorkbenchTodoRecord> {
    const session = this.requireSession(headers);
    return this.registry.listTodosForSession(session);
  }

  /**
   * 解析会话头。
   */
  private requireSession(
    headers: Record<string, string | string[] | undefined>,
  ): WorkbenchSession {
    try {
      return resolveSessionFromHeaders(headers);
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * 将领域错误映射为 HTTP 4xx。
   */
  private runDomain<T>(action: () => T): T {
    try {
      return action();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("not found")) {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }
}
