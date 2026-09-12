/**
 * M1-05 产物与受众发布 API 客户端（复用会话 HTTP，禁 mock）。
 */
import {
  fetchWithSession,
  writeWithSession,
  type ListResponse,
  type WorkbenchSession,
} from "./workbench-api-client";

/** 上传票据。 */
export interface UploadTicketRecord {
  id: string;
  humanTaskId: string;
  fileName: string;
  mediaType: string;
  sizeBytes: number;
  state: string;
  bytesDigest: string | null;
  createdAt: string;
}

/** 产物版本。 */
export interface ArtifactVersionRecord {
  id: string;
  uploadId: string;
  fileName: string;
  mediaType: string;
  sizeBytes: number;
  version: number;
  digest: string;
  scanStatus: string;
  parseError: string | null;
  previewAvailable: boolean;
  previewText: string | null;
  publicStorageUrl: null;
  createdAt: string;
}

/** 受众发布。 */
export interface OutputReleaseRecord {
  id: string;
  artifactVersionId: string;
  artifactDigest: string;
  sourceVersionNote: string;
  audience: "ASSIGNEE" | "REVIEWER" | "TENANT";
  state: "CANDIDATE" | "RELEASED" | "BLOCKED";
  createdAt: string;
}

/** 人员视图。 */
export interface OutputReleaseView {
  id: string;
  state: string;
  audience: string;
  fileName: string;
  version: number;
  digest: string;
  allowed: boolean;
  previewText: string | null;
  parseError: string | null;
  denyReason: string | null;
}

/**
 * C20 prepare。
 */
export function prepareArtifactUpload(
  session: WorkbenchSession,
  taskId: string,
  body: { fileName: string; mediaType: string; sizeBytes: number },
): Promise<UploadTicketRecord> {
  return writeWithSession(
    `/workbench/claimable-tasks/${taskId}/artifacts/prepare`,
    "POST",
    session,
    body,
    "prepare upload",
  );
}

/**
 * PUT 原始字节到隔离区。
 */
export async function putUploadBytes(
  session: WorkbenchSession,
  uploadId: string,
  bytes: Uint8Array,
  baseUrl = "/api/v1",
): Promise<UploadTicketRecord> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const response = await fetch(`${baseUrl}/workbench/uploads/${uploadId}/bytes`, {
    method: "PUT",
    headers: {
      "X-Tenant-Id": session.tenantId,
      "X-Person-Id": session.personId,
      "Content-Type": "application/octet-stream",
    },
    body: copy.buffer,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`put upload bytes failed: ${response.status} ${detail}`);
  }
  return (await response.json()) as UploadTicketRecord;
}

/**
 * complete：服务端重算 digest。
 */
export function completeArtifactUpload(
  session: WorkbenchSession,
  uploadId: string,
  clientDigest?: string | null,
): Promise<ArtifactVersionRecord> {
  return writeWithSession(
    `/workbench/uploads/${uploadId}/complete`,
    "POST",
    session,
    { clientDigest: clientDigest ?? null },
    "complete upload",
  );
}

/**
 * 列出产物版本。
 */
export function fetchArtifacts(
  session: WorkbenchSession,
  taskId: string,
): Promise<ListResponse<ArtifactVersionRecord>> {
  return fetchWithSession(
    `/workbench/claimable-tasks/${taskId}/artifacts`,
    session,
    "list artifacts",
  );
}

/**
 * 创建 OutputRelease。
 */
export function createOutputRelease(
  session: WorkbenchSession,
  taskId: string,
  body: {
    artifactVersionId: string;
    audience: "ASSIGNEE" | "REVIEWER" | "TENANT";
    sourceVersionNote: string;
    release: boolean;
  },
): Promise<OutputReleaseRecord> {
  return writeWithSession(
    `/workbench/claimable-tasks/${taskId}/output-releases`,
    "POST",
    session,
    body,
    "create output release",
  );
}

/**
 * 列出任务 OutputRelease。
 */
export function fetchOutputReleases(
  session: WorkbenchSession,
  taskId: string,
): Promise<ListResponse<OutputReleaseRecord>> {
  return fetchWithSession(
    `/workbench/claimable-tasks/${taskId}/output-releases`,
    session,
    "list output releases",
  );
}

/**
 * 受众门控视图。
 */
export function fetchOutputReleaseView(
  session: WorkbenchSession,
  releaseId: string,
): Promise<OutputReleaseView> {
  return fetchWithSession(
    `/workbench/output-releases/${releaseId}/view`,
    session,
    "view output release",
  );
}
