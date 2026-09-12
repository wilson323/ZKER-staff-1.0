/**
 * 双实例工作台 + M1-02 领取配置 Nest 模块。
 */
import { Module } from "@nestjs/common";
import { DigitalEmployeesModule } from "../digital-employees/digital-employees.module";
import { ClaimController } from "./claim.controller";
import { ClaimRegistry } from "./claim.registry";
import { WorkbenchController } from "./workbench.controller";
import { WorkbenchRegistry } from "./workbench.registry";

@Module({
  imports: [DigitalEmployeesModule],
  controllers: [WorkbenchController, ClaimController],
  providers: [WorkbenchRegistry, ClaimRegistry],
  exports: [WorkbenchRegistry, ClaimRegistry],
})
export class WorkbenchModule {}
