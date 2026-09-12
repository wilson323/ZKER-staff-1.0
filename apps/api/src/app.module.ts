/**
 * 根模块：装配健康检查、数字员工登记与 AI 探测。
 */
import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { DigitalEmployeesModule } from "./digital-employees/digital-employees.module";
import { AiModule } from "./ai/ai.module";

@Module({
  imports: [HealthModule, DigitalEmployeesModule, AiModule],
})
export class AppModule {}
