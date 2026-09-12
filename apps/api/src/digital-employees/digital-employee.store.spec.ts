/**
 * 数字员工 JSON 存储单元测试。
 */
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  loadEmployees,
  resolveStorePath,
  saveEmployees,
} from "./digital-employee.store";

describe("digital-employee.store", () => {
  let dataDir: string;
  let storePath: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), "zker-store-"));
    storePath = resolveStorePath(dataDir);
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("returns empty list when store file is missing", () => {
    expect(loadEmployees(storePath)).toEqual([]);
  });

  it("round-trips employees through save and load", () => {
    const records = [
      {
        id: "a",
        name: "alpha",
        createdAt: "2026-09-12T01:00:00.000Z",
      },
    ];
    saveEmployees(storePath, records);
    expect(loadEmployees(storePath)).toEqual(records);
  });

  it("rejects non-array JSON payloads", () => {
    writeFileSync(storePath, '{"items":[]}\n', "utf8");
    expect(() => loadEmployees(storePath)).toThrow(/expected array/);
  });
});
