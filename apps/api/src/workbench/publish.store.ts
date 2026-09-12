/**
 * M1-05 产物 JSON/隔离区落盘；复用 common/json-array-store。
 *
 * TRACE-publish-20260912-落盘隔离
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  asObject,
  loadJsonArray,
  requireBoolean,
  requireNonEmptyString,
  requirePositiveInt,
  saveJsonArray,
} from "../common/json-array-store";
import { resolveDataDir } from "../digital-employees/digital-employee.store";
import {
  ArtifactScanStatus,
  ArtifactVersionRecord,
  OutputReleaseRecord,
  OutputReleaseState,
  ReleaseAudience,
  UploadTicketRecord,
  UploadTicketState,
} from "./publish.types";

const TICKETS = "artifact-upload-tickets.json";
const VERSIONS = "artifact-versions.json";
const RELEASES = "output-releases.json";
const ISOLATION = "upload-isolation";

/** 存储路径集合。 */
export interface PublishStorePaths {
  tickets: string;
  versions: string;
  releases: string;
  isolationDir: string;
}

/**
 * 解析产物存储路径。
 *
 * Args:
 *   dataDir: 可选根目录。
 *
 * Returns:
 *   PublishStorePaths
 */
export function resolvePublishStorePaths(dataDir?: string): PublishStorePaths {
  const root = dataDir ?? resolveDataDir();
  return {
    tickets: join(root, TICKETS),
    versions: join(root, VERSIONS),
    releases: join(root, RELEASES),
    isolationDir: join(root, ISOLATION),
  };
}

/**
 * 计算字节摘要。
 *
 * Args:
 *   bytes: 原始字节。
 *
 * Returns:
 *   sha256:hex
 */
export function digestBytes(bytes: Buffer): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

/**
 * 写入隔离区字节（原子替换）。
 */
export function writeIsolationBytes(
  isolationDir: string,
  isolationKey: string,
  bytes: Buffer,
): void {
  const target = join(isolationDir, isolationKey);
  mkdirSync(join(target, ".."), { recursive: true });
  const temp = `${target}.${process.pid}.tmp`;
  writeFileSync(temp, bytes);
  renameSync(temp, target);
}

/**
 * 读取隔离区字节。
 */
export function readIsolationBytes(
  isolationDir: string,
  isolationKey: string,
): Buffer {
  const target = join(isolationDir, isolationKey);
  if (!existsSync(target)) {
    throw new Error(`isolation bytes missing: ${isolationKey}`);
  }
  return readFileSync(target);
}

/** 装载上传票据。 */
export function loadTickets(storePath: string): UploadTicketRecord[] {
  return loadJsonArray(storePath, "upload-tickets").map(assertTicket);
}

/** 保存上传票据。 */
export function saveTickets(
  storePath: string,
  items: UploadTicketRecord[],
): void {
  saveJsonArray(storePath, items);
}

/** 装载 ArtifactVersion。 */
export function loadVersions(storePath: string): ArtifactVersionRecord[] {
  return loadJsonArray(storePath, "artifact-versions").map(assertVersion);
}

/** 保存 ArtifactVersion。 */
export function saveVersions(
  storePath: string,
  items: ArtifactVersionRecord[],
): void {
  saveJsonArray(storePath, items);
}

/** 装载 OutputRelease。 */
export function loadReleases(storePath: string): OutputReleaseRecord[] {
  return loadJsonArray(storePath, "output-releases").map(assertRelease);
}

/** 保存 OutputRelease。 */
export function saveReleases(
  storePath: string,
  items: OutputReleaseRecord[],
): void {
  saveJsonArray(storePath, items);
}

