/**
 * 最小工作流连接类型（人对任务、任务对数字员工绑定）。
 *
 * 对齐 contracts oa_binding / HumanTask 语义的最小可落盘字段；
 * 非完整 C04 合同实现。
 */

/** 任务执行模式。 */
export type BindingMode = "MANUAL" | "ASSISTED" | "AUTONOMOUS";

/** 绑定生命周期状态。 */
export type BindingState = "DRAFT" | "ACTIVE" | "REVOKED";

/** 人任务状态。 */
export type HumanTaskState = "AVAILABLE" | "ASSIGNED";

/**
 * 工作项（业务工作最小记录）。
 */
export interface WorkItemRecord {
  id: string;
  title: string;
  createdAt: string;
}

/**
 * 人任务（当前责任最小记录）。
 */
export interface HumanTaskRecord {
  id: string;
  workId: string;
  assigneePersonId: string;
  title: string;
  state: HumanTaskState;
  createdAt: string;
}

/**
 * 任务绑定：人 + 人任务 + 可选数字员工。
 */
export interface TaskBindingRecord {
  id: string;
  workId: string;
  humanTaskId: string;
  configuredBy: string;
  mode: BindingMode;
  digitalEmployeeId: string | null;
  state: BindingState;
  responsibilityEpoch: number;
  configVersion: number;
  createdAt: string;
  updatedAt: string;
}

/** 列表响应。 */
export interface ListResponse<T> {
  items: T[];
  total: number;
}

/** 创建工作项请求。 */
export interface CreateWorkItemRequest {
  title: string;
}

/** 创建人任务请求。 */
export interface CreateHumanTaskRequest {
  workId: string;
  assigneePersonId: string;
  title: string;
}

/** 创建任务绑定请求。 */
export interface CreateTaskBindingRequest {
  workId: string;
  humanTaskId: string;
  configuredBy: string;
  mode: BindingMode;
  digitalEmployeeId?: string | null;
  responsibilityEpoch?: number;
}
