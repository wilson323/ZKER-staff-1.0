/**
 * 工作流模块：人/任务/员工绑定真实读写。
 */
import { Module } from "@nestjs/common";
import { DigitalEmployeesModule } from "../digital-employees/digital-employees.module";
import { WorkflowController } from "./workflow.controller";
import { WorkflowRegistry } from "./workflow.registry";

@Module({
  imports: [DigitalEmployeesModule],
  controllers: [WorkflowController],
  providers: [WorkflowRegistry],
  exports: [WorkflowRegistry],
})
export class WorkflowModule {}
