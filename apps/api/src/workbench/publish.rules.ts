/**
 * M1-05 产物上传与受众发布规则。
 *
 * TRACE-publish-20260912-校验规则
 */
import {
  CompleteUploadRequest,
  CreateOutputReleaseRequest,
  PrepareUploadRequest,
  ReleaseAudience,
} from "./publish.types";

/** 允许的媒体类型（本切片白名单）。 */
const ALLOWED_MEDIA = new Set([
  "text/plain",
  "text/markdown",
  "application/json",
  "application/octet-stream",
]);

/** 明确拒绝的危险类型。 */
const REJECTED_MEDIA = new Set([
  "application/x-msdownload",
  "application/x-executable",
  "text/html",
]);

/** 单文件上限 5MiB（本切片）。 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * 规范化 prepare 请求。
 *
 * Args:
 *   request: 原始请求。
 *
 * Returns:
 *   PrepareUploadRequest
 *
 * Raises:
 *   Error: 字段非法。
 */
export function normalizePrepareRequest(
  request: PrepareUploadRequest,
): PrepareUploadRequest {
  const fileName = String(request?.fileName ?? "").trim();
  const mediaType = String(request?.mediaType ?? "")
    .trim()
    .toLowerCase();
  const sizeBytes = Number(request?.sizeBytes);
  if (!fileName || fileName.length > 255) {
    throw new Error("fileName is required (1..255)");
  }
  if (fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) {
    throw new Error("fileName must be a plain name without path");
  }
  if (!mediaType) {
    throw new Error("mediaType is required");
  }
  if (REJECTED_MEDIA.has(mediaType)) {
    throw new Error(`mediaType rejected: ${mediaType}`);
  }
  if (!ALLOWED_MEDIA.has(mediaType)) {
    throw new Error(`mediaType not allowed: ${mediaType}`);
  }
  if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_UPLOAD_BYTES) {
    throw new Error(`sizeBytes must be 1..${MAX_UPLOAD_BYTES}`);
  }
  return { fileName, mediaType, sizeBytes };
}

/**
 * 规范化 complete 请求。
 */
export function normalizeCompleteRequest(
  request: CompleteUploadRequest | null | undefined,
): CompleteUploadRequest {
  const raw = request?.clientDigest;
  if (raw === undefined || raw === null || raw === "") {
    return { clientDigest: null };
  }
  const digest = String(raw).trim();
  if (!/^sha256:[a-f0-9]{64}$/.test(digest)) {
    throw new Error("clientDigest must match sha256:[64 hex]");
  }
  return { clientDigest: digest };
}

/**
 * 规范化发布请求。
 */
export function normalizeReleaseRequest(
  request: CreateOutputReleaseRequest,
): CreateOutputReleaseRequest {
  const artifactVersionId = String(request?.artifactVersionId ?? "").trim();
  const audience = String(request?.audience ?? "").trim() as ReleaseAudience;
  const sourceVersionNote = String(request?.sourceVersionNote ?? "").trim();
  const release = Boolean(request?.release);
  if (!artifactVersionId) {
    throw new Error("artifactVersionId is required");
  }
  if (!isAudience(audience)) {
    throw new Error("audience must be ASSIGNEE|REVIEWER|TENANT");
  }
  if (!sourceVersionNote) {
    throw new Error("sourceVersionNote is required");
  }
  return { artifactVersionId, audience, sourceVersionNote, release };
}

/**
 * 是否允许文本预览。
 */
export function canPreviewMedia(mediaType: string): boolean {
  return mediaType === "text/plain" || mediaType === "text/markdown";
}

/**
 * 校验受众枚举。
 */
export function isAudience(value: string): value is ReleaseAudience {
  return value === "ASSIGNEE" || value === "REVIEWER" || value === "TENANT";
}
