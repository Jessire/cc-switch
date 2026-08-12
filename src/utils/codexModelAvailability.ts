import type { CodexCatalogModel } from "@/types";

type FetchedModelIdentity = { id: string };

export function findUnavailableConfiguredModelIds(
  configuredModels: ReadonlyArray<Pick<CodexCatalogModel, "model">>,
  fetchedModels: ReadonlyArray<FetchedModelIdentity>,
): string[] {
  const fetchedIds = new Set(
    fetchedModels.map((model) => model.id.trim()).filter(Boolean),
  );
  const seen = new Set<string>();

  return configuredModels.flatMap((model) => {
    const modelId = model.model.trim();
    if (!modelId || fetchedIds.has(modelId) || seen.has(modelId)) return [];
    seen.add(modelId);
    return [modelId];
  });
}
