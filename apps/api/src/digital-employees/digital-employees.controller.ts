/**
 * 数字员工列表与创建 API。
 */
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Post,
} from "@nestjs/common";
import { DigitalEmployeeRegistry } from "./digital-employee.registry";
import {
  CreateDigitalEmployeeRequest,
  DigitalEmployeeListResponse,
  DigitalEmployeeRecord,
} from "./digital-employee.types";

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

  /**
   * POST /api/v1/digital-employees
   *
   * Args:
   *   body: { name } 员工显示名。
   *
   * Returns:
   *   DigitalEmployeeRecord: 新建并已持久化的记录。
   *
   * Raises:
   *   BadRequestException: 名称为空。
   *   ConflictException: id 冲突（极少见）。
   */
  @Post()
  @HttpCode(201)
  create(@Body() body: CreateDigitalEmployeeRequest): DigitalEmployeeRecord {
    const name = typeof body?.name === "string" ? body.name : "";
    if (!name.trim()) {
      throw new BadRequestException("name is required");
    }
    try {
      return this.registry.create(name);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("already exists")) {
        throw new ConflictException(message);
      }
      throw new BadRequestException(message);
    }
  }
}
