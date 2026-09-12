/**
 * M1-03 SnapshotRegistry 单元测试。
 */
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { DigitalEmployeeRegistry } from "../digital-employees/digital-employee.registry";
import { ClaimRegistry } from "./claim.registry";
import { SnapshotRegistry } from "./snapshot.registry";
import { WorkbenchSession } from "./workbench.types";

describe("SnapshotRegistry", () => {
  let dataDir: string;
  let claims: ClaimRegistry;
  let registry: SnapshotRegistry;
  const alice: WorkbenchSession = {
    tenantId: "tenant-alpha",
    personId: "demo_executor",
  };

  /**
   * 领取一条任务供来源确认使用。
   */
  function claimedTask(title = "A1") {
    const open = claims.ensureOpenTaskForInstance(alice, {
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
    return claims.claimTask(alice, open.id);
  }

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), "zker-snap-"));
    const employees = new DigitalEmployeeRegistry();
    employees.useStorePathForTest(join(dataDir, "digital-employees.json"));
    employees.onModuleInit();
    claims = new ClaimRegistry(employees);
    claims.useDataDirForTest(dataDir);
    claims.onModuleInit();
    registry = new SnapshotRegistry(claims);
    registry.useDataDirForTest(dataDir);
    registry.onModuleInit();
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("previews person sources only and never authorizes execution", () => {
    const task = claimedTask();
    registry.registerSource(alice, task.id, {
      label: "合同正文",
      required: true,
      visibility: "PERSON",
    });
    registry.registerSource(alice, task.id, {
      label: "后台凭证",
      required: false,
      visibility: "BACKEND_ONLY",
    });
    const preview = registry.previewContext(alice, task.id);
    expect(preview.previewAuthorizedExecution).toBe(false);
    expect(preview.visibleSources).toHaveLength(1);
    expect(preview.visibleSources[0].label).toBe("合同正文");
    expect(preview.backendOnlyActiveCount).toBe(1);
    expect(preview.missingRequired.length).toBeGreaterThan(0);
    const listed = registry.listSourcesForTask(alice, task.id);
    expect(listed.total).toBe(1);
  });

  it("blocks snapshot after required source revoke; isolates instances", () => {
    const a1 = claimedTask("A1");
    const a2 = claimedTask("A2");
    const s1 = registry.registerSource(alice, a1.id, {
      label: "A1事实",
      required: true,
    });
    registry.registerSource(alice, a2.id, {
      label: "A2事实",
      required: true,
    });
    expect(registry.listSourcesForTask(alice, a1.id).items[0].label).toBe(
      "A1事实",
    );
    expect(registry.listSourcesForTask(alice, a2.id).items[0].label).toBe(
      "A2事实",
    );
    const baseline = registry.confirmBaseline(alice, a1.id, {
      sourceIds: [s1.id],
      responsibilityEpoch: a1.responsibilityEpoch,
    });
    expect(baseline.digest.startsWith("sha256:")).toBe(true);
    const preview = registry.previewContext(alice, a1.id);
    const ready = registry.buildExecutionSnapshot(alice, a1.id, {
      previewId: preview.id,
    });
    expect(ready.state).toBe("READY");
    expect(ready.manifestId).toBeTruthy();
    expect(ready.previewId).toBe(preview.id);

    registry.revokeSource(alice, a1.id, s1.id);
    const blocked = registry.buildExecutionSnapshot(alice, a1.id, {
      previewId: preview.id,
    });
    expect(blocked.state).toBe("BLOCKED");
    expect(blocked.blockReason).toMatch(/revoked|drifted|missing/);

    registry.reloadFromDisk();
    const reloaded = registry.getLatestBaseline(alice, a1.id);
    expect(reloaded?.id).toBe(baseline.id);
  });
});
