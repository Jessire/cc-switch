import { describe, expect, it } from "vitest";
import type { CodexCatalogModel, Provider } from "@/types";
import {
  applySmartSort,
  buildDraftGroups,
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
      "claude-opus-4-8",
      "claude-opus-5",
      "gpt-5.6-luna",
      "gpt-5.6-luna",
    ]);
    expect(preview[0].groupName).toBe("second relay");
    expect(preview[2].groupName).toBe("first relay");

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
