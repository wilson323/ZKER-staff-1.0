/**
 * API 入口：启动 NestJS HTTP 服务。
 *
 * 默认监听 3080，全局前缀 /api/v1。
 * PUT /workbench/uploads/:id/bytes 使用原始字节体。
 */
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import express from "express";
import { AppModule } from "./app.module";

/**
 * 按路径选择 JSON 或原始字节解析。
 */
function selectBodyParser(): express.RequestHandler {
  const jsonParser = express.json({ limit: "1mb" });
  const rawParser = express.raw({ type: "*/*", limit: "6mb" });
  return (req, res, next) => {
    if (
      req.method === "PUT" &&
      /\/workbench\/uploads\/[^/]+\/bytes$/.test(req.path)
    ) {
      return rawParser(req, res, next);
    }
    return jsonParser(req, res, next);
  };
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    bodyParser: false,
  });
  app.use(selectBodyParser());
  app.setGlobalPrefix("api/v1");
  const port = Number(process.env.PORT ?? 3080);
  await app.listen(port, "127.0.0.1");
}

bootstrap().catch((error: unknown) => {
  // TRACE-api-20260912-启动失败必须真实退出
  console.error("[api] bootstrap failed", error);
  process.exit(1);
});
