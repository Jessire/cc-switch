import { describe, expect, it } from "vitest";
import {
  resolveGroupedProviderIcon,
  resolveProviderIcon,
} from "./providerIcon";

describe("resolveProviderIcon", () => {
  it("clears the legacy automatic Grok Build icon", () => {
    expect(resolveProviderIcon("grokbuild", "grok", "")).toBeUndefined();
    expect(resolveProviderIcon("grokbuild", "grok")).toBeUndefined();
  });

  it("preserves a Grok icon explicitly selected by the user", () => {
    expect(resolveProviderIcon("grokbuild", "grok", "currentColor")).toBe(
      "grok",
    );
  });

  it("does not reinterpret another app's provider icon", () => {
    expect(resolveProviderIcon("codex", "grok", "")).toBe("grok");
  });

  it("normalizes an empty icon to the initials fallback", () => {
    expect(resolveProviderIcon("grokbuild", "  ", "")).toBeUndefined();
  });
});

describe("resolveGroupedProviderIcon", () => {
  it.each([
    [["GPT"], "openai"],
    [["OpenAI Relay"], "openai"],
    [["Grok"], "grok"],
    [["xAI 高速"], "grok"],
    [["Claude"], "claude"],
    [["Anthropic Plus"], "claude"],
    [["国模"], "kimi"],
    [["国产模型"], "kimi"],
  ])("maps %j to %s", (groups, expected) => {
    expect(resolveGroupedProviderIcon(groups)).toBe(expected);
  });

  it("uses the first recognized group in the existing group order", () => {
    expect(resolveGroupedProviderIcon(["普通", "Claude", "GPT"])).toBe(
      "claude",
    );
  });

  it("falls back when no group brand can be recognized", () => {
    expect(resolveGroupedProviderIcon(["普通", "未分组"])).toBeUndefined();
  });
});
