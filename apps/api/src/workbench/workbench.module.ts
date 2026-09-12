/**
 * 双实例工作台 Nest 模块。
 */
import { Module } from "@nestjs/common";
import { WorkbenchController } from "./workbench.controller";
import { WorkbenchRegistry } from "./workbench.registry";

@Module({
  controllers: [WorkbenchController],
  providers: [WorkbenchRegistry],
  exports: [WorkbenchRegistry],
})
export class WorkbenchModule {}
