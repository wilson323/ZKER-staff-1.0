/**
 * M1-02 领取 / 本人配置 API 客户端（会话头派生，禁 mock）。
 */
import {
  fetchWithSession,
  writeWithSession,
  type ListResponse,
  type WorkbenchSession,
} from "./workbench-api-client";

/** 可领取人任务。 */
export interface ClaimableHumanTaskRecord {
  id: string;
  workId: string;
  instanceId: string;
  tenantId: string;
  title: string;
  state: "OPEN" | "CLAIMED";
  assigneePersonId: string | null;
  responsibilityEpoch: number;
  revision: number;
  requiredOutputs: string[];
  budgetTokens: number;
  createdAt: string;
  updatedAt: string;
}

/** 本人配置模式。 */
export type PersonConfigMode = "MANUAL" | "ASSISTED" | "AUTONOMOUS";

/** 本人配置记录。 */
export interface PersonConfigRecord {
  id: string;
  humanTaskId: string;
  workId: string;
  configuredBy: string;
  mode: PersonConfigMode;
  digitalEmployeeId: string | null;
  responsibilityEpoch: number;
  revision: number;
  requiredOutputs: string[];
  budgetTokens: number;
  preferenceNote: string;
  started: false;
  state: "ACTIVE" | "REVOKED";
  createdAt: string;
  updatedAt: string;
}

/**
 * 拉取本租户可领取任务。
 */
export async function fetchClaimableTasks(
  session: WorkbenchSession,
  baseUrl = "/api/v1",
): Promise<ListResponse<ClaimableHumanTaskRecord>> {
  return fetchWithSession(
    "/workbench/claimable-tasks",
    session,
    "claimable tasks",
    baseUrl,
  );
}

/**
 * 领取人任务。
 */
export async function claimHumanTask(
  session: WorkbenchSession,
  taskId: string,
  baseUrl = "/api/v1",
): Promise<ClaimableHumanTaskRecord> {
  return writeWithSession(
    `/workbench/claimable-tasks/${taskId}/claim`,
    "POST",
    session,
    {},
    "claim human task",
    baseUrl,
  );
}

/**
 * 转派人任务。
 */
export async function transferHumanTask(
  session: WorkbenchSession,
  taskId: string,
  input: {
    toPersonId: string;
    expectedRevision: number;
    responsibilityEpoch: number;
  },
  baseUrl = "/api/v1",
): Promise<ClaimableHumanTaskRecord> {
  return writeWithSession(
    `/workbench/claimable-tasks/${taskId}/transfer`,
    "POST",
    session,
    input,
    "transfer human task",
    baseUrl,
  );
}

/**
 * 保存本人配置（不启动）。
 */
export async function savePersonConfig(
  session: WorkbenchSession,
  taskId: string,
  input: {
    mode: PersonConfigMode;
    digitalEmployeeId?: string | null;
    preferenceNote?: string;
    expectedRevision: number;
    responsibilityEpoch: number;
  },
  baseUrl = "/api/v1",
): Promise<PersonConfigRecord> {
  return writeWithSession(
    `/workbench/claimable-tasks/${taskId}/config`,
    "PUT",
    session,
    input,
    "save person config",
    baseUrl,
  );
}

/**
 * 读取任务当前 ACTIVE 配置。
 */
export async function fetchActivePersonConfig(
  session: WorkbenchSession,
  taskId: string,
  baseUrl = "/api/v1",
): Promise<PersonConfigRecord> {
  return fetchWithSession(
    `/workbench/claimable-tasks/${taskId}/config`,
    session,
    "person config",
    baseUrl,
  );
}
