/**
 * AI 模块：OpenAI 协议适配器（无密钥真实失败）。
 */
import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { OpenAiProtocolAdapter } from "./openai-protocol.adapter";

@Module({
  controllers: [AiController],
  providers: [OpenAiProtocolAdapter],
  exports: [OpenAiProtocolAdapter],
})
export class AiModule {}
