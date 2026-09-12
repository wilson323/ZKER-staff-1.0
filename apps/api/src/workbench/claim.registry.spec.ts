/**
 * M1-02 领取 / 配置 / 转派登记表测试。
 */
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { DigitalEmployeeRegistry } from "../digital-employees/digital-employee.registry";
import { ClaimRegistry } from "./claim.registry";
import { WorkbenchSession } from "./workbench.types";

describe("ClaimRegistry", () => {
  let dataDir: string;
  let employees: DigitalEmployeeRegistry;
  let registry: ClaimRegistry;
  const alice: WorkbenchSession = {
    tenantId: "tenant-alpha",
    personId: "demo_executor",
  };
  const bob: WorkbenchSession = {
    tenantId: "tenant-alpha",
    personId: "collab_bob",
  };
  const otherTenant: WorkbenchSession = {
    tenantId: "tenant-beta",
    personId: "other_user",
  };

  /**
   * 构造一条 OPEN 任务（经 ensure）。
   */
  function openTask(title = "A1") {
    return registry.ensureOpenTaskForInstance(alice, {
      id: `inst-${title}`,
      templateId: "tpl-1",
      tenantId: alice.tenantId,
      initiatorPersonId: alice.personId,
      title,
      idempotencyKey: `idem-${title}`,
      intentKey: `intent-${title}`,
      state: "OPEN",
      draft: "",
      threadId: `thread-${title}`,
      configId: `config-${title}`,
      urlPath: `/workbench/instances/inst-${title}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), "zker-claim-"));
    employees = new DigitalEmployeeRegistry();
    employees.useStorePathForTest(join(dataDir, "digital-employees.json"));
    employees.onModuleInit();
    registry = new ClaimRegistry(employees);
    registry.useDataDirForTest(dataDir);
    registry.onModuleInit();
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("starts empty and creates OPEN task for instance", () => {
    expect(registry.listTasksForSession(alice).total).toBe(0);
    const task = openTask();
    expect(task.state).toBe("OPEN");
    expect(task.assigneePersonId).toBeNull();
    expect(task.responsibilityEpoch).toBe(0);
    expect(task.revision).toBe(0);
    expect(task.requiredOutputs).toEqual(["交付摘要"]);
    expect(task.budgetTokens).toBe(8000);
    expect(registry.ensureOpenTaskForInstance(alice, {
      ...openTaskMeta("A1"),
      id: task.instanceId,
    }).id).toBe(task.id);
  });

  it("allows only one concurrent claim; loser gets already claimed", () => {
    const task = openTask();
    const first = registry.claimTask(alice, task.id);
    expect(first.state).toBe("CLAIMED");
    expect(first.assigneePersonId).toBe(alice.personId);
    expect(first.revision).toBe(1);
    expect(() => registry.claimTask(bob, task.id)).toThrow(/already claimed/);
    const self = registry.claimTask(alice, task.id);
    expect(self.id).toBe(first.id);
  });

  it("saves person config without starting and rejects preference overrides", () => {
    const task = openTask();
    const claimed = registry.claimTask(alice, task.id);
    const employee = employees.create("aide-1");
    const config = registry.savePersonConfig(alice, claimed.id, {
      mode: "ASSISTED",
      digitalEmployeeId: employee.id,
      preferenceNote: "语气正式",
      expectedRevision: claimed.revision,
      responsibilityEpoch: claimed.responsibilityEpoch,
    });
    expect(config.started).toBe(false);
    expect(config.state).toBe("ACTIVE");
    expect(config.requiredOutputs).toEqual(["交付摘要"]);
    expect(config.budgetTokens).toBe(8000);
    expect(config.preferenceNote).toBe("语气正式");
    expect(config.revision).toBe(claimed.revision + 1);

    const latest = registry.getTaskForSession(alice, claimed.id)!;
    expect(() =>
      registry.savePersonConfig(alice, claimed.id, {
        mode: "MANUAL",
        expectedRevision: latest.revision,
        responsibilityEpoch: latest.responsibilityEpoch,
        budgetTokens: 1,
      }),
    ).toThrow(/budgetTokens cannot be overridden/);
  });

  it("transfer bumps epoch and revokes old config", () => {
    const task = openTask();
    const claimed = registry.claimTask(alice, task.id);
    const cfg = registry.savePersonConfig(alice, claimed.id, {
      mode: "MANUAL",
      expectedRevision: claimed.revision,
      responsibilityEpoch: claimed.responsibilityEpoch,
    });
    const afterSave = registry.getTaskForSession(alice, claimed.id)!;
    const transferred = registry.transferTask(alice, claimed.id, {
      toPersonId: bob.personId,
      expectedRevision: afterSave.revision,
      responsibilityEpoch: afterSave.responsibilityEpoch,
    });
    expect(transferred.assigneePersonId).toBe(bob.personId);
    expect(transferred.responsibilityEpoch).toBe(1);
    expect(registry.getActiveConfigForTask(alice, claimed.id)).toBeUndefined();
    const all = registry.listConfigsForSession(alice).items;
    const old = all.find((item) => item.id === cfg.id);
    expect(old?.state).toBe("REVOKED");
  });

  it("hides tasks across tenants and persists after reload", () => {
    const task = openTask();
    registry.claimTask(alice, task.id);
    expect(registry.listTasksForSession(otherTenant).total).toBe(0);
    expect(registry.getTaskForSession(otherTenant, task.id)).toBeUndefined();
    const reloaded = new ClaimRegistry(employees);
    reloaded.useDataDirForTest(dataDir);
    reloaded.onModuleInit();
    expect(reloaded.listTasksForSession(alice).total).toBe(1);
    expect(reloaded.getTaskForSession(alice, task.id)?.state).toBe("CLAIMED");
  });
});

/**
 * 测试辅助：构造实例元数据。
 */
function openTaskMeta(title: string) {
  return {
    id: `inst-${title}`,
    templateId: "tpl-1",
    tenantId: "tenant-alpha",
    initiatorPersonId: "demo_executor",
    title,
    idempotencyKey: `idem-${title}`,
    intentKey: `intent-${title}`,
    state: "OPEN" as const,
    draft: "",
    threadId: `thread-${title}`,
    configId: `config-${title}`,
    urlPath: `/workbench/instances/inst-${title}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
