import type { Provider } from "@/types";
import {
  codexApiFormatFromWireApi,
  extractCodexBaseUrl,
  extractCodexModelName,
  extractCodexWireApi,
} from "@/utils/providerConfigUtils";
import { buildGrokBuildConfig } from "@/utils/grokBuildConfig";

export function buildGrokBuildProviderFromCodex(provider: Provider): Provider {
  const config =
    typeof provider.settingsConfig?.config === "string"
      ? provider.settingsConfig.config
      : "";
  const baseUrl =
    (extractCodexBaseUrl(config) ||
      config.match(/base_url\s*=\s*["']([^"']+)["']/i)?.[1]) ??
    "";
  const model = extractCodexModelName(config) || "grok-4.5";
  const apiKey =
    config.match(/CODEX_API_KEY\s*=\s*["']([^"']+)["']/i)?.[1] ??
    config.match(/api_key\s*=\s*["']([^"']+)["']/i)?.[1] ??
    "";
  const wireApi = extractCodexWireApi(config);
  const apiBackend =
    codexApiFormatFromWireApi(wireApi) === "openai_chat"
      ? "chat_completions"
      : codexApiFormatFromWireApi(wireApi) === "anthropic"
        ? "messages"
        : "responses";

  return {
    ...provider,
    id: `${provider.id}-grokbuild`,
    settingsConfig: {
      config: buildGrokBuildConfig({
        model,
        upstreamModel: model,
        baseUrl,
        name: provider.name,
        apiKey,
        apiBackend,
        contextWindow: 500000,
      }),
    },
    meta: {
      ...provider.meta,
      apiFormat: codexApiFormatFromWireApi(wireApi) ?? "openai_responses",
    },
  };
}
