/**
 * M1-05 产物与受众发布 API。
 *
 * 主体仅从会话派生；响应不含公开 storage URL。
 * TRACE-publish-20260912-控制器
 */
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import type { Response } from "express";
import { PublishRegistry } from "./publish.registry";
import {
  ArtifactVersionRecord,
  CompleteUploadRequest,
  CreateOutputReleaseRequest,
  OutputReleaseRecord,
  OutputReleaseView,
  PrepareUploadRequest,
  PublishListResponse,
  UploadTicketRecord,
} from "./publish.types";
import { resolveSessionFromHeaders } from "./workbench.session";
import { WorkbenchSession } from "./workbench.types";

@Controller()
export class PublishController {
  constructor(private readonly publish: PublishRegistry) {}

  /**
   * POST .../artifacts/prepare — C20 准备上传。
   */
  @Post("workbench/claimable-tasks/:taskId/artifacts/prepare")
  @HttpCode(201)
  prepare(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("taskId") taskId: string,
    @Body() body: PrepareUploadRequest,
  ): UploadTicketRecord {
    const session = this.requireSession(headers);
    return this.run(() =>
      this.publish.prepareUpload(session, taskId, body ?? ({} as PrepareUploadRequest)),
    );
  }

  /**
   * PUT .../uploads/:uploadId/bytes — 隔离区写入原始字节。
   */
  @Put("workbench/uploads/:uploadId/bytes")
  @HttpCode(200)
  putBytes(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("uploadId") uploadId: string,
    @Req() req: { body?: Buffer },
  ): UploadTicketRecord {
    const session = this.requireSession(headers);
    const bytes = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    return this.run(() => this.publish.putUploadBytes(session, uploadId, bytes));
  }

  /**
   * POST .../uploads/:uploadId/complete — 服务端重算 digest。
   */
  @Post("workbench/uploads/:uploadId/complete")
  @HttpCode(201)
  complete(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("uploadId") uploadId: string,
    @Body() body: CompleteUploadRequest,
  ): ArtifactVersionRecord {
    const session = this.requireSession(headers);
    return this.run(() =>
      this.publish.completeUpload(session, uploadId, body ?? {}),
    );
  }

  /**
   * GET .../artifacts — 版本列表。
   */
  @Get("workbench/claimable-tasks/:taskId/artifacts")
  listArtifacts(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("taskId") taskId: string,
  ): PublishListResponse<ArtifactVersionRecord> {
    const session = this.requireSession(headers);
    return this.run(() => this.publish.listVersions(session, taskId));
  }

  /**
   * GET .../artifacts/:artifactId — 元数据（无公开 URL）。
   */
  @Get("workbench/artifacts/:artifactId")
  getArtifact(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("artifactId") artifactId: string,
  ): ArtifactVersionRecord {
    const session = this.requireSession(headers);
    const record = this.run(() => this.publish.getVersion(session, artifactId));
    if (!record) {
      throw new NotFoundException(`artifact not found: ${artifactId}`);
    }
    return record;
  }

  /**
   * GET .../artifacts/:artifactId/content — 重验 digest 后下载。
   */
  @Get("workbench/artifacts/:artifactId/content")
  download(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("artifactId") artifactId: string,
    @Res() res: Response,
  ): void {
    const session = this.requireSession(headers);
    try {
      const { artifact, bytes } = this.publish.downloadVersion(
        session,
        artifactId,
      );
      res.setHeader("Content-Type", artifact.mediaType);
      res.setHeader("X-Content-Digest", artifact.digest);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="artifact-${artifact.version}.bin"`,
      );
      res.status(200).send(bytes);
    } catch (error: unknown) {
      this.throwMapped(error);
    }
  }

  /**
   * POST .../output-releases — 候选或获准发布。
   */
  @Post("workbench/claimable-tasks/:taskId/output-releases")
  @HttpCode(201)
  createRelease(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("taskId") taskId: string,
    @Body() body: CreateOutputReleaseRequest,
  ): OutputReleaseRecord {
    const session = this.requireSession(headers);
    return this.run(() =>
      this.publish.createRelease(
        session,
        taskId,
        body ?? ({} as CreateOutputReleaseRequest),
      ),
    );
  }

  /**
   * GET .../output-releases — 列表。
   */
  @Get("workbench/claimable-tasks/:taskId/output-releases")
  listReleases(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("taskId") taskId: string,
  ): PublishListResponse<OutputReleaseRecord> {
    const session = this.requireSession(headers);
    return this.run(() => this.publish.listReleases(session, taskId));
  }

  /**
   * GET .../output-releases/:id/view — 受众门控视图。
   */
  @Get("workbench/output-releases/:releaseId/view")
  viewRelease(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("releaseId") releaseId: string,
  ): OutputReleaseView {
    const session = this.requireSession(headers);
    return this.run(() => this.publish.viewRelease(session, releaseId));
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
      this.throwMapped(error);
    }
  }

  private throwMapped(error: unknown): never {
    if (
      error instanceof ConflictException ||
      error instanceof NotFoundException ||
      error instanceof UnauthorizedException ||
      error instanceof ForbiddenException
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("not found")) {
      throw new NotFoundException(message);
    }
    if (
      message.includes("conflict") ||
      message.includes("mismatch") ||
      message.includes("already completed")
    ) {
      throw new ConflictException(message);
    }
    if (
      message.includes("denied") ||
      message.includes("owner mismatch") ||
      message.includes("only CLAIMED")
    ) {
      throw new ForbiddenException(message);
    }
    throw new BadRequestException(message);
  }
}
