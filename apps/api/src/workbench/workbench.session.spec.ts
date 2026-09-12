/**
 * 会话头解析单元测试。
 */
import { UnauthorizedException } from "@nestjs/common";
import { resolveSessionFromHeaders } from "./workbench.session";

describe("resolveSessionFromHeaders", () => {
  it("parses tenant and person from headers", () => {
    const session = resolveSessionFromHeaders({
      "x-tenant-id": "tenant-alpha",
      "x-person-id": "demo_executor",
    });
    expect(session).toEqual({
      tenantId: "tenant-alpha",
      personId: "demo_executor",
    });
  });

  it("rejects missing session headers", () => {
    expect(() =>
      resolveSessionFromHeaders({ "x-tenant-id": "tenant-alpha" }),
    ).toThrow(UnauthorizedException);
  });
});