function assertTicket(value: unknown): UploadTicketRecord {
  const record = asObject(value, "uploadTicket");
  const state = requireNonEmptyString(record, "state") as UploadTicketState;
  assertTicketState(state);
  return {
    id: requireNonEmptyString(record, "id"),
    humanTaskId: requireNonEmptyString(record, "humanTaskId"),
    workId: requireNonEmptyString(record, "workId"),
    tenantId: requireNonEmptyString(record, "tenantId"),
    personId: requireNonEmptyString(record, "personId"),
    fileName: requireNonEmptyString(record, "fileName"),
    mediaType: requireNonEmptyString(record, "mediaType"),
    sizeBytes: requirePositiveInt(record, "sizeBytes"),
    state,
    isolationKey: requireNonEmptyString(record, "isolationKey"),
    bytesDigest: requireNullableString(record, "bytesDigest"),
    rejectReason: requireNullableString(record, "rejectReason"),
    createdAt: requireNonEmptyString(record, "createdAt"),
    updatedAt: requireNonEmptyString(record, "updatedAt"),
  };
}

function assertVersion(value: unknown): ArtifactVersionRecord {
  const record = asObject(value, "artifactVersion");
  const scanStatus = requireNonEmptyString(
    record,
    "scanStatus",
  ) as ArtifactScanStatus;
  assertScan(scanStatus);
  const publicStorageUrl = record.publicStorageUrl;
  if (publicStorageUrl !== null) {
    throw new Error("invalid artifactVersion: publicStorageUrl must be null");
  }
  return {
    id: requireNonEmptyString(record, "id"),
    uploadId: requireNonEmptyString(record, "uploadId"),
    humanTaskId: requireNonEmptyString(record, "humanTaskId"),
    workId: requireNonEmptyString(record, "workId"),
    tenantId: requireNonEmptyString(record, "tenantId"),
    personId: requireNonEmptyString(record, "personId"),
    fileName: requireNonEmptyString(record, "fileName"),
    mediaType: requireNonEmptyString(record, "mediaType"),
    sizeBytes: requirePositiveInt(record, "sizeBytes"),
    version: requirePositiveInt(record, "version"),
    digest: requireNonEmptyString(record, "digest"),
    scanStatus,
    parseError: requireNullableString(record, "parseError"),
    previewAvailable: requireBoolean(record, "previewAvailable"),
    previewText: requireNullableString(record, "previewText"),
    publicStorageUrl: null,
    createdAt: requireNonEmptyString(record, "createdAt"),
  };
}

function assertRelease(value: unknown): OutputReleaseRecord {
  const record = asObject(value, "outputRelease");
  const audience = requireNonEmptyString(record, "audience") as ReleaseAudience;
  const state = requireNonEmptyString(record, "state") as OutputReleaseState;
  if (
    audience !== "ASSIGNEE" &&
    audience !== "REVIEWER" &&
    audience !== "TENANT"
  ) {
    throw new Error("invalid outputRelease: audience");
  }
  if (state !== "CANDIDATE" && state !== "RELEASED" && state !== "BLOCKED") {
    throw new Error("invalid outputRelease: state");
  }
  return {
    id: requireNonEmptyString(record, "id"),
    humanTaskId: requireNonEmptyString(record, "humanTaskId"),
    workId: requireNonEmptyString(record, "workId"),
    tenantId: requireNonEmptyString(record, "tenantId"),
    createdByPersonId: requireNonEmptyString(record, "createdByPersonId"),
    artifactVersionId: requireNonEmptyString(record, "artifactVersionId"),
    artifactDigest: requireNonEmptyString(record, "artifactDigest"),
    sourceVersionNote: requireNonEmptyString(record, "sourceVersionNote"),
    audience,
    state,
    createdAt: requireNonEmptyString(record, "createdAt"),
    updatedAt: requireNonEmptyString(record, "updatedAt"),
  };
}

function assertTicketState(state: string): void {
  const allowed: UploadTicketState[] = [
    "PREPARED",
    "BYTES_WRITTEN",
    "COMPLETED",
    "REJECTED",
  ];
  if (!allowed.includes(state as UploadTicketState)) {
    throw new Error(`invalid uploadTicket: state ${state}`);
  }
}

function assertScan(status: string): void {
  if (
    status !== "CLEAN" &&
    status !== "REJECTED" &&
    status !== "PARSE_FAILED"
  ) {
    throw new Error(`invalid artifactVersion: scanStatus ${status}`);
  }
}

function requireNullableString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`invalid record: ${key}`);
  }
  return value;
}
