/**
 * M1-04 AttemptRegistry 单元测试。
 */
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { DigitalEmployeeRegistry } from "../digital-employees/digital-employee.registry";
import { AttemptRegistry } from "./attempt.registry";
import { ClaimRegistry } from "./claim.registry";
import { SnapshotRegistry } from "./snapshot.registry";
import { WorkbenchSession } from "./workbench.types";

describe("AttemptRegistry", () => {
  let dataDir: string;
  let employees: DigitalEmployeeRegistry;
  let claims: ClaimRegistry;
  let snapshots: SnapshotRegistry;
  let registry: AttemptRegistry;
  const alice: WorkbenchSession = {
    tenantId: "tenant-alpha",
    personId: "demo_executor",
  };

  /**
   * 领取任务并准备 READY 快照 + ACTIVE 配置。
   */
  function prepareReady(mode: "MANUAL" | "ASSISTED" = "ASSISTED") {
    const open = claims.ensureOpenTaskForInstance(alice, {
      id: `inst-${mode}`,
      templateId: "tpl-1",
      tenantId: alice.tenantId,
      initiatorPersonId: alice.personId,
      title: mode,
      idempotencyKey: `idem-${mode}`,
      intentKey: `intent-${mode}`,
      state: "OPEN",
      draft: "",
      threadId: `thread-${mode}`,
      configId: `config-${mode}`,
      urlPath: `/workbench/instances/inst-${mode}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const task = claims.claimTask(alice, open.id);
    let digitalEmployeeId: string | null = null;
    if (mode === "ASSISTED") {
      const emp = employees.create("aide-1");
      digitalEmployeeId = emp.id;
    }
    claims.savePersonConfig(alice, task.id, {
      mode,
      digitalEmployeeId,
      expectedRevision: task.revision,
      responsibilityEpoch: task.responsibilityEpoch,
    });
    const source = snapshots.registerSource(alice, task.id, {
      label: "事实",
      required: true,
    });
    snapshots.confirmBaseline(alice, task.id, {
      sourceIds: [source.id],
      responsibilityEpoch: task.responsibilityEpoch,
    });
    const preview = snapshots.previewContext(alice, task.id);
    const snap = snapshots.buildExecutionSnapshot(alice, task.id, {
      previewId: preview.id,
    });
    expect(snap.state).toBe("READY");
    return { task, snap };
  }

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), "zker-attempt-"));
    employees = new DigitalEmployeeRegistry();
    employees.useStorePathForTest(join(dataDir, "digital-employees.json"));
    employees.onModuleInit();
    claims = new ClaimRegistry(employees);
    claims.useDataDirForTest(dataDir);
    claims.onModuleInit();
    snapshots = new SnapshotRegistry(claims);
    snapshots.useDataDirForTest(dataDir);
    snapshots.onModuleInit();
    registry = new AttemptRegistry(claims, snapshots);
    registry.useDataDirForTest(dataDir);
    registry.onModuleInit();
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("starts QUEUED with idempotency and advances ASSISTED to SUCCEEDED", () => {
    const { task } = prepareReady("ASSISTED");
    const a1 = registry.startAttempt(alice, task.id, {
      idempotencyKey: "idem-run-1",
    });
    expect(a1.state).toBe("QUEUED");
    expect(a1.pauseResumeSupported).toBe(false);
    const again = registry.startAttempt(alice, task.id, {
      idempotencyKey: "idem-run-1",
    });
    expect(again.id).toBe(a1.id);
    expect(() =>
      registry.startAttempt(alice, task.id, { idempotencyKey: "idem-run-2" }),
    ).toThrow(/fence occupied/);

    let cur = registry.advanceAttempt(alice, a1.id);
    expect(cur.state).toBe("PREPARING");
    cur = registry.advanceAttempt(alice, a1.id);
    expect(cur.state).toBe("RUNNING");
    expect(cur.modelInvoked).toBe(true);
    cur = registry.advanceAttempt(alice, a1.id);
    expect(cur.state).toBe("SUCCEEDED");
    expect(cur.publishedOutputs.length).toBe(1);
  });

  it("manual path never invokes model and records person evidence", () => {
    const { task } = prepareReady("MANUAL");
    let cur = registry.startAttempt(alice, task.id, {
      idempotencyKey: "manual-1",
    });
    cur = registry.advanceAttempt(alice, cur.id);
    cur = registry.advanceAttempt(alice, cur.id);
    cur = registry.advanceAttempt(alice, cur.id);
    expect(cur.state).toBe("SUCCEEDED");
    expect(cur.modelInvoked).toBe(false);
    expect(cur.personEvidence[0]?.kind).toBe("manual_completion");
  });

  it("cancel then new attempt requires acknowledge; RESULT_UNKNOWN needs reconcile", () => {
    const { task } = prepareReady("ASSISTED");
    const first = registry.startAttempt(alice, task.id, {
      idempotencyKey: "c1",
    });
    registry.cancelAttempt(alice, first.id, { reason: "改需求" });
    expect(() =>
      registry.startAttempt(alice, task.id, { idempotencyKey: "c2" }),
    ).toThrow(/acknowledgeNewAttempt/);
    const second = registry.startAttempt(alice, task.id, {
      idempotencyKey: "c2",
      acknowledgeNewAttempt: true,
    });
    expect(second.attemptNumber).toBe(2);
    expect(second.parentAttemptId).toBe(first.id);
    expect(second.newAttemptNotice).toMatch(/不是原执行的续跑/);

    registry.advanceAttempt(alice, second.id);
    registry.advanceAttempt(alice, second.id);
    const running = registry.markExternalWriteUnknown(alice, second.id);
    expect(running.state).toBe("RESULT_UNKNOWN");
    expect(() => registry.advanceAttempt(alice, second.id)).toThrow(
      /C14 reconcile/,
    );
    const done = registry.reconcileAttempt(alice, second.id, {
      outcome: "SUCCEEDED",
      evidence: "对端确认已写入",
    });
    expect(done.state).toBe("SUCCEEDED");
    expect(done.reconcileNote).toMatch(/对端确认/);

    registry.reloadFromDisk();
    const listed = registry.listAttempts(alice, task.id);
    expect(listed.total).toBe(2);
    expect(listed.items.some((item) => item.state === "SUCCEEDED")).toBe(true);
  });
});
