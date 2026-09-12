/**
 * M1-01 双实例工作台类型。
 *
 * 对齐 47 号最小切片：同模板双实例、幂等键、租户/人员待办投影。
 * 非正式完整 C01/C02 合同；会话暂用请求头派生。
 */

/** 已发布流程模板。 */
export interface ProcessTemplateRecord {
  id: string;
  code: string;
  title: string;
  published: boolean;
  createdAt: string;
}

/** 流程实例状态。 */
export type ProcessInstanceState = "OPEN" | "CLOSED";

/**
 * 流程实例：同模板可并存多笔，幂等键防重复。
 */
export interface ProcessInstanceRecord {
  id: string;
  templateId: string;
  tenantId: string;
  initiatorPersonId: string;
  title: string;
  idempotencyKey: string;
  intentKey: string;
  state: ProcessInstanceState;
  /** 实例私有草稿，禁止跨实例串写。 */
  draft: string;
  /** 实例私有线程标识。 */
  threadId: string;
  /** 实例私有配置标识。 */
  configId: string;
  /** 前端路由用深链片段。 */
  urlPath: string;
  createdAt: string;
  updatedAt: string;
}

/** 个人待办投影。 */
export interface WorkbenchTodoRecord {
  id: string;
  instanceId: string;
  tenantId: string;
  assigneePersonId: string;
  title: string;
  createdAt: string;
}

/** 会话主体（由请求头派生，禁止正文传入）。 */
export interface WorkbenchSession {
  tenantId: string;
  personId: string;
}

/** 列表响应。 */
export interface ListResponse<T> {
  items: T[];
  total: number;
}

/** 创建/确保模板请求。 */
export interface EnsureTemplateRequest {
  code: string;
  title: string;
}

/** 发起实例请求（主体不在正文）。 */
export interface CreateInstanceRequest {
  templateId: string;
  title: string;
  idempotencyKey: string;
  intentKey: string;
}

/** 保存草稿请求。 */
export interface SaveDraftRequest {
  draft: string;
}
