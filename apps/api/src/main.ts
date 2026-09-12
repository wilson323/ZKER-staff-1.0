/**
 * API 入口：启动 NestJS HTTP 服务。
 *
 * 默认监听 3080，全局前缀 /api/v1。
 */
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix("api/v1");
  const port = Number(process.env.PORT ?? 3080);
  await app.listen(port, "127.0.0.1");
}

bootstrap().catch((error: unknown) => {
  // TRACE-api-20260912-启动失败必须真实退出
  console.error("[api] bootstrap failed", error);
  process.exit(1);
});
