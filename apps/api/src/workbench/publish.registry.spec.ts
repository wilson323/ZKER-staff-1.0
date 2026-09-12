/**
 * M1-05 PublishRegistry 单元测试。
 */
import { createHash } from "crypto";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { DigitalEmployeeRegistry } from "../digital-employees/digital-employee.registry";
import { ClaimRegistry } from "./claim.registry";
import { PublishRegistry } from "./publish.registry";
import { WorkbenchSession } from "./workbench.types";

describe("PublishRegistry", () => {
  let dataDir: string;
  let employees: DigitalEmployeeRegistry;
  let claims: ClaimRegistry;
  let registry: PublishRegistry;
  const alice: WorkbenchSession = {
    tenantId: "tenant-alpha",
    personId: "demo_executor",
  };
  const reviewer: WorkbenchSession = {
    tenantId: "tenant-alpha",
    personId: "demo_reviewer",
  };

  /**
   * 创建已领取任务。
   */
  function claimedTask() {
    const open = claims.ensureOpenTaskForInstance(alice, {
      id: "inst-pub",
      templateId: "tpl-1",
      tenantId: alice.tenantId,
      initiatorPersonId: alice.personId,
      title: "产物",
      idempotencyKey: "idem-pub",
      intentKey: "intent-pub",
      state: "OPEN",
      draft: "",
      threadId: "thread-pub",
      configId: "config-pub",
      urlPath: "/workbench/instances/inst-pub",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return claims.claimTask(alice, open.id);
  }

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), "zker-publish-"));
    employees = new DigitalEmployeeRegistry();
    employees.useStorePathForTest(join(dataDir, "digital-employees.json"));
    employees.onModuleInit();
    claims = new ClaimRegistry(employees);
    claims.useDataDirForTest(dataDir);
    claims.onModuleInit();
    registry = new PublishRegistry(claims);
    registry.useDataDirForTest(dataDir);
    registry.onModuleInit();
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("uploads with server digest and versions same fileName", () => {
    const task = claimedTask();
    const body = Buffer.from("hello-v1", "utf8");
    const ticket = registry.prepareUpload(alice, task.id, {
      fileName: "报告.md",
      mediaType: "text/markdown",
      sizeBytes: body.length,
    });
    registry.putUploadBytes(alice, ticket.id, body);
    const v1 = registry.completeUpload(alice, ticket.id, {});
    expect(v1.version).toBe(1);
    expect(v1.publicStorageUrl).toBeNull();
    expect(v1.digest).toBe(
      `sha256:${createHash("sha256").update(body).digest("hex")}`,
    );
    expect(v1.previewText).toBe("hello-v1");

    const body2 = Buffer.from("hello-v2", "utf8");
    const t2 = registry.prepareUpload(alice, task.id, {
      fileName: "报告.md",
      mediaType: "text/markdown",
      sizeBytes: body2.length,
    });
    registry.putUploadBytes(alice, t2.id, body2);
    const v2 = registry.completeUpload(alice, t2.id, {});
    expect(v2.version).toBe(2);
    expect(v2.id).not.toBe(v1.id);
  });

  it("rejects clientDigest mismatch and blocks unreleased body", () => {
    const task = claimedTask();
    const body = Buffer.from("secret-body", "utf8");
    const ticket = registry.prepareUpload(alice, task.id, {
      fileName: "out.txt",
      mediaType: "text/plain",
      sizeBytes: body.length,
    });
    registry.putUploadBytes(alice, ticket.id, body);
    expect(() =>
      registry.completeUpload(alice, ticket.id, {
        clientDigest: `sha256:${"0".repeat(64)}`,
      }),
    ).toThrow(/clientDigest mismatch/);

    const art = registry.completeUpload(alice, ticket.id, {});
    const candidate = registry.createRelease(alice, task.id, {
      artifactVersionId: art.id,
      audience: "REVIEWER",
      sourceVersionNote: "来源 v1",
      release: false,
    });
    const denied = registry.viewRelease(reviewer, candidate.id);
    expect(denied.allowed).toBe(false);
    expect(denied.previewText).toBeNull();

    const released = registry.createRelease(alice, task.id, {
      artifactVersionId: art.id,
      audience: "REVIEWER",
      sourceVersionNote: "来源 v1",
      release: true,
    });
    const ok = registry.viewRelease(reviewer, released.id);
    expect(ok.allowed).toBe(true);
    expect(ok.previewText).toBe("secret-body");
    const assigneeDenied = registry.viewRelease(alice, released.id);
    expect(assigneeDenied.allowed).toBe(false);
  });

  it("keeps parse failure without fake body and re-verifies download", () => {
    const task = claimedTask();
    const body = Buffer.from([0x00, 0x01, 0x02, 0xff]);
    const ticket = registry.prepareUpload(alice, task.id, {
      fileName: "blob.bin",
      mediaType: "application/octet-stream",
      sizeBytes: body.length,
    });
    registry.putUploadBytes(alice, ticket.id, body);
    const art = registry.completeUpload(alice, ticket.id, {});
    expect(art.scanStatus).toBe("PARSE_FAILED");
    expect(art.previewText).toBeNull();
    expect(art.parseError).toMatch(/preview unsupported/);
    const dl = registry.downloadVersion(alice, art.id);
    expect(dl.bytes.equals(body)).toBe(true);
  });
});
