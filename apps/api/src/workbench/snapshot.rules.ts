/**
 * M1-03 来源确认 / 快照领域规则。
 *
 * TRACE-snapshot-20260912-预览不授权
 */
import { ClaimableHumanTaskRecord } from "./claim.types";
import { digestParts } from "./snapshot.store";
import {
  BaselineSourceRef,
  ConfirmBaselineRequest,
  RegisterSourceRequest,
  SourceVisibility,
  TaskSourceRecord,
} from "./snapshot.types";
import { WorkbenchSession } from "./workbench.types";

/** 权限服务不可用信号头（真 503，非 mock）。 */
export const AUTHZ_UNAVAILABLE_HEADER = "x-authz-unavailable";

/**
 * 判断请求头是否声明权限服务不可用。
 *
 * Args:
 *   headers: 原始请求头。
 *
 * Returns:
 *   true 时应返回 503。
 */
export function isAuthzUnavailable(
  headers: Record<string, string | string[] | undefined>,
): boolean {
  const raw = headers[AUTHZ_UNAVAILABLE_HEADER] ?? headers["X-Authz-Unavailable"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) {
    return false;
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

/**
 * 要求当前会话为任务承担人。
 */
export function assertTaskAssignee(
  session: WorkbenchSession,
  task: ClaimableHumanTaskRecord,
): void {
  if (task.state !== "CLAIMED" || task.assigneePersonId !== session.personId) {
    throw new Error("only current assignee may mutate sources/baseline");
  }
}

/**
 * 规范化登记来源请求。
 */
export function normalizeRegisterSource(
  request: RegisterSourceRequest,
): {
  label: string;
  required: boolean;
  visibility: SourceVisibility;
  supplementHint: string;
} {
  const label = request.label?.trim() ?? "";
  if (!label) {
    throw new Error("label is required");
  }
  const visibility = request.visibility ?? "PERSON";
  if (visibility !== "PERSON" && visibility !== "BACKEND_ONLY") {
    throw new Error("visibility must be PERSON or BACKEND_ONLY");
  }
  return {
    label,
    required: request.required !== false,
    visibility,
    supplementHint: (request.supplementHint ?? "有权人员可在本任务补充来源").trim(),
  };
}

/**
 * 校验确认基线请求与当前任务 epoch。
 */
export function assertConfirmRequest(
  task: ClaimableHumanTaskRecord,
  request: ConfirmBaselineRequest,
): string[] {
  if (
    !Number.isInteger(request.responsibilityEpoch) ||
    request.responsibilityEpoch !== task.responsibilityEpoch
  ) {
    throw new Error(
      `epoch mismatch: expected ${task.responsibilityEpoch}, got ${request.responsibilityEpoch}`,
    );
  }
  if (!Array.isArray(request.sourceIds) || request.sourceIds.length === 0) {
    throw new Error("sourceIds is required");
  }
  const ids = request.sourceIds.map((item) => String(item).trim()).filter(Boolean);
  if (ids.length === 0) {
    throw new Error("sourceIds is required");
  }
  return ids;
}

/**
 * 将 ACTIVE 来源转为基线引用。
 */
export function toBaselineRefs(sources: TaskSourceRecord[]): BaselineSourceRef[] {
  return sources.map((item) => ({
    sourceId: item.id,
    version: item.version,
    label: item.label,
    required: item.required,
  }));
}

/**
 * 计算基线 digest。
 */
export function baselineDigest(
  workId: string,
  epoch: number,
  refs: BaselineSourceRef[],
): string {
  const ordered = [...refs]
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId))
    .map((item) => `${item.sourceId}@${item.version}:${item.required ? 1 : 0}`);
  return digestParts([workId, String(epoch), ...ordered]);
}

/**
 * 重验基线引用是否仍与当前 ACTIVE 来源一致。
 *
 * Args:
 *   refs: 基线锁定引用。
 *   sources: 当前任务来源全集。
 *
 * Returns:
 *   阻断原因；通过则 null。
 */
export function findSourceDrift(
  refs: BaselineSourceRef[],
  sources: TaskSourceRecord[],
): string | null {
  const byId = new Map(sources.map((item) => [item.id, item]));
  for (const ref of refs) {
    if (!ref.required) {
      continue;
    }
    const current = byId.get(ref.sourceId);
    if (!current || current.state !== "ACTIVE") {
      return `required source revoked or missing: ${ref.sourceId}`;
    }
    if (current.version !== ref.version) {
      return `required source version drifted: ${ref.sourceId}`;
    }
  }
  const requiredActive = sources.filter(
    (item) => item.required && item.state === "ACTIVE",
  );
  for (const item of requiredActive) {
    const locked = refs.find((ref) => ref.sourceId === item.id);
    if (!locked) {
      return `required source not in baseline: ${item.id}`;
    }
  }
  return null;
}

/**
 * 人员可见投影（排除 BACKEND_ONLY 正文）。
 */
export function personVisibleSources(
  sources: TaskSourceRecord[],
): TaskSourceRecord[] {
  return sources.filter(
    (item) => item.visibility === "PERSON" && item.state === "ACTIVE",
  );
}
