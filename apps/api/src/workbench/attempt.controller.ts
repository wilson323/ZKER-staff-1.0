/**
 * M1-04 有界执行 Attempt API。
 *
 * start → 202 QUEUED；主体仅从会话派生。
 * TRACE-attempt-20260912-控制器
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
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import type { Response } from "express";
import { AttemptRegistry } from "./attempt.registry";
import {
  AttemptListResponse,
  AttemptRecord,
  CancelAttemptRequest,
  ReconcileAttemptRequest,
  StartAttemptRequest,
} from "./attempt.types";
import { resolveSessionFromHeaders } from "./workbench.session";
import { WorkbenchSession } from "./workbench.types";

@Controller()
export class AttemptController {
  constructor(private readonly attempts: AttemptRegistry) {}

  /**
   * POST .../claimable-tasks/:taskId/attempts — C06 启动（202）。
   */
  @Post("workbench/claimable-tasks/:taskId/attempts")
  start(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("taskId") taskId: string,
    @Body() body: StartAttemptRequest,
    @Res({ passthrough: true }) res: Response,
  ): AttemptRecord {
    const session = this.requireSession(headers);
    const record = this.run(() =>
      this.attempts.startAttempt(session, taskId, body ?? { idempotencyKey: "" }),
    );
    res.status(202);
    return record;
  }

  /**
   * GET .../claimable-tasks/:taskId/attempts — 列表。
   */
  @Get("workbench/claimable-tasks/:taskId/attempts")
  list(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("taskId") taskId: string,
  ): AttemptListResponse {
    const session = this.requireSession(headers);
    return this.run(() => this.attempts.listAttempts(session, taskId));
  }

  /**
   * GET .../attempts/:attemptId — 单条真实状态。
   */
  @Get("workbench/attempts/:attemptId")
  getOne(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("attemptId") attemptId: string,
  ): AttemptRecord {
    const session = this.requireSession(headers);
    const record = this.run(() => this.attempts.getAttempt(session, attemptId));
    if (!record) {
      throw new NotFoundException(`attempt not found: ${attemptId}`);
    }
    return record;
  }

  /**
   * POST .../attempts/:attemptId/advance — 推进一步。
   */
  @Post("workbench/attempts/:attemptId/advance")
  @HttpCode(200)
  advance(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("attemptId") attemptId: string,
  ): AttemptRecord {
    const session = this.requireSession(headers);
    return this.run(() => this.attempts.advanceAttempt(session, attemptId));
  }

  /**
   * POST .../attempts/:attemptId/cancel — 取消。
   */
  @Post("workbench/attempts/:attemptId/cancel")
  @HttpCode(200)
  cancel(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("attemptId") attemptId: string,
    @Body() body: CancelAttemptRequest,
  ): AttemptRecord {
    const session = this.requireSession(headers);
    return this.run(() =>
      this.attempts.cancelAttempt(session, attemptId, body ?? { reason: "" }),
    );
  }

  /**
   * POST .../attempts/:attemptId/external-write-timeout — RUNNING→RESULT_UNKNOWN。
   */
  @Post("workbench/attempts/:attemptId/external-write-timeout")
  @HttpCode(200)
  markUnknown(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("attemptId") attemptId: string,
  ): AttemptRecord {
    const session = this.requireSession(headers);
    return this.run(() =>
      this.attempts.markExternalWriteUnknown(session, attemptId),
    );
  }

  /**
   * POST .../attempts/:attemptId/reconcile — C14 查证落定。
   */
  @Post("workbench/attempts/:attemptId/reconcile")
  @HttpCode(200)
  reconcile(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("attemptId") attemptId: string,
    @Body() body: ReconcileAttemptRequest,
  ): AttemptRecord {
    const session = this.requireSession(headers);
    return this.run(() =>
      this.attempts.reconcileAttempt(
        session,
        attemptId,
        body ?? { outcome: "FAILED", evidence: "" },
      ),
    );
  }

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

  private run<T>(action: () => T): T {
    try {
      return action();
    } catch (error: unknown) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("not found")) {
        throw new NotFoundException(message);
      }
      if (
        message.includes("fence occupied") ||
        message.includes("epoch mismatch") ||
        message.includes("READY execution snapshot") ||
        message.includes("not advanceable") ||
        message.includes("RESULT_UNKNOWN") ||
        message.includes("reconcile only") ||
        message.includes("not cancellable") ||
        message.includes("external write timeout only")
      ) {
        throw new ConflictException(message);
      }
      throw new BadRequestException(message);
    }
  }
}
