/**
 * 双实例工作台 + M1-02 领取配置 + M1-03 来源快照 Nest 模块。
 */
import { Module } from "@nestjs/common";
import { DigitalEmployeesModule } from "../digital-employees/digital-employees.module";
import { ClaimController } from "./claim.controller";
import { ClaimRegistry } from "./claim.registry";
import { SnapshotController } from "./snapshot.controller";
import { SnapshotRegistry } from "./snapshot.registry";
import { WorkbenchController } from "./workbench.controller";
import { WorkbenchRegistry } from "./workbench.registry";

@Module({
  imports: [DigitalEmployeesModule],
  controllers: [WorkbenchController, ClaimController, SnapshotController],
  providers: [WorkbenchRegistry, ClaimRegistry, SnapshotRegistry],
  exports: [WorkbenchRegistry, ClaimRegistry, SnapshotRegistry],
})
export class WorkbenchModule {}
