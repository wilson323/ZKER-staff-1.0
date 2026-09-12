/**
 * 双实例工作台 + M1-02..06 领取、快照、有界执行、产物发布、审核交付 Nest 模块。
 */
import { Module } from "@nestjs/common";
import { DigitalEmployeesModule } from "../digital-employees/digital-employees.module";
import { AttemptController } from "./attempt.controller";
import { AttemptRegistry } from "./attempt.registry";
import { ClaimController } from "./claim.controller";
import { ClaimRegistry } from "./claim.registry";
import { PublishController } from "./publish.controller";
import { PublishRegistry } from "./publish.registry";
import { DeliveryRegistry } from "./review.delivery-registry";
import { ReviewController } from "./review.controller";
import { ReviewRegistry } from "./review.registry";
import { SnapshotController } from "./snapshot.controller";
import { SnapshotRegistry } from "./snapshot.registry";
import { WorkbenchController } from "./workbench.controller";
import { WorkbenchRegistry } from "./workbench.registry";

@Module({
  imports: [DigitalEmployeesModule],
  controllers: [
    WorkbenchController,
    ClaimController,
    SnapshotController,
    AttemptController,
    PublishController,
    ReviewController,
  ],
  providers: [
    WorkbenchRegistry,
    ClaimRegistry,
    SnapshotRegistry,
    AttemptRegistry,
    PublishRegistry,
    ReviewRegistry,
    DeliveryRegistry,
  ],
  exports: [
    WorkbenchRegistry,
    ClaimRegistry,
    SnapshotRegistry,
    AttemptRegistry,
    PublishRegistry,
    ReviewRegistry,
    DeliveryRegistry,
  ],
})
export class WorkbenchModule {}
