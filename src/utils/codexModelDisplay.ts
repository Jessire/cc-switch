const MODEL_NAME_OVERRIDES: Record<string, string> = {
  codex: "Codex",
  deepseek: "DeepSeek",
  glm: "GLM",
  gpt: "GPT",
  grok: "Grok",
  kimi: "Kimi",
  minimax: "MiniMax",
  mimo: "MiMo",
  qwen: "Qwen",
};

export function formatCodexModelDisplayName(modelId: string): string {
  const trimmed = modelId.trim();
  if (!trimmed) return "";

  const leaf = trimmed.split("/").filter(Boolean).at(-1) ?? trimmed;
  return leaf
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (MODEL_NAME_OVERRIDES[lower]) return MODEL_NAME_OVERRIDES[lower];
      if (/^gpt\d/i.test(part)) return `GPT ${part.slice(3)}`;
      if (/^glm\d/i.test(part)) return `GLM ${part.slice(3)}`;
      return /^\d/.test(part)
        ? part
        : `${part.charAt(0).toUpperCase()}${part.slice(1)}`;
    })
    .join(" ");
}
