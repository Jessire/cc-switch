import type { Provider } from "@/types";
import {
  codexApiFormatFromWireApi,
  extractCodexBaseUrl,
  extractCodexModelName,
  extractCodexWireApi,
} from "@/utils/providerConfigUtils";
import { buildGrokBuildConfig } from "@/utils/grokBuildConfig";

export function buildGrokBuildProviderFromCodex(provider: Provider): Provider {
  const settings = provider.settingsConfig ?? {};
  const auth =
    settings && typeof settings.auth === "object" && settings.auth !== null
      ? (settings.auth as Record<string, unknown>)
      : {};
  const config = typeof settings.config === "string" ? settings.config : "";
  const baseUrl =
    (extractCodexBaseUrl(config) ||
      config.match(/base_url\s*=\s*["']([^"']+)["']/i)?.[1]) ??
    "";
  const model = extractCodexModelName(config) || "grok-4.5";
  const apiKey =
    config.match(/CODEX_API_KEY\s*=\s*["']([^"']+)["']/i)?.[1] ??
    config.match(/api_key\s*=\s*["']([^"']+)["']/i)?.[1] ??
    ((typeof auth.OPENAI_API_KEY === "string" ? auth.OPENAI_API_KEY : "") ||
      (typeof auth.CODEX_API_KEY === "string" ? auth.CODEX_API_KEY : ""));
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

export interface GrokBuildImportGroupSource {
  name: string;
  providerIds: string[];
}

/**
 * 将按顺序返回的已创建 Grok 供应商 ID 重新分配到对应 Codex 分组。
 * addProvider 会为每个新供应商生成数据库 ID,因此不能继续使用导入前的
 * `${codexProviderId}-grokbuild` 临时 ID。
 */
export function buildGrokBuildGroupReplacements(
  groups: GrokBuildImportGroupSource[],
  codexProviders: Record<string, Provider>,
  sourceProviderIds: string[],
  importedProviders: Provider[],
): Array<{ name: string; providerIds: string[] }> {
  const importedIdBySourceId = new Map(
    sourceProviderIds.map((sourceId, index) => [
      sourceId,
      importedProviders[index]?.id,
    ]),
  );

  return groups.map((group) => ({
    name: group.name,
    providerIds: Array.from(
      new Set(
        group.providerIds
          .filter((id) => {
            const provider = codexProviders[id];
            return Boolean(provider) && provider.category !== "official";
          })
          .map((id) => importedIdBySourceId.get(id))
          .filter((id): id is string => Boolean(id)),
      ),
    ),
  }));
}
