/**
 * API 客户端单元测试（纯函数契约）。
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import {
  createDigitalEmployee,
  createTaskBinding,
  fetchDigitalEmployees,
  fetchHealth,
  fetchTaskBindings,
} from "./api-client";
import {
  createWorkbenchInstance,
  fetchWorkbenchTodos,
} from "./workbench-api-client";

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

  it("posts create digital employee payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "uuid-1",
        name: "aide",
        createdAt: "2026-09-12T02:00:00.000Z",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const created = await createDigitalEmployee("aide");
    expect(created.id).toBe("uuid-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/digital-employees",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "aide" }),
      }),
    );
  });

  it("posts task binding payload and parses list", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "bind-1",
          workId: "w1",
          humanTaskId: "t1",
          configuredBy: "person-alice",
          mode: "ASSISTED",
          digitalEmployeeId: "de-1",
          state: "ACTIVE",
          responsibilityEpoch: 1,
          configVersion: 1,
          createdAt: "2026-09-12T03:00:00.000Z",
          updatedAt: "2026-09-12T03:00:00.000Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ id: "bind-1" }], total: 1 }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const created = await createTaskBinding({
      workId: "w1",
      humanTaskId: "t1",
      configuredBy: "person-alice",
      mode: "ASSISTED",
      digitalEmployeeId: "de-1",
    });
    expect(created.id).toBe("bind-1");
    const listed = await fetchTaskBindings();
    expect(listed.total).toBe(1);
  });

  it("sends workbench session headers when creating instance", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "inst-1",
        templateId: "tpl-1",
        tenantId: "tenant-alpha",
        initiatorPersonId: "demo_executor",
        title: "A1",
        idempotencyKey: "idem-a1",
        intentKey: "intent-a1",
        state: "OPEN",
        draft: "",
        threadId: "thread-inst-1",
        configId: "config-inst-1",
        urlPath: "/workbench/instances/inst-1",
        createdAt: "2026-09-12T03:10:00.000Z",
        updatedAt: "2026-09-12T03:10:00.000Z",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const session = {
      tenantId: "tenant-alpha",
      personId: "demo_executor",
    };
    const created = await createWorkbenchInstance(session, {
      templateId: "tpl-1",
      title: "A1",
      idempotencyKey: "idem-a1",
      intentKey: "intent-a1",
    });
    expect(created.id).toBe("inst-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/workbench/instances",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Tenant-Id": "tenant-alpha",
          "X-Person-Id": "demo_executor",
        }),
      }),
    );
  });

  it("fetches workbench todos with session headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0 }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const list = await fetchWorkbenchTodos({
      tenantId: "tenant-alpha",
      personId: "demo_executor",
    });
    expect(list.total).toBe(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/workbench/todos",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Tenant-Id": "tenant-alpha",
          "X-Person-Id": "demo_executor",
        }),
      }),
    );
  });
});
