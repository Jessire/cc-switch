export const CODEX_CONTEXT_WINDOW_PRESETS = [
  { label: "372K", value: "372000" },
  { label: "500K", value: "500000" },
  { label: "1M", value: "1000000" },
] as const;

const GROK_MODEL_PATTERN = /(?:grok|xai)/i;
const CLAUDE_MODEL_PATTERN = /(?:claude|anthropic)/i;
const GPT_56_MODEL_PATTERN = /gpt[\s._-]*5[\s._-]*6/i;
const LARGE_CONTEXT_MODEL_PATTERN =
  /(?:kimi|moonshot|qwen|qwq|glm|zhipu|chatglm|deepseek|doubao|seed|volc|bytedance|minimax|mimo|baichuan|ernie|wenxin|hunyuan|qianfan|ling|longcat|internlm|stepfun|step-\d|spark|国产|国模|國產|國模|中文模型)/i;

export function inferCodexContextWindow(
  modelId: string,
  providerName = "",
): string | undefined {
  const source = `${providerName} ${modelId}`;

  if (GROK_MODEL_PATTERN.test(source)) return "500000";
  if (CLAUDE_MODEL_PATTERN.test(source)) return "200000";
  if (GPT_56_MODEL_PATTERN.test(source)) return "372000";
  if (LARGE_CONTEXT_MODEL_PATTERN.test(source)) return "1000000";
  return undefined;
}

export function getCodexContextWindowOrDefault(
  contextWindow: string | number | undefined,
  modelId: string,
  providerName = "",
): string | number | undefined {
  if (String(contextWindow ?? "").trim()) return contextWindow;
  return inferCodexContextWindow(modelId, providerName);
}
