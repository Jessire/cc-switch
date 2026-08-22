import { describe, expect, it } from "vitest";
import type { CodexCatalogModel, Provider } from "@/types";
import {
  applyDraftModelDisplayNames,
  applySmartSort,
  buildDraftGroups,
  cleanModelNameForDisplay,
  cleanModelNameForSorting,
  entriesForMenuSave,
  buildSmartSortPreview,
  findDraftModelRenameMatches,
  flattenDraftGroups,
  reorderDraftGroups,
  reorderDraftModels,
  shouldRestartCodexAfterMenuSave,
} from "./codexModelMenuState";

function provider(
  id: string,
  models: CodexCatalogModel[],
  sortIndex: number,
): Provider {
  return {
    id,
    name: `${id} relay`,
    sortIndex,
    settingsConfig: { modelCatalog: { models } },
    meta: { codexModelMenuFavorite: true },
  } as Provider;
}

describe("codex model menu state", () => {
  it("uses renamed display names instead of unusual model IDs for smart sorting", () => {
    const groups = buildDraftGroups({
      first: provider(
        "first",
        [
          { model: "邪恶FF（sol）", displayName: "5.6 Sol" },
          { model: "claude-opus-5", displayName: "Claude Opus 5" },
        ],
        0,
      ),
      second: provider(
        "second",
        [
          { model: "gpt-5.6-sol", displayName: "GPT 5.6 Sol" },
          { model: "another-odd-id", displayName: "Opus 5" },
        ],
        1,
      ),
    });

    const preview = buildSmartSortPreview(groups);
    expect(preview.map((item) => item.displayName)).toEqual([
      "5.6 Sol",
      "GPT 5.6 Sol",
      "Claude Opus 5",
      "Opus 5",
    ]);
    expect(preview.map((item) => item.family)).toEqual([
      "5 6 sol",
      "5 6 sol",
      "opus 5",
      "opus 5",
    ]);
  });

  it("removes preset date, context, and brand affixes from sorting names", () => {
    expect(cleanModelNameForSorting("GPT 5.6 Sol")).toBe("5 6 sol");
    expect(cleanModelNameForSorting("Claude-Opus-5")).toBe("opus 5");
    expect(cleanModelNameForSorting("DeepSeek-V4-Flash-0731-1M")).toBe(
      "deepseek v4 flash",
    );
    expect(cleanModelNameForSorting("V4 Flash 20240731 128K")).toBe("v4 flash");
    expect(cleanModelNameForSorting("V4 Flash 2410")).toBe("v4 flash");
    expect(cleanModelNameForDisplay("GPT 5.6 Sol")).toBe("5.6 Sol");
    expect(cleanModelNameForDisplay("Gemini 3.7 Flash")).toBe("3.7 Flash");
    expect(cleanModelNameForDisplay("Qwen3.8 27B FP8")).toBe("Qwen3.8 27B");
  });

  it("keeps domestic brand prefixes while cleaning foreign model prefixes", () => {
    expect(
      cleanModelNameForDisplay("Qwen3.8 27B FP8", {
        stripBrandPrefixes: true,
        stripDateSuffixes: true,
        stripContextSuffixes: true,
      }),
    ).toBe("Qwen3.8 27B");
    expect(
      cleanModelNameForDisplay("Kimi K2.7 Code", {
        stripBrandPrefixes: true,
        stripDateSuffixes: true,
        stripContextSuffixes: true,
      }),
    ).toBe("Kimi K2.7 Code");
    expect(
      cleanModelNameForDisplay("DeepSeek V4 Flash", {
        stripBrandPrefixes: true,
        stripDateSuffixes: true,
        stripContextSuffixes: true,
      }),
    ).toBe("DeepSeek V4 Flash");
    expect(
      cleanModelNameForDisplay("Ox Alpha", {
        stripBrandPrefixes: true,
      }),
    ).toBe("Alpha");
  });

  it("exposes the cleaned model name for the smart-sort preview", () => {
    const groups = buildDraftGroups({
      first: provider(
        "first",
        [
          { model: "gemini-3.7-flash", displayName: "Gemini 3.7 Flash" },
          {
            model: "deepseek-v4-flash-0731-1m",
            displayName: "DeepSeek-V4-Flash-0731-1M",
          },
        ],
        0,
      ),
    });

    expect(
      buildSmartSortPreview(groups).map((item) => item.normalizedDisplayName),
    ).toEqual(["3.7 Flash", "DeepSeek V4 Flash"]);
    expect(
      buildSmartSortPreview(groups, {
        stripBrandPrefixes: true,
        stripDateSuffixes: false,
        stripContextSuffixes: false,
      }).map((item) => item.normalizedDisplayName),
    ).toEqual(["3.7 Flash", "DeepSeek V4 Flash 0731 1M"]);
  });

  it("groups smart-sort results by model family while preserving stable order", () => {
    const groups = buildDraftGroups({
      first: provider(
        "first",
        [
          { model: "claude-opus-5", displayName: "Opus 5" },
          { model: "gpt-5.6-luna", displayName: "5.6 Luna" },
        ],
        0,
      ),
      second: provider(
        "second",
        [
          { model: "claude-opus-4-8", displayName: "Opus 4.8" },
          { model: "gpt-5.6-luna", displayName: "5.6 Luna" },
        ],
        1,
      ),
    });

    const preview = buildSmartSortPreview(groups);
    expect(preview.map((item) => item.modelId)).toEqual([
      "gpt-5.6-luna",
      "gpt-5.6-luna",
      "claude-opus-4-8",
      "claude-opus-5",
    ]);
    expect(preview[0].groupName).toBe("first relay");
    expect(preview[2].groupName).toBe("second relay");

    const sorted = applySmartSort(groups);
    expect(
      sorted
        .flatMap((group) => group.entries)
        .map((entry) => entry.model.menuOrder),
    ).toEqual([0, 3, 1, 2]);
  });

  it("restarts only after saving the smart-sorted menu", () => {
    expect(shouldRestartCodexAfterMenuSave(false, true)).toBe(false);
    expect(shouldRestartCodexAfterMenuSave(true, false)).toBe(false);
    expect(shouldRestartCodexAfterMenuSave(true, true)).toBe(true);
  });

  it("uses the smart global order when saving the Codex menu", () => {
    const groups = buildDraftGroups({
      first: provider(
        "first",
        [
          { model: "claude-opus-5", displayName: "Opus 5" },
          { model: "claude-opus-4-7", displayName: "Opus 4.7" },
        ],
        0,
      ),
      second: provider(
        "second",
        [{ model: "claude-opus-4-8", displayName: "Opus 4.8" }],
        1,
      ),
    });

    expect(
      entriesForMenuSave(groups, true).map((entry) => entry.model.model),
    ).toEqual(["claude-opus-4-7", "claude-opus-4-8", "claude-opus-5"]);
  });

  it("groups providers by their first menu position and models within each provider", () => {
    const groups = buildDraftGroups({
      first: provider(
        "first",
        [
          { model: "first-b", menuOrder: 3 },
          { model: "first-a", menuOrder: 1 },
        ],
        1,
      ),
      second: provider("second", [{ model: "second", menuOrder: 0 }], 0),
    });

    expect(groups.map((group) => group.providerId)).toEqual([
      "second",
      "first",
    ]);
    expect(groups[1].entries.map((entry) => entry.model.model)).toEqual([
      "first-a",
      "first-b",
    ]);
    expect(
      flattenDraftGroups(groups).map((entry) => entry.model.model),
    ).toEqual(["second", "first-a", "first-b"]);
  });

  it("applies model display names without changing any other draft state", () => {
    const groups = buildDraftGroups({
      first: provider(
        "first",
        [
          { model: "first-a", displayName: "First A", enabled: false },
          { model: "first-b", displayName: "First B", menuOrder: 1 },
        ],
        0,
      ),
    });
    const firstEntry = groups[0].entries[0];
    const secondEntry = groups[0].entries[1];

    const updated = applyDraftModelDisplayNames(
      groups,
      new Map([[firstEntry.key, "Renamed A"]]),
    );

    expect(updated[0].entries[0].model).toMatchObject({
      model: "first-a",
      displayName: "Renamed A",
      enabled: false,
    });
    expect(updated[0].entries[1]).toBe(secondEntry);
    expect(groups[0].entries[0].model.displayName).toBe("First A");
  });

  it("previews case-insensitive batch renames across provider groups", () => {
    const groups = buildDraftGroups({
      first: provider(
        "first",
        [{ model: "gpt-sol", displayName: "GPT Sol" }],
        0,
      ),
      second: provider(
        "second",
        [{ model: "gpt-terra", displayName: "gpt Terra" }],
        1,
      ),
    });

    const matches = findDraftModelRenameMatches(groups, "gPt", "5.6");

    expect(matches.map((match) => [match.before, match.after])).toEqual([
      ["GPT Sol", "5.6 Sol"],
      ["gpt Terra", "5.6 Terra"],
    ]);
  });

  it("uses the independent menu group name without changing the provider name", () => {
    const source = provider("provider", [{ model: "gpt-5.6" }], 0);
    source.name = "Imported Very Long Provider Name";
    source.meta = {
      ...source.meta,
      codexModelMenuGroupName: "Any",
    };

    const groups = buildDraftGroups({ provider: source });

    expect(groups[0].menuGroupName).toBe("Any");
    expect(source.name).toBe("Imported Very Long Provider Name");
  });

  it("puts a newly unordered provider group before persisted groups", () => {
    const groups = buildDraftGroups({
      existing: provider("existing", [{ model: "existing", menuOrder: 0 }], 0),
      added: provider("added", [{ model: "added" }], 1),
    });

    expect(groups.map((group) => group.providerId)).toEqual([
      "added",
      "existing",
    ]);
  });

  it("reorders whole provider groups without mixing their models", () => {
    const groups = buildDraftGroups({
      first: provider("first", [{ model: "first" }], 0),
      second: provider("second", [{ model: "second" }], 1),
    });

    const reordered = reorderDraftGroups(groups, groups[0].key, groups[1].key);
    expect(reordered.map((group) => group.providerId)).toEqual([
      "second",
      "first",
    ]);
    expect(reordered[0].entries[0].providerId).toBe("second");
  });

  it("reorders models only inside their provider group", () => {
    const groups = buildDraftGroups({
      first: provider(
        "first",
        [
          { model: "first-a", menuOrder: 0 },
          { model: "first-b", menuOrder: 1 },
        ],
        0,
      ),
      second: provider("second", [{ model: "second", menuOrder: 2 }], 1),
    });

    const reordered = reorderDraftModels(
      groups,
      "first",
      groups[0].entries[0].key,
      groups[0].entries[1].key,
    );
    expect(reordered[0].entries.map((entry) => entry.model.model)).toEqual([
      "first-b",
      "first-a",
    ]);
    expect(reordered[1]).toBe(groups[1]);
  });
});
