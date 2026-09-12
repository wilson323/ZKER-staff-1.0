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
import { claimHumanTask, fetchClaimableTasks } from "./claim-api-client";
import {
  createContextPreview,
  registerTaskSource,
} from "./snapshot-api-client";
import { startAttempt } from "./attempt-api-client";
import { prepareArtifactUpload } from "./publish-api-client";

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

  it("claims human task with session headers", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "task-1",
          workId: "wi-1",
          instanceId: "wi-1",
          tenantId: "tenant-alpha",
          title: "领取：A1",
          state: "CLAIMED",
          assigneePersonId: "demo_executor",
          responsibilityEpoch: 0,
          revision: 1,
          requiredOutputs: ["交付摘要"],
          budgetTokens: 8000,
          createdAt: "2026-09-12T03:00:00.000Z",
          updatedAt: "2026-09-12T03:00:01.000Z",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const session = {
      tenantId: "tenant-alpha",
      personId: "demo_executor",
    };
    const list = await fetchClaimableTasks(session);
    expect(list.total).toBe(0);
    const claimed = await claimHumanTask(session, "task-1");
    expect(claimed.state).toBe("CLAIMED");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/workbench/claimable-tasks/task-1/claim",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Tenant-Id": "tenant-alpha",
          "X-Person-Id": "demo_executor",
        }),
      }),
    );
  });

  it("registers source and previews without execution auth", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "src-1",
          humanTaskId: "task-1",
          workId: "wi-1",
          tenantId: "tenant-alpha",
          label: "合同正文",
          version: 1,
          visibility: "PERSON",
          required: true,
          state: "ACTIVE",
          supplementHint: "补充",
          createdAt: "2026-09-12T03:30:00.000Z",
          updatedAt: "2026-09-12T03:30:00.000Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "prev-1",
          baselineId: null,
          visibleSources: [],
          missingRequired: [],
          backendOnlyActiveCount: 0,
          previewAuthorizedExecution: false,
          createdAt: "2026-09-12T03:30:01.000Z",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const session = {
      tenantId: "tenant-alpha",
      personId: "demo_executor",
    };
    const source = await registerTaskSource(session, "task-1", {
      label: "合同正文",
      required: true,
    });
    expect(source.id).toBe("src-1");
    const preview = await createContextPreview(session, "task-1");
    expect(preview.previewAuthorizedExecution).toBe(false);
  });

  it("starts attempt via session write client", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({
        id: "att-1",
        humanTaskId: "task-1",
        workId: "wi-1",
        mode: "ASSISTED",
        fence: 1,
        attemptNumber: 1,
        state: "QUEUED",
        stage: "已受理，等待调度",
        idempotencyKey: "idem-1",
        parentAttemptId: null,
        newAttemptNotice: null,
        publishedOutputs: [],
        personEvidence: [],
        modelInvoked: false,
        pauseResumeSupported: false,
        unknownReason: null,
        reconcileNote: null,
        createdAt: "2026-09-12T03:40:00.000Z",
        updatedAt: "2026-09-12T03:40:00.000Z",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const session = {
      tenantId: "tenant-alpha",
      personId: "demo_executor",
    };
    const attempt = await startAttempt(session, "task-1", {
      idempotencyKey: "idem-1",
    });
    expect(attempt.state).toBe("QUEUED");
    expect(attempt.pauseResumeSupported).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/workbench/claimable-tasks/task-1/attempts",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("prepares artifact upload via session write client", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "up-1",
        humanTaskId: "task-1",
        fileName: "out.md",
        mediaType: "text/markdown",
        sizeBytes: 12,
        state: "PREPARED",
        bytesDigest: null,
        createdAt: "2026-09-12T03:45:00.000Z",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const session = {
      tenantId: "tenant-alpha",
      personId: "demo_executor",
    };
    const ticket = await prepareArtifactUpload(session, "task-1", {
      fileName: "out.md",
      mediaType: "text/markdown",
      sizeBytes: 12,
    });
    expect(ticket.state).toBe("PREPARED");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/workbench/claimable-tasks/task-1/artifacts/prepare",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
