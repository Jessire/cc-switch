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
  menuGroupName: string;
  entries: DraftModelEntry[];
}

export interface DraftModelRenameMatch {
  entryKey: string;
  modelId: string;
  before: string;
  after: string;
}

export interface SmartSortPreviewItem {
  entryKey: string;
  family: string;
  displayName: string;
  modelId: string;
  groupName: string;
}

export interface ModelSortRulesConfig {
  stripBrandPrefixes?: boolean;
  stripDateSuffixes?: boolean;
  stripContextSuffixes?: boolean;
  customPrefixes?: string[];
  customRemovePatterns?: string[];
}

export const DEFAULT_MODEL_SORT_RULES: ModelSortRulesConfig = {
  stripBrandPrefixes: true,
  stripDateSuffixes: true,
  stripContextSuffixes: true,
  customPrefixes: [],
  customRemovePatterns: [],
};

export const MODEL_SORT_RULES_STORAGE_KEY =
  "cc-switch-codex-model-menu-sort-rules-v1";

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
          menuGroupName:
            provider.meta?.codexModelMenuGroupName?.trim() || provider.name,
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

export function applyDraftModelDisplayNames(
  groups: DraftProviderGroup[],
  displayNamesByKey: ReadonlyMap<string, string>,
): DraftProviderGroup[] {
  if (displayNamesByKey.size === 0) return groups;

  return groups.map((group) => ({
    ...group,
    entries: group.entries.map((entry) => {
      const displayName = displayNamesByKey.get(entry.key);
      return displayName === undefined
        ? entry
        : { ...entry, model: { ...entry.model, displayName } };
    }),
  }));
}

const KNOWN_BRAND_PREFIX_REGEX =
  /^(?:(?:openai|anthropic|google|deepseek|moonshot|zhipu|meta|mistral)[/_\-\s]+)?(?:gpt|claude|gemini|deepseek|qwen|glm|kimi|minimax|mistral|llama)[/_\-\s]*/i;

const FULL_DATE_SUFFIX_REGEX =
  /(?:[-_.\s]|^)(?:20\d{2}[-_.]?)(?:0[1-9]|1[0-2])(?:[-_.]?)(?:0[1-9]|[12]\d|3[01])(?=[-_.\s]|$)/gi;
const SHORT_DATE_SUFFIX_REGEX =
  /(?:[-_.\s]|^)(?:2[4-9])(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])(?=[-_.\s]|$)/gi;
const YEAR_MONTH_SUFFIX_REGEX =
  /(?:[-_.\s]|^)(?:2[4-9])(?:0[1-9]|1[0-2])(?=[-_.\s]|$)/gi;
const MONTH_DAY_SUFFIX_REGEX =
  /(?:[-_.\s]|^)(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])(?=[-_.\s]|$)/gi;
const CONTEXT_SUFFIX_REGEX =
  /(?:[-_.\s]*)(?:1m|\d+k|fp8|fp16|preview|latest|chat|instruct|online)\b(?:[-_.\s]*)$/gi;

