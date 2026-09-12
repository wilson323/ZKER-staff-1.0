/**
 * M1-06 ReviewRegistry / DeliveryRegistry 单元测试。
 */
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { DigitalEmployeeRegistry } from "../digital-employees/digital-employee.registry";
import { ClaimRegistry } from "./claim.registry";
import { PublishRegistry } from "./publish.registry";
import { DeliveryRegistry } from "./review.delivery-registry";
import { ReviewRegistry } from "./review.registry";
import { SnapshotRegistry } from "./snapshot.registry";
import { WorkbenchSession } from "./workbench.types";

describe("Review and Delivery registries", () => {
  let dataDir: string;
  let claims: ClaimRegistry;
  let snapshots: SnapshotRegistry;
  let publish: PublishRegistry;
  let reviews: ReviewRegistry;
  let deliveries: DeliveryRegistry;
  const alice: WorkbenchSession = {
    tenantId: "tenant-alpha",
    personId: "demo_executor",
  };
  const reviewer: WorkbenchSession = {
    tenantId: "tenant-alpha",
    personId: "demo_reviewer",
  };

  /**
   * 准备已领取任务 + 基线 + 获准发布产物。
   */
  function prepareCandidate() {
    const open = claims.ensureOpenTaskForInstance(alice, {
      id: "inst-rev",
      templateId: "tpl-1",
      tenantId: alice.tenantId,
      initiatorPersonId: alice.personId,
      title: "审核交付",
      idempotencyKey: "idem-rev",
      intentKey: "intent-rev",
      state: "OPEN",
      draft: "",
      threadId: "thread-rev",
      configId: "config-rev",
      urlPath: "/workbench/instances/inst-rev",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const task = claims.claimTask(alice, open.id);
    const source = snapshots.registerSource(alice, task.id, {
      label: "合同",
      required: true,
      visibility: "PERSON",
    });
    const baseline = snapshots.confirmBaseline(alice, task.id, {
      sourceIds: [source.id],
      responsibilityEpoch: task.responsibilityEpoch,
    });
    const body = Buffer.from("交付正文", "utf8");
    const ticket = publish.prepareUpload(alice, task.id, {
      fileName: "out.md",
      mediaType: "text/markdown",
      sizeBytes: body.length,
    });
    publish.putUploadBytes(alice, ticket.id, body);
    const art = publish.completeUpload(alice, ticket.id, {});
    const release = publish.createRelease(alice, task.id, {
      artifactVersionId: art.id,
      audience: "REVIEWER",
      sourceVersionNote: "v1",
      release: true,
    });
    const fresh = claims.getTaskForSession(alice, task.id)!;
    return { task: fresh, baseline, art, release };
  }

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), "zker-review-"));
    const employees = new DigitalEmployeeRegistry();
    employees.useStorePathForTest(join(dataDir, "digital-employees.json"));
    employees.onModuleInit();
    claims = new ClaimRegistry(employees);
    claims.useDataDirForTest(dataDir);
    claims.onModuleInit();
    snapshots = new SnapshotRegistry(claims);
    snapshots.useDataDirForTest(dataDir);
    snapshots.onModuleInit();
    publish = new PublishRegistry(claims);
    publish.useDataDirForTest(dataDir);
    publish.onModuleInit();
    reviews = new ReviewRegistry(claims, publish, snapshots);
    reviews.useDataDirForTest(dataDir);
    reviews.onModuleInit();
    deliveries = new DeliveryRegistry(claims, publish, snapshots, reviews);
    deliveries.useDataDirForTest(dataDir);
    deliveries.onModuleInit();
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("rejects self-approval and completes unique delivery after OA confirm", () => {
    const { task, baseline, art, release } = prepareCandidate();
    expect(() =>
      reviews.requestReview(alice, task.id, {
        candidateReleaseId: release.id,
        baselineId: baseline.id,
        reviewerMemberId: alice.personId,
        expectedRevision: task.revision,
        responsibilityEpoch: task.responsibilityEpoch,
      }),
    ).toThrow(/self-approval/);

    const req = reviews.requestReview(alice, task.id, {
      candidateReleaseId: release.id,
      baselineId: baseline.id,
      reviewerMemberId: reviewer.personId,
      expectedRevision: task.revision,
      responsibilityEpoch: task.responsibilityEpoch,
    });
    const receipt = reviews.decideReview(reviewer, req.id, {
      decision: "APPROVE",
      reason: "材料齐全",
      candidateDigest: release.artifactDigest,
      expectedRevision: req.revision,
    });
    expect(receipt.decision).toBe("APPROVE");

    const check = deliveries.checkCompletion(alice, task.id, {
      artifactVersionIds: [art.id],
      baselineId: baseline.id,
      approvalReceiptIds: [receipt.id],
      expectedRevision: task.revision,
      responsibilityEpoch: task.responsibilityEpoch,
    });
    const delivery = deliveries.submitDelivery(alice, task.id, {
      completionCheckId: check.id,
      artifactVersionIds: [art.id],
      baselineId: baseline.id,
      approvalReceiptIds: [receipt.id],
      provenanceNote: "人工上传证据",
      expectedRevision: task.revision,
      responsibilityEpoch: task.responsibilityEpoch,
    });
    expect(delivery.oaSyncState).toBe("PENDING_COMMIT");
    expect(deliveries.viewDelivery(alice, delivery.id).delivered).toBe(false);

    expect(() =>
      deliveries.submitDelivery(alice, task.id, {
        completionCheckId: check.id,
        artifactVersionIds: [art.id],
        baselineId: baseline.id,
        approvalReceiptIds: [receipt.id],
        provenanceNote: "重复",
        expectedRevision: task.revision,
        responsibilityEpoch: task.responsibilityEpoch,
      }),
    ).toThrow(/already exists/);

    deliveries.confirmOaDelivery(alice, delivery.id);
    expect(deliveries.viewDelivery(alice, delivery.id).delivered).toBe(true);
    deliveries.reloadFromDisk();
    expect(deliveries.viewDelivery(alice, delivery.id).delivered).toBe(true);
  });

  it("obsoletes review on candidate change and rejects expired preflight", () => {
    const { task, baseline, art, release } = prepareCandidate();
    const req = reviews.requestReview(alice, task.id, {
      candidateReleaseId: release.id,
      baselineId: baseline.id,
      reviewerMemberId: reviewer.personId,
      expectedRevision: task.revision,
      responsibilityEpoch: task.responsibilityEpoch,
    });
    publish.corruptReleaseDigestForTest(
      release.id,
      `sha256:${"b".repeat(64)}`,
    );
    expect(() =>
      reviews.decideReview(reviewer, req.id, {
        decision: "APPROVE",
        reason: "过时候选",
        candidateDigest: release.artifactDigest,
        expectedRevision: req.revision,
      }),
    ).toThrow(/candidate changed/);
    expect(reviews.listReviews(alice, task.id).items[0].state).toBe("OBSOLETE");

    publish.corruptReleaseDigestForTest(release.id, release.artifactDigest);
    const req2 = reviews.requestReview(alice, task.id, {
      candidateReleaseId: release.id,
      baselineId: baseline.id,
      reviewerMemberId: reviewer.personId,
      expectedRevision: task.revision,
      responsibilityEpoch: task.responsibilityEpoch,
    });
    const receipt = reviews.decideReview(reviewer, req2.id, {
      decision: "APPROVE",
      reason: "通过",
      candidateDigest: release.artifactDigest,
      expectedRevision: req2.revision,
    });
    const check = deliveries.checkCompletion(alice, task.id, {
      artifactVersionIds: [art.id],
      baselineId: baseline.id,
      approvalReceiptIds: [receipt.id],
      expectedRevision: task.revision,
      responsibilityEpoch: task.responsibilityEpoch,
    });
    deliveries.expireCheckForTest(check.id);
    expect(() =>
      deliveries.submitDelivery(alice, task.id, {
        completionCheckId: check.id,
        artifactVersionIds: [art.id],
        baselineId: baseline.id,
        approvalReceiptIds: [receipt.id],
        provenanceNote: "过期预检",
        expectedRevision: task.revision,
        responsibilityEpoch: task.responsibilityEpoch,
      }),
    ).toThrow(/expired/);
  });
});
