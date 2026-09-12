/**
 * 数字员工登记表测试：空仓、创建、持久化回读。
 */
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { DigitalEmployeeRegistry } from "./digital-employee.registry";
import { resolveStorePath } from "./digital-employee.store";

describe("DigitalEmployeeRegistry", () => {
  let dataDir: string;
  let storePath: string;
  let registry: DigitalEmployeeRegistry;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), "zker-de-"));
    storePath = resolveStorePath(dataDir);
    registry = new DigitalEmployeeRegistry();
    registry.useStorePathForTest(storePath);
    registry.onModuleInit();
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("starts empty without mock employees", () => {
    const result = registry.list();
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  it("lists registered employees after explicit register", () => {
    registry.register({
      id: "de-1",
      name: "doc-writer",
      createdAt: "2026-09-12T00:00:00.000Z",
    });
    const result = registry.list();
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe("de-1");
  });

  it("persists create and reloads after new registry instance", () => {
    const created = registry.create("  research-aide  ");
    expect(created.name).toBe("research-aide");
    expect(created.id.length).toBeGreaterThan(8);

    const second = new DigitalEmployeeRegistry();
    second.useStorePathForTest(storePath);
    second.onModuleInit();
    const listed = second.list();
    expect(listed.total).toBe(1);
    expect(listed.items[0]).toEqual(created);
  });

  it("rejects blank names", () => {
    expect(() => registry.create("   ")).toThrow(/name is required/);
  });
});
