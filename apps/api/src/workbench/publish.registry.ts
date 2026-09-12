/**
 * M1-05 产物与受众发布登记表。
 *
 * prepare→隔离字节→服务端 digest→ArtifactVersion；候选→受众 OutputRelease。
 * TRACE-publish-20260912-上传受众门控
 */
import { Injectable, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { ClaimRegistry } from "./claim.registry";
import { ClaimableHumanTaskRecord } from "./claim.types";
import {
  normalizeCompleteRequest,
  normalizePrepareRequest,
  normalizeReleaseRequest,
} from "./publish.rules";
import {
  digestBytes,
  loadReleases,
  loadTickets,
  loadVersions,
  PublishStorePaths,
  readIsolationBytes,
  resolvePublishStorePaths,
  saveReleases,
  saveTickets,
  saveVersions,
  writeIsolationBytes,
} from "./publish.store";
import { buildReleaseView, scanAndParse } from "./publish.support";
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
import { WorkbenchSession } from "./workbench.types";

@Injectable()
export class PublishRegistry implements OnModuleInit {
  private readonly tickets = new Map<string, UploadTicketRecord>();
  private readonly versions = new Map<string, ArtifactVersionRecord>();
  private readonly releases = new Map<string, OutputReleaseRecord>();
  private paths: PublishStorePaths = resolvePublishStorePaths();

  constructor(private readonly claims: ClaimRegistry) {}

  onModuleInit(): void {
    this.reloadFromDisk();
  }

  /** 测试辅助：切换数据目录。 */
  useDataDirForTest(dataDir: string): void {
    this.paths = resolvePublishStorePaths(dataDir);
    this.tickets.clear();
    this.versions.clear();
    this.releases.clear();
  }

  /** 从磁盘装载。 */
  reloadFromDisk(): void {
    this.tickets.clear();
    this.versions.clear();
    this.releases.clear();
    for (const item of loadTickets(this.paths.tickets)) {
      this.tickets.set(item.id, item);
    }
    for (const item of loadVersions(this.paths.versions)) {
      this.versions.set(item.id, item);
    }
    for (const item of loadReleases(this.paths.releases)) {
      this.releases.set(item.id, item);
    }
  }

  /**
   * C20 prepare：创建上传票据。
   */
  prepareUpload(
    session: WorkbenchSession,
    taskId: string,
    request: PrepareUploadRequest,
  ): UploadTicketRecord {
    const task = this.requireAssigneeTask(session, taskId);
    const normalized = normalizePrepareRequest(request);
    const now = new Date().toISOString();
    const id = randomUUID();
    const record: UploadTicketRecord = {
      id,
      humanTaskId: task.id,
      workId: task.workId,
      tenantId: task.tenantId,
      personId: session.personId,
      fileName: normalized.fileName,
      mediaType: normalized.mediaType,
      sizeBytes: normalized.sizeBytes,
      state: "PREPARED",
      isolationKey: `${task.tenantId}/${id}.bin`,
      bytesDigest: null,
      rejectReason: null,
      createdAt: now,
      updatedAt: now,
    };
    this.tickets.set(id, record);
    this.persistTickets();
    return this.publicTicket(record);
  }

  /**
   * 写入隔离区字节；同票据同字节可重试，异字节 409。
   */
  putUploadBytes(
    session: WorkbenchSession,
    uploadId: string,
    bytes: Buffer,
  ): UploadTicketRecord {
    const ticket = this.requireTicketOwner(session, uploadId);
    if (ticket.state === "COMPLETED") {
      throw new Error("upload already completed");
    }
    if (ticket.state === "REJECTED") {
      throw new Error("upload rejected");
    }
    if (bytes.length !== ticket.sizeBytes) {
      throw new Error(
        `byte length mismatch: expected ${ticket.sizeBytes} got ${bytes.length}`,
      );
    }
    const digest = digestBytes(bytes);
    if (ticket.bytesDigest && ticket.bytesDigest !== digest) {
      throw new Error("isolation bytes conflict: different payload for ticket");
    }
    writeIsolationBytes(this.paths.isolationDir, ticket.isolationKey, bytes);
    const now = new Date().toISOString();
    const updated: UploadTicketRecord = {
      ...ticket,
      state: "BYTES_WRITTEN",
      bytesDigest: digest,
      updatedAt: now,
    };
    this.tickets.set(uploadId, updated);
    this.persistTickets();
    return this.publicTicket(updated);
  }

  /**
   * complete：服务端重读并算 digest，形成 ArtifactVersion。
   */
  completeUpload(
    session: WorkbenchSession,
    uploadId: string,
    request: CompleteUploadRequest,
  ): ArtifactVersionRecord {
    const ticket = this.requireTicketOwner(session, uploadId);
    const normalized = normalizeCompleteRequest(request);
    if (ticket.state !== "BYTES_WRITTEN" && ticket.state !== "COMPLETED") {
      throw new Error("upload bytes required before complete");
    }
    if (ticket.state === "COMPLETED") {
      const existing = [...this.versions.values()].find(
        (item) => item.uploadId === uploadId,
      );
      if (existing) {
        return existing;
      }
    }
    const bytes = readIsolationBytes(
      this.paths.isolationDir,
      ticket.isolationKey,
    );
    if (bytes.length !== ticket.sizeBytes) {
      throw new Error("stored size mismatch on complete");
    }
    const serverDigest = digestBytes(bytes);
    if (normalized.clientDigest && normalized.clientDigest !== serverDigest) {
      throw new Error("clientDigest mismatch; server digest is authoritative");
    }
    const scanned = scanAndParse(ticket.mediaType, bytes);
    const version =
      [...this.versions.values()]
        .filter(
          (item) =>
            item.humanTaskId === ticket.humanTaskId &&
            item.fileName === ticket.fileName,
        )
        .reduce((max, item) => Math.max(max, item.version), 0) + 1;
    const now = new Date().toISOString();
    const artifact: ArtifactVersionRecord = {
      id: randomUUID(),
      uploadId: ticket.id,
      humanTaskId: ticket.humanTaskId,
      workId: ticket.workId,
      tenantId: ticket.tenantId,
      personId: ticket.personId,
      fileName: ticket.fileName,
      mediaType: ticket.mediaType,
      sizeBytes: ticket.sizeBytes,
      version,
      digest: serverDigest,
      scanStatus: scanned.scanStatus,
      parseError: scanned.parseError,
      previewAvailable: scanned.previewAvailable,
      previewText: scanned.previewText,
      publicStorageUrl: null,
      createdAt: now,
    };
    const doneTicket: UploadTicketRecord = {
      ...ticket,
      state: scanned.scanStatus === "REJECTED" ? "REJECTED" : "COMPLETED",
      bytesDigest: serverDigest,
      rejectReason: scanned.scanStatus === "REJECTED" ? scanned.parseError : null,
      updatedAt: now,
    };
    this.tickets.set(ticket.id, doneTicket);
    this.versions.set(artifact.id, artifact);
    this.persistTickets();
    this.persistVersions();
    return artifact;
  }

  /** 列出任务产物版本。 */
  listVersions(
    session: WorkbenchSession,
    taskId: string,
  ): PublishListResponse<ArtifactVersionRecord> {
    this.requireAssigneeTask(session, taskId);
    const items = [...this.versions.values()]
      .filter((item) => item.humanTaskId === taskId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { items, total: items.length };
  }

  /** 读取单条版本元数据。 */
  getVersion(
    session: WorkbenchSession,
    artifactId: string,
  ): ArtifactVersionRecord | null {
    const item = this.versions.get(artifactId);
    if (!item || item.tenantId !== session.tenantId) {
      return null;
    }
    return item;
  }

  /**
   * 读取单条 OutputRelease（供 C10/C11 守卫复用）。
   *
   * Args:
   *   session: 会话。
   *   releaseId: 发布 id。
   *
   * Returns:
   *   记录或 null。
   */
  getRelease(
    session: WorkbenchSession,
    releaseId: string,
  ): OutputReleaseRecord | null {
    const item = this.releases.get(releaseId);
    if (!item || item.tenantId !== session.tenantId) {
      return null;
    }
    return item;
  }

  /**
   * 测试钩子：篡改发布 digest，模拟候选变更。
   *
   * Args:
   *   releaseId: 发布 id。
   *   digest: 新 digest。
   */
  corruptReleaseDigestForTest(releaseId: string, digest: string): void {
    const item = this.releases.get(releaseId);
    if (!item) {
      return;
    }
    this.releases.set(releaseId, { ...item, artifactDigest: digest });
  }

  /**
   * 获准下载：重验 digest；返回字节与元数据。
   */
  downloadVersion(
    session: WorkbenchSession,
    artifactId: string,
  ): { artifact: ArtifactVersionRecord; bytes: Buffer } {
    const artifact = this.getVersion(session, artifactId);
    if (!artifact) {
      throw new Error(`artifact not found: ${artifactId}`);
    }
    if (artifact.scanStatus === "REJECTED") {
      throw new Error("artifact rejected; download denied");
    }
    const ticket = this.tickets.get(artifact.uploadId);
    if (!ticket) {
      throw new Error("upload ticket missing for artifact");
    }
    const bytes = readIsolationBytes(
      this.paths.isolationDir,
      ticket.isolationKey,
    );
    const liveDigest = digestBytes(bytes);
    if (liveDigest !== artifact.digest) {
      throw new Error("digest re-verify failed; content tampered");
    }
    return { artifact, bytes };
  }

  /**
   * 创建 OutputRelease（候选或获准）。
   */
  createRelease(
    session: WorkbenchSession,
    taskId: string,
    request: CreateOutputReleaseRequest,
  ): OutputReleaseRecord {
    const task = this.requireAssigneeTask(session, taskId);
    const normalized = normalizeReleaseRequest(request);
    const artifact = this.versions.get(normalized.artifactVersionId);
    if (!artifact || artifact.humanTaskId !== task.id) {
      throw new Error("artifactVersion not found for task");
    }
    if (artifact.scanStatus === "REJECTED") {
      throw new Error("rejected artifact cannot be released");
    }
    const now = new Date().toISOString();
    const record: OutputReleaseRecord = {
      id: randomUUID(),
      humanTaskId: task.id,
      workId: task.workId,
      tenantId: task.tenantId,
      createdByPersonId: session.personId,
      artifactVersionId: artifact.id,
      artifactDigest: artifact.digest,
      sourceVersionNote: normalized.sourceVersionNote,
      audience: normalized.audience,
      state: normalized.release ? "RELEASED" : "CANDIDATE",
      createdAt: now,
      updatedAt: now,
    };
    this.releases.set(record.id, record);
    this.persistReleases();
    return record;
  }

  /** 列出任务发布。 */
  listReleases(
    session: WorkbenchSession,
    taskId: string,
  ): PublishListResponse<OutputReleaseRecord> {
    const task = this.requireTaskInTenant(session, taskId);
    const items = [...this.releases.values()]
      .filter((item) => item.humanTaskId === task.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { items, total: items.length };
  }

  /**
   * 受众门控视图：未获准或受众不符时无正文。
   */
  viewRelease(
    session: WorkbenchSession,
    releaseId: string,
  ): OutputReleaseView {
    const release = this.releases.get(releaseId);
    if (!release || release.tenantId !== session.tenantId) {
      throw new Error(`output release not found: ${releaseId}`);
    }
    const artifact = this.versions.get(release.artifactVersionId);
    if (!artifact) {
      throw new Error("artifact missing for release");
    }
    return buildReleaseView(release, artifact, session);
  }

  private requireAssigneeTask(
    session: WorkbenchSession,
    taskId: string,
  ): ClaimableHumanTaskRecord {
    const task = this.claims.getTaskForSession(session, taskId);
    if (!task) {
      throw new Error(`claimable task not found: ${taskId}`);
    }
    if (task.state !== "CLAIMED" || task.assigneePersonId !== session.personId) {
      throw new Error("only CLAIMED assignee may manage artifacts");
    }
    return task;
  }

  private requireTaskInTenant(
    session: WorkbenchSession,
    taskId: string,
  ): ClaimableHumanTaskRecord {
    const task = this.claims.getTaskForSession(session, taskId);
    if (!task) {
      throw new Error(`claimable task not found: ${taskId}`);
    }
    return task;
  }

  private requireTicketOwner(
    session: WorkbenchSession,
    uploadId: string,
  ): UploadTicketRecord {
    const ticket = this.tickets.get(uploadId);
    if (!ticket || ticket.tenantId !== session.tenantId) {
      throw new Error(`upload ticket not found: ${uploadId}`);
    }
    if (ticket.personId !== session.personId) {
      throw new Error("upload ticket owner mismatch");
    }
    return ticket;
  }

  private publicTicket(ticket: UploadTicketRecord): UploadTicketRecord {
    return { ...ticket };
  }

  private persistTickets(): void {
    saveTickets(this.paths.tickets, [...this.tickets.values()]);
  }

  private persistVersions(): void {
    saveVersions(this.paths.versions, [...this.versions.values()]);
  }

  private persistReleases(): void {
    saveReleases(this.paths.releases, [...this.releases.values()]);
  }
}
