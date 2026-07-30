import type { CodexCatalogModel, Provider } from "@/types";

export interface DraftModelEntry {
  key: string;
  providerId: string;
  modelIndex: number;
  model: CodexCatalogModel;
}

export interface DraftProviderGroup {
  key: string;
  providerId: string;
  providerName: string;
  entries: DraftModelEntry[];
}

export function providerCatalogModels(provider: Provider): CodexCatalogModel[] {
  const catalog = provider.settingsConfig?.modelCatalog;
  return Array.isArray(catalog?.models)
    ? catalog.models.filter(
        (model: unknown): model is CodexCatalogModel =>
          !!model &&
          typeof model === "object" &&
          typeof (model as CodexCatalogModel).model === "string",
      )
    : [];
}

function compareMenuOrder(
  left: DraftModelEntry,
  right: DraftModelEntry,
): number {
  const leftOrder = left.model.menuOrder;
  const rightOrder = right.model.menuOrder;
  if (leftOrder === undefined && rightOrder !== undefined) return -1;
  if (leftOrder !== undefined && rightOrder === undefined) return 1;
  if (leftOrder !== undefined && rightOrder !== undefined) {
    return leftOrder - rightOrder || left.modelIndex - right.modelIndex;
  }
  return left.modelIndex - right.modelIndex;
}

export function buildDraftGroups(
  providers: Record<string, Provider>,
): DraftProviderGroup[] {
  const providerRows = Object.values(providers)
    .filter((provider) => provider.meta?.codexModelMenuFavorite === true)
    .sort(
      (left, right) =>
        (left.sortIndex ?? Number.MAX_SAFE_INTEGER) -
          (right.sortIndex ?? Number.MAX_SAFE_INTEGER) ||
        left.name.localeCompare(right.name, "zh-CN"),
    )
    .map((provider, fallbackOrder) => {
      const entries = providerCatalogModels(provider)
        .map((model, modelIndex) => ({
          key: `model:${JSON.stringify([provider.id, modelIndex])}`,
          providerId: provider.id,
          modelIndex,
          model: { ...model },
        }))
        .sort(compareMenuOrder);

      return {
        group: {
          key: `provider:${provider.id}`,
          providerId: provider.id,
          providerName: provider.name,
          entries,
        },
        fallbackOrder,
        firstMenuOrder: entries.reduce<number | undefined>((lowest, entry) => {
          if (entry.model.menuOrder === undefined) return lowest;
          return lowest === undefined
            ? entry.model.menuOrder
            : Math.min(lowest, entry.model.menuOrder);
        }, undefined),
        hasUnorderedModel: entries.some(
          (entry) => entry.model.menuOrder === undefined,
        ),
      };
    })
    .filter(({ group }) => group.entries.length > 0);

  providerRows.sort((left, right) => {
    if (left.hasUnorderedModel !== right.hasUnorderedModel) {
      return left.hasUnorderedModel ? -1 : 1;
    }
    if (
      left.firstMenuOrder !== undefined &&
      right.firstMenuOrder !== undefined
    ) {
      return (
        left.firstMenuOrder - right.firstMenuOrder ||
        left.fallbackOrder - right.fallbackOrder
      );
    }
    return left.fallbackOrder - right.fallbackOrder;
  });

  return providerRows.map(({ group }) => group);
}

export function flattenDraftGroups(
  groups: DraftProviderGroup[],
): DraftModelEntry[] {
  return groups.flatMap((group) => group.entries);
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function reorderDraftGroups(
  groups: DraftProviderGroup[],
  activeKey: string,
  overKey: string,
): DraftProviderGroup[] {
  const from = groups.findIndex((group) => group.key === activeKey);
  const to = groups.findIndex((group) => group.key === overKey);
  if (from < 0 || to < 0 || from === to) return groups;
  return moveItem(groups, from, to);
}

export function reorderDraftModels(
  groups: DraftProviderGroup[],
  providerId: string,
  activeKey: string,
  overKey: string,
): DraftProviderGroup[] {
  return groups.map((group) => {
    if (group.providerId !== providerId) return group;
    const from = group.entries.findIndex((entry) => entry.key === activeKey);
    const to = group.entries.findIndex((entry) => entry.key === overKey);
    if (from < 0 || to < 0 || from === to) return group;
    return { ...group, entries: moveItem(group.entries, from, to) };
  });
}
