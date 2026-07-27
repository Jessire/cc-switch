import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CodexFormFields } from "@/components/providers/forms/CodexFormFields";

const modelFetchMocks = vi.hoisted(() => ({
  fetchModelsForConfig: vi.fn(),
  fetchXaiOauthModels: vi.fn(),
  showFetchModelsError: vi.fn(),
}));

vi.mock("@/lib/api/model-fetch", () => ({
  fetchModelsForConfig: modelFetchMocks.fetchModelsForConfig,
  fetchXaiOauthModels: modelFetchMocks.fetchXaiOauthModels,
  showFetchModelsError: modelFetchMocks.showFetchModelsError,
}));

describe("CodexFormFields model menu", () => {
  beforeEach(() => {
    modelFetchMocks.fetchModelsForConfig.mockReset();
    modelFetchMocks.fetchXaiOauthModels.mockReset();
    modelFetchMocks.showFetchModelsError.mockReset();
  });

  it("puts a newly selected fetched model before existing menu models", async () => {
    modelFetchMocks.fetchModelsForConfig.mockResolvedValue([
      { id: "deepseek-v4-flash", ownedBy: "test" },
    ]);
    const handleCatalogChange = vi.fn();

    function Harness() {
      const form = useForm();
      return (
        <FormProvider {...form}>
          <CodexFormFields
            appId="codex"
            codexApiKey="test-key"
            onApiKeyChange={vi.fn()}
            category="custom"
            shouldShowApiKeyLink={false}
            websiteUrl=""
            shouldShowSpeedTest
            codexBaseUrl="https://api.example.com/v1"
            onBaseUrlChange={vi.fn()}
            isFullUrl={false}
            onFullUrlChange={vi.fn()}
            isEndpointModalOpen={false}
            onEndpointModalToggle={vi.fn()}
            autoSelect={false}
            onAutoSelectChange={vi.fn()}
            codexModel="existing-model"
            onModelChange={vi.fn()}
            apiFormat="openai_responses"
            onApiFormatChange={vi.fn()}
            anthropicAuthField="ANTHROPIC_API_KEY"
            onAnthropicAuthFieldChange={vi.fn()}
            impersonateClaudeCode={false}
            onImpersonateClaudeCodeChange={vi.fn()}
            maxOutputTokens=""
            onMaxOutputTokensChange={vi.fn()}
            promptCacheRouting="auto"
            onPromptCacheRoutingChange={vi.fn()}
            catalogModels={[
              { model: "existing-model", displayName: "Existing Model" },
            ]}
            onCatalogModelsChange={handleCatalogChange}
            speedTestEndpoints={[]}
            customUserAgent=""
            onCustomUserAgentChange={vi.fn()}
            localProxyHeadersOverride=""
            onLocalProxyHeadersOverrideChange={vi.fn()}
            localProxyBodyOverride=""
            onLocalProxyBodyOverrideChange={vi.fn()}
          />
        </FormProvider>
      );
    }

    render(<Harness />);

    fireEvent.click(
      screen
        .getAllByRole("button", { name: "providerForm.fetchModels" })
        .at(-1)!,
    );

    const checkbox = await screen.findByRole("checkbox", {
      name: /deepseek-v4-flash/,
    });
    fireEvent.click(checkbox);

    await waitFor(() => {
      const latestModels = handleCatalogChange.mock.calls.at(-1)?.[0];
      expect(latestModels).toEqual([
        {
          model: "deepseek-v4-flash",
          displayName: "DeepSeek V4 Flash",
          contextWindow: "",
        },
        {
          model: "existing-model",
          displayName: "Existing Model",
          contextWindow: "",
        },
      ]);
    });
  });
});
