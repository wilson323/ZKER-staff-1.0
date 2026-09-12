/**
 * API 客户端单元测试（纯函数契约）。
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchDigitalEmployees, fetchHealth } from "./api-client";

describe("api-client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses health payload from real fetch response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "ok",
          service: "zker-api",
          version: "0.1.0-m0",
          uptimeSeconds: 1,
          timestamp: "2026-09-12T00:00:00.000Z",
        }),
      }),
    );
    const health = await fetchHealth();
    expect(health.status).toBe("ok");
  });

  it("parses empty digital employee list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [], total: 0 }),
      }),
    );
    const list = await fetchDigitalEmployees();
    expect(list.total).toBe(0);
    expect(list.items).toEqual([]);
  });
});
