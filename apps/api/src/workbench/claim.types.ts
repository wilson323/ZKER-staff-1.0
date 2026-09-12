/**
 * M1-02 领取 / 本人配置最小类型。
 *
 * 对齐 47 号：C03 原子领取、C04 配置保存（不启动）、转派抬升 epoch。
 * 非正式完整合同字段全集。
 */

/** 可领取人任务状态。 */
export type ClaimableTaskState = "OPEN" | "CLAIMED";

/** 本人配置执行模式。 */
export type PersonConfigMode = "MANUAL" | "ASSISTED" | "AUTONOMOUS";

/** 本人配置生命周期。 */
export type PersonConfigState = "ACTIVE" | "REVOKED";

/**
 * 可领取人任务：挂在流程实例上，责任 epoch 与 revision 做 CAS。
 */
export interface ClaimableHumanTaskRecord {
  id: string;
  /** 对应流程实例 id，兼作 workId。 */
  workId: string;
  instanceId: string;
  tenantId: string;
  title: string;
  state: ClaimableTaskState;
  assigneePersonId: string | null;
  responsibilityEpoch: number;
  revision: number;
  /** 任务必需输出（不可被偏好覆盖）。 */
  requiredOutputs: string[];
  /** 组织预算上限（不可被偏好覆盖）。 */
  budgetTokens: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 本人配置版本：保存不启动执行。
 */
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
  /** 允许的偏好覆盖字段（仅备注类）。 */
  preferenceNote: string;
  /** 配置保存永不置 true。 */
  started: false;
  state: PersonConfigState;
  createdAt: string;
  updatedAt: string;
}

/** 列表响应。 */
export interface ClaimListResponse<T> {
  items: T[];
  total: number;
}

/** 领取请求（主体来自会话，正文可空）。 */
export interface ClaimTaskRequest {
  /** 可选幂等备注，不参与主体。 */
  note?: string;
}

/** 转派请求。 */
export interface TransferTaskRequest {
  toPersonId: string;
  expectedRevision: number;
  responsibilityEpoch: number;
}

/** 保存本人配置请求。 */
export interface SavePersonConfigRequest {
  mode: PersonConfigMode;
  digitalEmployeeId?: string | null;
  preferenceNote?: string;
  expectedRevision: number;
  responsibilityEpoch: number;
  /**
   * 若客户端试图覆盖必需输出/预算，服务端拒绝（不允许偏好越权）。
   */
  requiredOutputs?: string[];
  budgetTokens?: number;
}
