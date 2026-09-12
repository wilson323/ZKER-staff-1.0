/**
 * 健康检查控制器。
 */
import { Controller, Get } from "@nestjs/common";
import { HealthService, HealthStatus } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * GET /api/v1/health
   *
   * Returns:
   *   HealthStatus: 真实进程健康信息。
   */
  @Get()
  getHealth(): HealthStatus {
    return this.healthService.getStatus();
  }
}
