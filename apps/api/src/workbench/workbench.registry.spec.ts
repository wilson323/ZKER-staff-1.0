/**
 * 双实例工作台登记表测试：幂等、租户隔离、草稿不串、持久化回读。
 */
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { WorkbenchRegistry } from "./workbench.registry";
import { WorkbenchSession } from "./workbench.types";

describe("WorkbenchRegistry", () => {
  let dataDir: string;
  let registry: WorkbenchRegistry;
  const executor: WorkbenchSession = {
    tenantId: "tenant-alpha",
    personId: "demo_executor",
  };
  const otherTenant: WorkbenchSession = {
    tenantId: "tenant-beta",
    personId: "other_user",
  };

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), "zker-wb-"));
    registry = new WorkbenchRegistry();
    registry.useDataDirForTest(dataDir);
    registry.onModuleInit();
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("starts empty for templates instances and todos", () => {
    expect(registry.listPublishedTemplates().total).toBe(0);
    expect(registry.listInstancesForSession(executor).total).toBe(0);
    expect(registry.listTodosForSession(executor).total).toBe(0);
  });

  it("creates A1/A2 from same template with distinct idempotency keys", () => {
    const template = registry.ensurePublishedTemplate({
      code: "biz-intake",
      title: "商务立项模板",
    });
    const a1 = registry.createOrReplayInstance(executor, {
      templateId: template.id,
      title: "A1",
      idempotencyKey: "idem-a1",
      intentKey: "intent-a1",
    });
    const a2 = registry.createOrReplayInstance(executor, {
      templateId: template.id,
      title: "A2",
      idempotencyKey: "idem-a2",
      intentKey: "intent-a2",
    });
    expect(a1.id).not.toBe(a2.id);
    expect(a1.threadId).not.toBe(a2.threadId);
    expect(a1.configId).not.toBe(a2.configId);
    expect(a1.urlPath).not.toBe(a2.urlPath);
    expect(registry.listInstancesForSession(executor).total).toBe(2);
    expect(registry.listTodosForSession(executor).total).toBe(2);
  });

  it("replays same instance for duplicated idempotency key", () => {
    const template = registry.ensurePublishedTemplate({
      code: "biz-intake",
      title: "商务立项模板",
    });
    const first = registry.createOrReplayInstance(executor, {
      templateId: template.id,
      title: "A1",
      idempotencyKey: "idem-same",
      intentKey: "intent-1",
    });
    const second = registry.createOrReplayInstance(executor, {
      templateId: template.id,
      title: "A1-retry",
      idempotencyKey: "idem-same",
      intentKey: "intent-2",
    });
    expect(second.id).toBe(first.id);
    expect(second.title).toBe("A1");
    expect(registry.listInstancesForSession(executor).total).toBe(1);
  });

  it("hides instances and todos from other tenant", () => {
    const template = registry.ensurePublishedTemplate({
      code: "biz-intake",
      title: "商务立项模板",
    });
    registry.createOrReplayInstance(executor, {
      templateId: template.id,
      title: "A1",
      idempotencyKey: "idem-a1",
      intentKey: "intent-a1",
    });
    expect(registry.listInstancesForSession(otherTenant).total).toBe(0);
    expect(registry.listTodosForSession(otherTenant).total).toBe(0);
    const visible = registry.listInstancesForSession(executor).items[0];
    expect(
      registry.getInstanceForSession(otherTenant, visible.id),
    ).toBeUndefined();
  });

  it("keeps drafts isolated between instances", () => {
    const template = registry.ensurePublishedTemplate({
      code: "biz-intake",
      title: "商务立项模板",
    });
    const a1 = registry.createOrReplayInstance(executor, {
      templateId: template.id,
      title: "A1",
      idempotencyKey: "idem-a1",
      intentKey: "intent-a1",
    });
    const a2 = registry.createOrReplayInstance(executor, {
      templateId: template.id,
      title: "A2",
      idempotencyKey: "idem-a2",
      intentKey: "intent-a2",
    });
    registry.saveDraftForSession(executor, a1.id, "draft-A1-only");
    expect(registry.getInstanceForSession(executor, a1.id)?.draft).toBe(
      "draft-A1-only",
    );
    expect(registry.getInstanceForSession(executor, a2.id)?.draft).toBe("");
  });

  it("reloads instances after restart from same data dir", () => {
    const template = registry.ensurePublishedTemplate({
      code: "biz-intake",
      title: "商务立项模板",
    });
    const created = registry.createOrReplayInstance(executor, {
      templateId: template.id,
      title: "A1",
      idempotencyKey: "idem-a1",
      intentKey: "intent-a1",
    });
    const reloaded = new WorkbenchRegistry();
    reloaded.useDataDirForTest(dataDir);
    reloaded.onModuleInit();
    expect(reloaded.listInstancesForSession(executor).total).toBe(1);
    expect(reloaded.getInstanceForSession(executor, created.id)?.title).toBe(
      "A1",
    );
  });
});
