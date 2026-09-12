/**
 * 根模块：装配健康检查、数字员工、工作流绑定与 AI 探测。
 */
import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { DigitalEmployeesModule } from "./digital-employees/digital-employees.module";
import { AiModule } from "./ai/ai.module";
import { WorkflowModule } from "./workflow/workflow.module";

@Module({
  imports: [HealthModule, DigitalEmployeesModule, WorkflowModule, AiModule],
})
export class AppModule {}
