import { describe, expect, it } from "vitest";
import {
  getCodexContextWindowOrDefault,
  inferCodexContextWindow,
} from "./codexContextWindow";

describe("codex context window defaults", () => {
  it("uses 372K for GPT 5.6 models", () => {
    expect(inferCodexContextWindow("gpt-5.6-sol")).toBe("372000");
  });

  it("uses 50K for Grok models", () => {
    expect(inferCodexContextWindow("grok-4.5", "xAI")).toBe("50000");
  });

  it("uses 1M for Claude and Chinese model families", () => {
    expect(inferCodexContextWindow("claude-opus-4-8")).toBe("1000000");
    expect(inferCodexContextWindow("qwen3-coder-plus")).toBe("1000000");
    expect(inferCodexContextWindow("model-1", "国产模型")).toBe("1000000");
  });

  it("preserves an explicitly configured value", () => {
    expect(getCodexContextWindowOrDefault("128000", "gpt-5.6-sol")).toBe(
      "128000",
    );
  });
});
