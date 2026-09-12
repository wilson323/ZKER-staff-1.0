/**
 * M1-03 来源确认 / 预览 / 执行快照 API。
 *
 * 主体仅从会话头派生；X-Authz-Unavailable → 503。
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
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { SnapshotRegistry } from "./snapshot.registry";
import { isAuthzUnavailable } from "./snapshot.rules";
import {
  BuildSnapshotRequest,
  ConfirmBaselineRequest,
  ContextPreviewRecord,
  ExecutionSnapshotRecord,
  FactBaselineRecord,
  RegisterSourceRequest,
  SnapshotListResponse,
  TaskSourceRecord,
} from "./snapshot.types";
import { resolveSessionFromHeaders } from "./workbench.session";
import { WorkbenchSession } from "./workbench.types";

@Controller("workbench/claimable-tasks/:taskId")
export class SnapshotController {
  constructor(private readonly snapshots: SnapshotRegistry) {}

  /**
   * POST .../sources — 登记来源。
   */
  @Post("sources")
  registerSource(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("taskId") taskId: string,
    @Body() body: RegisterSourceRequest,
  ): TaskSourceRecord {
    this.assertAuthz(headers);
    const session = this.requireSession(headers);
    return this.run(() => this.snapshots.registerSource(session, taskId, body));
  }

  /**
   * GET .../sources — 人员可见来源列表（不含 BACKEND_ONLY）。
   */
  @Get("sources")
  listSources(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("taskId") taskId: string,
  ): SnapshotListResponse<TaskSourceRecord> {
    this.assertAuthz(headers);
    const session = this.requireSession(headers);
    return this.run(() => this.snapshots.listSourcesForTask(session, taskId));
  }

  /**
   * POST .../sources/:sourceId/revoke — 撤销来源。
   */
  @Post("sources/:sourceId/revoke")
  @HttpCode(200)
  revokeSource(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("taskId") taskId: string,
    @Param("sourceId") sourceId: string,
  ): TaskSourceRecord {
    this.assertAuthz(headers);
    const session = this.requireSession(headers);
    return this.run(() =>
      this.snapshots.revokeSource(session, taskId, sourceId),
    );
  }

  /**
   * POST .../baseline/confirm — C16 确认基线。
   */
  @Post("baseline/confirm")
  @HttpCode(200)
  confirmBaseline(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("taskId") taskId: string,
    @Body() body: ConfirmBaselineRequest,
  ): FactBaselineRecord {
    this.assertAuthz(headers);
    const session = this.requireSession(headers);
    return this.run(() =>
      this.snapshots.confirmBaseline(session, taskId, body),
    );
  }

  /**
   * GET .../baseline — 当前 epoch 最新基线。
   */
  @Get("baseline")
  getBaseline(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("taskId") taskId: string,
  ): FactBaselineRecord {
    this.assertAuthz(headers);
    const session = this.requireSession(headers);
    const record = this.run(() =>
      this.snapshots.getLatestBaseline(session, taskId),
    );
    if (!record) {
      throw new NotFoundException(`baseline not found for task: ${taskId}`);
    }
    return record;
  }

  /**
   * POST .../context-preview — C05 人员预览。
   */
  @Post("context-preview")
  @HttpCode(200)
  previewContext(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("taskId") taskId: string,
  ): ContextPreviewRecord {
    this.assertAuthz(headers);
    const session = this.requireSession(headers);
    return this.run(() => this.snapshots.previewContext(session, taskId));
  }

  /**
   * POST .../execution-snapshot — C06 重验并生成快照。
   */
  @Post("execution-snapshot")
  @HttpCode(200)
  buildSnapshot(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("taskId") taskId: string,
    @Body() body: BuildSnapshotRequest,
  ): ExecutionSnapshotRecord {
    this.assertAuthz(headers);
    const session = this.requireSession(headers);
    const snapshot = this.run(() =>
      this.snapshots.buildExecutionSnapshot(session, taskId, body ?? {}),
    );
    if (snapshot.state === "BLOCKED") {
      throw new ConflictException({
        message: snapshot.blockReason ?? "execution snapshot blocked",
        snapshot,
      });
    }
    return snapshot;
  }

  /**
   * GET .../execution-snapshot — 最新快照。
   */
  @Get("execution-snapshot")
  getSnapshot(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("taskId") taskId: string,
  ): ExecutionSnapshotRecord {
    this.assertAuthz(headers);
    const session = this.requireSession(headers);
    const record = this.run(() =>
      this.snapshots.getLatestSnapshot(session, taskId),
    );
    if (!record) {
      throw new NotFoundException(`execution snapshot not found: ${taskId}`);
    }
    return record;
  }

  /**
   * 权限服务不可用 → 真实 503。
   */
  private assertAuthz(
    headers: Record<string, string | string[] | undefined>,
  ): void {
    if (isAuthzUnavailable(headers)) {
      throw new ServiceUnavailableException(
        "authorization service unavailable; retry via recovery entry",
      );
    }
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
        error instanceof ServiceUnavailableException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("not found")) {
        throw new NotFoundException(message);
      }
      if (message.includes("epoch mismatch") || message.includes("drift")) {
        throw new ConflictException(message);
      }
      throw new BadRequestException(message);
    }
  }
}
