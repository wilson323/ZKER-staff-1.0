/**
 * M1-02 领取 / 配置 / 转派 API。
 *
 * 主体仅从会话头派生；并发领取冲突映射 409。
 */
import {
  BadRequestException,
  Body,
  ConflictException,
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
import { ClaimRegistry } from "./claim.registry";
import {
  ClaimableHumanTaskRecord,
  ClaimListResponse,
  ClaimTaskRequest,
  PersonConfigRecord,
  SavePersonConfigRequest,
  TransferTaskRequest,
} from "./claim.types";
import { resolveSessionFromHeaders } from "./workbench.session";
import { WorkbenchSession } from "./workbench.types";

@Controller("workbench")
export class ClaimController {
  constructor(private readonly claims: ClaimRegistry) {}

  /**
   * GET /api/v1/workbench/claimable-tasks
   */
  @Get("claimable-tasks")
  listTasks(
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): ClaimListResponse<ClaimableHumanTaskRecord> {
    const session = this.requireSession(headers);
    return this.claims.listTasksForSession(session);
  }

  /**
   * GET /api/v1/workbench/claimable-tasks/:id
   */
  @Get("claimable-tasks/:id")
  getTask(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("id") id: string,
  ): ClaimableHumanTaskRecord {
    const session = this.requireSession(headers);
    const record = this.claims.getTaskForSession(session, id);
    if (!record) {
      throw new NotFoundException(`claimable task not found: ${id}`);
    }
    return record;
  }

  /**
   * POST /api/v1/workbench/claimable-tasks/:id/claim
   */
  @Post("claimable-tasks/:id/claim")
  @HttpCode(200)
  claimTask(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("id") id: string,
    @Body() _body: ClaimTaskRequest,
  ): ClaimableHumanTaskRecord {
    const session = this.requireSession(headers);
    return this.runMutate(() => this.claims.claimTask(session, id));
  }

  /**
   * POST /api/v1/workbench/claimable-tasks/:id/transfer
   */
  @Post("claimable-tasks/:id/transfer")
  @HttpCode(200)
  transferTask(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("id") id: string,
    @Body() body: TransferTaskRequest,
  ): ClaimableHumanTaskRecord {
    const session = this.requireSession(headers);
    return this.runMutate(() => this.claims.transferTask(session, id, body));
  }

  /**
   * PUT /api/v1/workbench/claimable-tasks/:id/config
   */
  @Put("claimable-tasks/:id/config")
  saveConfig(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("id") id: string,
    @Body() body: SavePersonConfigRequest,
  ): PersonConfigRecord {
    const session = this.requireSession(headers);
    return this.runMutate(() => this.claims.savePersonConfig(session, id, body));
  }

  /**
   * GET /api/v1/workbench/claimable-tasks/:id/config
   */
  @Get("claimable-tasks/:id/config")
  getConfig(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("id") id: string,
  ): PersonConfigRecord {
    const session = this.requireSession(headers);
    const record = this.claims.getActiveConfigForTask(session, id);
    if (!record) {
      throw new NotFoundException(`active person config not found: ${id}`);
    }
    return record;
  }

  /**
   * GET /api/v1/workbench/person-configs
   */
  @Get("person-configs")
  listConfigs(
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): ClaimListResponse<PersonConfigRecord> {
    const session = this.requireSession(headers);
    return this.claims.listConfigsForSession(session);
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
   * 领域错误 → HTTP 4xx（冲突 409）。
   */
  private runMutate<T>(action: () => T): T {
    try {
      return action();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("not found")) {
        throw new NotFoundException(message);
      }
      if (
        message.includes("already claimed") ||
        message.includes("revision mismatch") ||
        message.includes("epoch mismatch")
      ) {
        throw new ConflictException(message);
      }
      throw new BadRequestException(message);
    }
  }
}
