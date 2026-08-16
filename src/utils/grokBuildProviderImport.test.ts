import { describe, expect, it } from "vitest";
import {
  buildGrokBuildGroupReplacements,
  buildGrokBuildProviderFromCodex,
} from "./grokBuildProviderImport";

describe("Grok Build provider import", () => {
  it("converts a Codex provider without changing its source identity", () => {
    const provider = buildGrokBuildProviderFromCodex({
      id: "relay",
      name: "Relay",
      settingsConfig: {
        config:
          'model = "gpt-5.6"\nwire_api = "responses"\n[model_providers.custom]\nbase_url = "https://api.example.com/v1"\n[env]\nCODEX_API_KEY = "secret"',
      },
    });
    expect(provider.id).toBe("relay-grokbuild");
    expect(provider.settingsConfig.config).toContain(
      'base_url = "https://api.example.com/v1"',
    );
    expect(provider.settingsConfig.config).toContain('api_key = "secret"');
  });

  it("reads the API key from Codex settingsConfig.auth", () => {
    const provider = buildGrokBuildProviderFromCodex({
      id: "relay-auth",
      name: "Relay Auth",
      settingsConfig: {
        auth: { OPENAI_API_KEY: "auth-secret" },
        config:
          'model = "gpt-5.6"\n[model_providers.custom]\nbase_url = "https://api.example.com/v1"',
      },
    });
    expect(provider.settingsConfig.config).toContain('api_key = "auth-secret"');
  });
});

describe("buildGrokBuildGroupReplacements", () => {
  it("uses created provider ids and keeps them in their source groups", () => {
    const codexProviders = {
      gptRelay: { id: "gptRelay", name: "GPT Relay", category: "third_party" },
      official: {
        id: "official",
        name: "OpenAI Official",
        category: "official",
      },
      grokRelay: {
        id: "grokRelay",
        name: "Grok Relay",
        category: "third_party",
      },
    } as any;

    expect(
      buildGrokBuildGroupReplacements(
        [
          { name: "GPT", providerIds: ["gptRelay", "official"] },
          { name: "Grok", providerIds: ["gptRelay", "grokRelay"] },
        ],
        codexProviders,
        ["gptRelay", "grokRelay"],
        [{ id: "created-gpt" } as any, { id: "created-grok" } as any],
      ),
    ).toEqual([
      { name: "GPT", providerIds: ["created-gpt"] },
      {
        name: "Grok",
        providerIds: ["created-gpt", "created-grok"],
      },
    ]);
  });
});
