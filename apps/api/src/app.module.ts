/**
 * 根模块：装配健康检查、数字员工、工作流绑定、双实例工作台与 AI 探测。
 */
import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { DigitalEmployeesModule } from "./digital-employees/digital-employees.module";
import { AiModule } from "./ai/ai.module";
import { WorkflowModule } from "./workflow/workflow.module";
import { WorkbenchModule } from "./workbench/workbench.module";

@Module({
  imports: [
    HealthModule,
    DigitalEmployeesModule,
    WorkflowModule,
    WorkbenchModule,
    AiModule,
  ],
})
export class AppModule {}
