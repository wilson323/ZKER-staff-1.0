/**
 * 双实例工作台 + M1-02/03/04 领取、快照、有界执行 Nest 模块。
 */
import { Module } from "@nestjs/common";
import { DigitalEmployeesModule } from "../digital-employees/digital-employees.module";
import { AttemptController } from "./attempt.controller";
import { AttemptRegistry } from "./attempt.registry";
import { ClaimController } from "./claim.controller";
import { ClaimRegistry } from "./claim.registry";
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
  ],
  providers: [
    WorkbenchRegistry,
    ClaimRegistry,
    SnapshotRegistry,
    AttemptRegistry,
  ],
  exports: [
    WorkbenchRegistry,
    ClaimRegistry,
    SnapshotRegistry,
    AttemptRegistry,
  ],
})
export class WorkbenchModule {}
