/**
 * OpenAI 协议适配器。
 *
 * 强制经官方 OpenAI SDK 创建客户端；未配置 API Key 时真实抛错/探测失败。
 * TRACE-ai-20260912-无密钥必须真实失败不可静默成功
 */
import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { AiConfigurationError, AiProbeResult } from "./ai.types";

@Injectable()
export class OpenAiProtocolAdapter {
  /**
   * 读取环境中的 OpenAI 兼容配置。
   *
   * Returns:
   *   apiKey / baseURL / model 配置快照。
   */
  private readConfig(): {
    apiKey: string | undefined;
    baseURL: string | undefined;
    model: string;
  } {
    return {
      apiKey: process.env.OPENAI_API_KEY?.trim() || undefined,
      baseURL: process.env.OPENAI_BASE_URL?.trim() || undefined,
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    };
  }

  /**
   * 创建 OpenAI 协议客户端。
   *
   * Returns:
   *   OpenAI: 官方 SDK 客户端实例。
   *
   * Raises:
   *   AiConfigurationError: 当 OPENAI_API_KEY 缺失时抛出。
   *
   * Examples:
   *   >>> // 无密钥环境
   *   >>> adapter.createClient() // throws AiConfigurationError
   */
  createClient(): OpenAI {
    const { apiKey, baseURL } = this.readConfig();
    if (!apiKey) {
      throw new AiConfigurationError(
        "OPENAI_API_KEY is not configured; refuse to create client",
      );
    }
    return new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
  }

  /**
   * 探测 AI 配置与客户端可创建性（不发送伪造业务回复）。
   *
   * Returns:
   *   AiProbeResult: configured=false 且 ok=false 表示无密钥真实失败路径。
   */
  async probe(): Promise<AiProbeResult> {
    const { apiKey, model } = this.readConfig();
    if (!apiKey) {
      return {
        ok: false,
        provider: "openai-compatible",
        configured: false,
        message:
          "OPENAI_API_KEY missing; probe failed without fabricating success",
        model,
      };
    }

    try {
      this.createClient();
      return {
        ok: true,
        provider: "openai-compatible",
        configured: true,
        message: "OpenAI-compatible client created successfully",
        model,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "unknown probe failure";
      return {
        ok: false,
        provider: "openai-compatible",
        configured: true,
        message,
        model,
      };
    }
  }
}
