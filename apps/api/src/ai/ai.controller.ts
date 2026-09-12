/**
 * AI 探测 HTTP 接口。
 */
import { Controller, Get } from "@nestjs/common";
import { OpenAiProtocolAdapter } from "./openai-protocol.adapter";
import { AiProbeResult } from "./ai.types";

@Controller("ai")
export class AiController {
  constructor(private readonly adapter: OpenAiProtocolAdapter) {}

  /**
   * GET /api/v1/ai/probe
   *
   * Returns:
   *   AiProbeResult: 无密钥时 ok=false（真实失败，非 mock 成功）。
   */
  @Get("probe")
  async probe(): Promise<AiProbeResult> {
    return this.adapter.probe();
  }
}
