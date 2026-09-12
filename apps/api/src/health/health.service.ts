/**
 * 健康检查服务：返回真实进程运行信息，禁止伪造。
 */
import { Injectable } from "@nestjs/common";

export interface HealthStatus {
  status: "ok";
  service: string;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
}

@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();

  /**
   * 生成实时健康状态。
   *
   * Returns:
   *   HealthStatus: 含真实 uptime 与 UTC 时间戳。
   *
   * Examples:
   *   >>> service.getStatus().status
   *   'ok'
   */
  getStatus(): HealthStatus {
    return {
      status: "ok",
      service: "zker-api",
      version: "0.1.0-m0",
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
  }
}
