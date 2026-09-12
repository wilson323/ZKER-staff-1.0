/**
 * 健康检查单元测试。
 */
import { HealthService } from "./health.service";

describe("HealthService", () => {
  it("returns ok with real uptime fields", () => {
    const service = new HealthService();
    const status = service.getStatus();
    expect(status.status).toBe("ok");
    expect(status.service).toBe("zker-api");
    expect(typeof status.uptimeSeconds).toBe("number");
    expect(status.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(status.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
