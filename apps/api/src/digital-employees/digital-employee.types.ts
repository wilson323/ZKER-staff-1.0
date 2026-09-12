/**
 * 数字员工领域类型（M0+ 最小字段，后续对照 contracts 扩展）。
 */
export interface DigitalEmployeeRecord {
  id: string;
  name: string;
  createdAt: string;
}

export interface DigitalEmployeeListResponse {
  items: DigitalEmployeeRecord[];
  total: number;
}

/**
 * 创建数字员工请求体。
 */
export interface CreateDigitalEmployeeRequest {
  name: string;
}
