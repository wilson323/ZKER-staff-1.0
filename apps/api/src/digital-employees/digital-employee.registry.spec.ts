/**
 * 数字员工登记表测试：确保默认无 mock 数据。
 */
import { DigitalEmployeeRegistry } from "./digital-employee.registry";

describe("DigitalEmployeeRegistry", () => {
  it("starts empty without mock employees", () => {
    const registry = new DigitalEmployeeRegistry();
    const result = registry.list();
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  it("lists registered employees after explicit register", () => {
    const registry = new DigitalEmployeeRegistry();
    registry.register({
      id: "de-1",
      name: "doc-writer",
      createdAt: "2026-09-12T00:00:00.000Z",
    });
    const result = registry.list();
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe("de-1");
  });
});