export function cleanModelNameForSorting(
  rawName: string,
  rules: ModelSortRulesConfig = DEFAULT_MODEL_SORT_RULES,
): string {
  let result = rawName.trim();
  if (!result) return "";

  if (rules.customPrefixes?.length) {
    for (const prefix of rules.customPrefixes) {
      const trimmedPrefix = prefix.trim();
      if (!trimmedPrefix) continue;
      result = result.replace(
        new RegExp(`^${escapeRegExp(trimmedPrefix)}[/_\\-\\s]*`, "i"),
        "",
      );
    }
  }

  if (rules.stripBrandPrefixes !== false) {
    result = result.replace(KNOWN_BRAND_PREFIX_REGEX, "");
  }

  if (rules.customRemovePatterns?.length) {
    for (const pattern of rules.customRemovePatterns) {
      const trimmedPattern = pattern.trim();
      if (!trimmedPattern) continue;
      result = result.replace(
        new RegExp(escapeRegExp(trimmedPattern), "gi"),
        " ",
      );
    }
  }

  if (rules.stripContextSuffixes !== false) {
    result = result.replace(CONTEXT_SUFFIX_REGEX, " ");
  }

  if (rules.stripDateSuffixes !== false) {
    result = result
      .replace(FULL_DATE_SUFFIX_REGEX, " ")
      .replace(SHORT_DATE_SUFFIX_REGEX, " ")
      .replace(YEAR_MONTH_SUFFIX_REGEX, " ")
      .replace(MONTH_DAY_SUFFIX_REGEX, " ");
  }

  result = result
    .toLocaleLowerCase()
    .replace(/[:：].*$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return result || rawName.trim();
}

function normalizeModelText(
  value: string,
  rules: ModelSortRulesConfig = DEFAULT_MODEL_SORT_RULES,
): string {
  return cleanModelNameForSorting(value, rules).toLocaleLowerCase();
}

function modelFamily(
  entry: DraftModelEntry,
  rules: ModelSortRulesConfig = DEFAULT_MODEL_SORT_RULES,
): string {
  const rawName = entry.model.displayName?.trim() || entry.model.model || "";
  const normalized = normalizeModelText(rawName, rules);
  const knownFamily = normalized.match(
    /^(gpt|claude\s+(?:opus|sonnet|haiku)|grok|glm|kimi|qwen|deepseek)(?:\s|$)/,
  );
  return knownFamily?.[1] || normalized;
}

function naturalCompare(left: string, right: string): number {
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function buildSmartSortPreview(
  groups: DraftProviderGroup[],
  rules: ModelSortRulesConfig = DEFAULT_MODEL_SORT_RULES,
): SmartSortPreviewItem[] {
  const groupNames = new Map(
    groups.map((group) => [group.providerId, group.menuGroupName]),
  );
  return flattenDraftGroups(groups)
    .map((entry, index) => ({
      entry,
      index,
      family: modelFamily(entry, rules),
    }))
    .sort(
      (left, right) =>
        naturalCompare(left.family, right.family) ||
        naturalCompare(
          normalizeModelText(
            left.entry.model.displayName?.trim() || left.entry.model.model,
            rules,
          ),
          normalizeModelText(
            right.entry.model.displayName?.trim() || right.entry.model.model,
            rules,
          ),
        ) ||
        left.index - right.index,
    )
    .map(({ entry, family }) => ({
      entryKey: entry.key,
      family,
      displayName: entry.model.displayName?.trim() || entry.model.model,
      modelId: entry.model.model,
      groupName: groupNames.get(entry.providerId) || entry.providerId,
    }));
}

export function applySmartSort(
  groups: DraftProviderGroup[],
  rules: ModelSortRulesConfig = DEFAULT_MODEL_SORT_RULES,
): DraftProviderGroup[] {
  const preview = buildSmartSortPreview(groups, rules);
  const orderByKey = new Map(
    preview.map((item, index) => [item.entryKey, index]),
  );
  return groups
    .map((group) => ({
      ...group,
      entries: group.entries
        .map((entry) => ({
          ...entry,
          model: {
            ...entry.model,
            menuOrder: orderByKey.get(entry.key) ?? entry.model.menuOrder,
          },
        }))
        .sort(
          (left, right) =>
            (left.model.menuOrder ?? Number.MAX_SAFE_INTEGER) -
            (right.model.menuOrder ?? Number.MAX_SAFE_INTEGER),
        ),
    }))
    .sort(
      (left, right) =>
        (left.entries[0]?.model.menuOrder ?? Number.MAX_SAFE_INTEGER) -
        (right.entries[0]?.model.menuOrder ?? Number.MAX_SAFE_INTEGER),
    );
}

export function shouldRestartCodexAfterMenuSave(
  smartSorted: boolean,
  restartEnabled: boolean,
): boolean {
  return smartSorted && restartEnabled;
}

export function entriesForMenuSave(
  groups: DraftProviderGroup[],
  smartSorted: boolean,
  rules: ModelSortRulesConfig = DEFAULT_MODEL_SORT_RULES,
): DraftModelEntry[] {
  if (!smartSorted) return flattenDraftGroups(groups);
  const entriesByKey = new Map(
    flattenDraftGroups(groups).map((entry) => [entry.key, entry]),
  );
  return buildSmartSortPreview(groups, rules).flatMap((item) => {
    const entry = entriesByKey.get(item.entryKey);
    return entry ? [entry] : [];
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceCaseInsensitive(
  value: string,
  search: string,
  replacement: string,
): string {
  return value.replace(
    new RegExp(escapeRegExp(search), "gi"),
    () => replacement,
  );
}

export function findDraftModelRenameMatches(
  groups: DraftProviderGroup[],
  search: string,
  replacement: string,
): DraftModelRenameMatch[] {
  const normalizedSearch = search.trim();
  if (!normalizedSearch) return [];

  return flattenDraftGroups(groups).flatMap((entry) => {
    const before = entry.model.displayName?.trim() || entry.model.model;
    if (
      !before.toLocaleLowerCase().includes(normalizedSearch.toLocaleLowerCase())
    ) {
      return [];
    }

    return [
      {
        entryKey: entry.key,
        modelId: entry.model.model,
        before,
        after: replaceCaseInsensitive(before, normalizedSearch, replacement),
      },
    ];
  });
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
