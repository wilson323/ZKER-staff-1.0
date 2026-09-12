/**
 * 工作流绑定登记表测试：空仓、创建链、校验、持久化回读。
 */
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { DigitalEmployeeRegistry } from "../digital-employees/digital-employee.registry";
import { resolveStorePath } from "../digital-employees/digital-employee.store";
import { WorkflowRegistry } from "./workflow.registry";

describe("WorkflowRegistry", () => {
  let dataDir: string;
  let employees: DigitalEmployeeRegistry;
  let workflow: WorkflowRegistry;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), "zker-wf-"));
    employees = new DigitalEmployeeRegistry();
    employees.useStorePathForTest(resolveStorePath(dataDir));
    employees.onModuleInit();
    workflow = new WorkflowRegistry(employees);
    workflow.useDataDirForTest(dataDir);
    workflow.onModuleInit();
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("starts with empty work/tasks/bindings", () => {
    expect(workflow.listWorkItems().total).toBe(0);
    expect(workflow.listHumanTasks().total).toBe(0);
    expect(workflow.listBindings().total).toBe(0);
  });

  it("creates work item, human task and assisted binding", () => {
    const work = workflow.createWorkItem({ title: "整理客户需求" });
    const task = workflow.createHumanTask({
      workId: work.id,
      assigneePersonId: "person-alice",
      title: "需求整理节点",
    });
    const employee = employees.create("research-aide");
    const binding = workflow.createBinding({
      workId: work.id,
      humanTaskId: task.id,
      configuredBy: "person-alice",
      mode: "ASSISTED",
      digitalEmployeeId: employee.id,
    });
    expect(binding.state).toBe("ACTIVE");
    expect(binding.digitalEmployeeId).toBe(employee.id);
    expect(workflow.listBindings().total).toBe(1);
  });

  it("allows MANUAL binding without digital employee", () => {
    const work = workflow.createWorkItem({ title: "人工复核" });
    const task = workflow.createHumanTask({
      workId: work.id,
      assigneePersonId: "person-bob",
      title: "人工节点",
    });
    const binding = workflow.createBinding({
      workId: work.id,
      humanTaskId: task.id,
      configuredBy: "person-bob",
      mode: "MANUAL",
    });
    expect(binding.digitalEmployeeId).toBeNull();
  });

  it("rejects ASSISTED binding when employee missing", () => {
    const work = workflow.createWorkItem({ title: "x" });
    const task = workflow.createHumanTask({
      workId: work.id,
      assigneePersonId: "p1",
      title: "t1",
    });
    expect(() =>
      workflow.createBinding({
        workId: work.id,
        humanTaskId: task.id,
        configuredBy: "p1",
        mode: "ASSISTED",
        digitalEmployeeId: "missing-de",
      }),
    ).toThrow(/digital employee not found/);
  });

  it("rejects mismatched workId and humanTask", () => {
    const workA = workflow.createWorkItem({ title: "A" });
    const workB = workflow.createWorkItem({ title: "B" });
    const task = workflow.createHumanTask({
      workId: workA.id,
      assigneePersonId: "p1",
      title: "t1",
    });
    expect(() =>
      workflow.createBinding({
        workId: workB.id,
        humanTaskId: task.id,
        configuredBy: "p1",
        mode: "MANUAL",
      }),
    ).toThrow(/does not belong/);
  });

  it("persists bindings across registry reload", () => {
    const work = workflow.createWorkItem({ title: "持久化" });
    const task = workflow.createHumanTask({
      workId: work.id,
      assigneePersonId: "p1",
      title: "t1",
    });
    const created = workflow.createBinding({
      workId: work.id,
      humanTaskId: task.id,
      configuredBy: "p1",
      mode: "MANUAL",
    });

    const secondEmployees = new DigitalEmployeeRegistry();
    secondEmployees.useStorePathForTest(resolveStorePath(dataDir));
    secondEmployees.onModuleInit();
    const second = new WorkflowRegistry(secondEmployees);
    second.useDataDirForTest(dataDir);
    second.onModuleInit();
    expect(second.listWorkItems().total).toBe(1);
    expect(second.listHumanTasks().total).toBe(1);
    expect(second.listBindings().items[0]).toEqual(created);
  });
});
