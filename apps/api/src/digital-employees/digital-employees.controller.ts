/**
 * 数字员工列表 API。
 */
import { Controller, Get } from "@nestjs/common";
import { DigitalEmployeeRegistry } from "./digital-employee.registry";
import { DigitalEmployeeListResponse } from "./digital-employee.types";

@Controller("digital-employees")
export class DigitalEmployeesController {
  constructor(private readonly registry: DigitalEmployeeRegistry) {}

  /**
   * GET /api/v1/digital-employees
   *
   * Returns:
   *   DigitalEmployeeListResponse: 真实登记结果；空仓 total=0。
   */
  @Get()
  list(): DigitalEmployeeListResponse {
    return this.registry.list();
  }
}
