import { describe, expect, it } from "vitest";
import { buildGrokBuildProviderFromCodex } from "./grokBuildProviderImport";

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
});
