/**
 * OpenAI 协议适配器结果类型。
 */
export interface AiProbeResult {
  ok: boolean;
  provider: "openai-compatible";
  configured: boolean;
  message: string;
  model?: string;
}

export class AiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigurationError";
  }
}
