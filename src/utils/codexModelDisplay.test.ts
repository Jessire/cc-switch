import { describe, expect, it } from "vitest";
import { formatCodexModelDisplayName } from "./codexModelDisplay";

describe("formatCodexModelDisplayName", () => {
  it.each([
    ["gpt-5.3-codex", "GPT 5.3 Codex"],
    ["openai/gpt-5.2", "GPT 5.2"],
    ["deepseek-v4-flash", "DeepSeek V4 Flash"],
    ["glm-4.6", "GLM 4.6"],
    ["qwen3_coder", "Qwen3 Coder"],
    ["kimi-k2.5", "Kimi K2.5"],
  ])("formats %s", (modelId, expected) => {
    expect(formatCodexModelDisplayName(modelId)).toBe(expected);
  });

  it("returns an empty string for an empty model id", () => {
    expect(formatCodexModelDisplayName("  ")).toBe("");
  });
});
