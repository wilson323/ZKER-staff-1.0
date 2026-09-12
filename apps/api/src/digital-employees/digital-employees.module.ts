/**
 * 数字员工模块：真实登记表，默认空，禁止 mock 员工。
 */
import { Module } from "@nestjs/common";
import { DigitalEmployeesController } from "./digital-employees.controller";
import { DigitalEmployeeRegistry } from "./digital-employee.registry";

@Module({
  controllers: [DigitalEmployeesController],
  providers: [DigitalEmployeeRegistry],
  exports: [DigitalEmployeeRegistry],
})
export class DigitalEmployeesModule {}
