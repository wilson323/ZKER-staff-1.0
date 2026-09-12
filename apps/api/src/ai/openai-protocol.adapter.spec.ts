/**
 * OpenAI 协议适配器测试。
 */
import { OpenAiProtocolAdapter } from "./openai-protocol.adapter";
import { AiConfigurationError } from "./ai.types";

describe("OpenAiProtocolAdapter", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }
  });

  it("createClient throws when API key is missing", () => {
    delete process.env.OPENAI_API_KEY;
    const adapter = new OpenAiProtocolAdapter();
    expect(() => adapter.createClient()).toThrow(AiConfigurationError);
  });

  it("probe reports real failure when API key is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    const adapter = new OpenAiProtocolAdapter();
    const result = await adapter.probe();
    expect(result.ok).toBe(false);
    expect(result.configured).toBe(false);
    expect(result.provider).toBe("openai-compatible");
  });

  it("createClient succeeds when API key is present", () => {
    process.env.OPENAI_API_KEY = "sk-test-not-a-real-call";
    const adapter = new OpenAiProtocolAdapter();
    const client = adapter.createClient();
    expect(client).toBeDefined();
  });
});
