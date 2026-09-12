/**
 * json-array-store 单元测试。
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  asObject,
  loadJsonArray,
  requireBoolean,
  requireNonEmptyString,
  requireNonNegativeInt,
  requirePositiveInt,
  requireStringAllowEmpty,
  saveJsonArray,
} from "./json-array-store";

describe("json-array-store", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "zker-json-store-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("load missing file returns empty array", () => {
    expect(loadJsonArray(join(dir, "missing.json"), "t")).toEqual([]);
  });

  it("save then load round-trips", () => {
    const path = join(dir, "items.json");
    saveJsonArray(path, [{ id: "1" }]);
    expect(loadJsonArray(path, "items")).toEqual([{ id: "1" }]);
  });

  it("rejects non-array store", () => {
    const path = join(dir, "bad.json");
    writeFileSync(path, "{}\n", "utf8");
    expect(() => loadJsonArray(path, "bad")).toThrow(TypeError);
  });

  it("field helpers validate shapes", () => {
    const record = {
      name: "a",
      note: "",
      n: 0,
      p: 2,
      flag: true,
    };
    expect(asObject(record, "r")).toBe(record);
    expect(requireNonEmptyString(record, "name")).toBe("a");
    expect(requireStringAllowEmpty(record, "note")).toBe("");
    expect(requireNonNegativeInt(record, "n")).toBe(0);
    expect(requirePositiveInt(record, "p")).toBe(2);
    expect(requireBoolean(record, "flag")).toBe(true);
    expect(() => asObject(null, "r")).toThrow(/not an object/);
    expect(() => requireNonEmptyString(record, "note")).toThrow(/note/);
    expect(() => requirePositiveInt(record, "n")).toThrow(/n/);
  });
});
