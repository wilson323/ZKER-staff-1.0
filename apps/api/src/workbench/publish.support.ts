/**
 * M1-05 扫描/预览与受众判定辅助（降低 registry 行数）。
 *
 * TRACE-publish-20260912-扫描受众辅助
 */
import { canPreviewMedia } from "./publish.rules";
import {
  ArtifactVersionRecord,
  OutputReleaseRecord,
  OutputReleaseView,
} from "./publish.types";
import { WorkbenchSession } from "./workbench.types";

/** 扫描与解析结果。 */
export interface ScanParseResult {
  scanStatus: ArtifactVersionRecord["scanStatus"];
  parseError: string | null;
  previewAvailable: boolean;
  previewText: string | null;
}

/**
 * 确定性扫描与文本预览；失败保留真实错误，不造假正文。
 *
 * Args:
 *   mediaType: MIME。
 *   bytes: 原始字节。
 *
 * Returns:
 *   ScanParseResult
 */
export function scanAndParse(
  mediaType: string,
  bytes: Buffer,
): ScanParseResult {
  if (bytes.includes(Buffer.from("MALWARE_SIGNATURE"))) {
    return {
      scanStatus: "REJECTED",
      parseError: "scan rejected: malware signature",
      previewAvailable: false,
      previewText: null,
    };
  }
  if (!canPreviewMedia(mediaType)) {
    return {
      scanStatus: "PARSE_FAILED",
      parseError: `preview unsupported for mediaType ${mediaType}`,
      previewAvailable: false,
      previewText: null,
    };
  }
  try {
    const text = bytes.toString("utf8");
    if (text.includes("\u0000")) {
      throw new Error("binary null byte in text payload");
    }
    return {
      scanStatus: "CLEAN",
      parseError: null,
      previewAvailable: true,
      previewText: text.slice(0, 4000),
    };
  } catch (error: unknown) {
    return {
      scanStatus: "PARSE_FAILED",
      parseError: error instanceof Error ? error.message : String(error),
      previewAvailable: false,
      previewText: null,
    };
  }
}

/**
 * 判断会话是否匹配发布受众。
 *
 * Args:
 *   session: 当前会话。
 *   release: 发布记录。
 *
 * Returns:
 *   boolean
 */
export function isAudienceAllowed(
  session: WorkbenchSession,
  release: OutputReleaseRecord,
): boolean {
  if (release.audience === "TENANT") {
    return session.tenantId === release.tenantId;
  }
  if (release.audience === "ASSIGNEE") {
    return session.personId === release.createdByPersonId;
  }
  if (release.audience === "REVIEWER") {
    return (
      session.tenantId === release.tenantId &&
      session.personId !== release.createdByPersonId
    );
  }
  return false;
}

/**
 * 构建受众门控视图（未获准时清空正文）。
 *
 * Args:
 *   release: 发布记录。
 *   artifact: 产物版本。
 *   session: 当前会话。
 *
 * Returns:
 *   OutputReleaseView
 */
export function buildReleaseView(
  release: OutputReleaseRecord,
  artifact: ArtifactVersionRecord,
  session: WorkbenchSession,
): OutputReleaseView {
  const allowed =
    release.state === "RELEASED" && isAudienceAllowed(session, release);
  if (!allowed) {
    return {
      id: release.id,
      state: release.state,
      audience: release.audience,
      artifactVersionId: artifact.id,
      fileName: artifact.fileName,
      version: artifact.version,
      digest: artifact.digest,
      allowed: false,
      previewText: null,
      parseError: null,
      denyReason:
        release.state !== "RELEASED"
          ? "release not approved for person view"
          : "audience mismatch",
    };
  }
  return {
    id: release.id,
    state: release.state,
    audience: release.audience,
    artifactVersionId: artifact.id,
    fileName: artifact.fileName,
    version: artifact.version,
    digest: artifact.digest,
    allowed: true,
    previewText: artifact.previewText,
    parseError: artifact.parseError,
    denyReason: null,
  };
}
