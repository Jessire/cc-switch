import { describe, expect, it } from "vitest";
import type { CodexCatalogModel, Provider } from "@/types";
import {
  buildDraftGroups,
  duplicateModelIds,
  flattenDraftGroups,
  normalizeDraftDefaults,
  reorderDraftGroups,
  reorderDraftModels,
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

  it("moves the default to the first enabled duplicate when the old default is disabled", () => {
    const groups = buildDraftGroups({
      first: provider("first", [{ model: "claude-x", menuOrder: 0 }], 0),
      second: provider(
        "second",
        [
          {
            model: "claude-x",
            menuOrder: 1,
            enabled: false,
            isNativeDefault: true,
          },
        ],
        1,
      ),
    });

    const normalized = normalizeDraftDefaults(groups, new Set());
    const entries = flattenDraftGroups(normalized);
    expect(entries[0].model.isNativeDefault).toBe(true);
    expect(entries[1].model.isNativeDefault).toBeUndefined();
  });

  it("treats an official bundled model as a duplicate and keeps only one enabled default", () => {
    const groups = buildDraftGroups({
      first: provider("first", [{ model: "gpt-5.6", menuOrder: 0 }], 0),
      second: provider(
        "second",
        [{ model: "gpt-5.6", menuOrder: 1, isNativeDefault: true }],
        1,
      ),
    });
    const official = new Set(["gpt-5.6"]);

    expect(duplicateModelIds(groups, official)).toEqual(new Set(["gpt-5.6"]));
    const normalized = normalizeDraftDefaults(groups, official);
    expect(
      flattenDraftGroups(normalized)
        .filter((entry) => entry.model.isNativeDefault === true)
        .map((entry) => entry.providerId),
    ).toEqual(["second"]);
  });

  it("clears a stale default marker from a unique non-official model", () => {
    const groups = buildDraftGroups({
      only: provider("only", [{ model: "unique", isNativeDefault: true }], 0),
    });

    const normalized = normalizeDraftDefaults(groups, new Set());
    expect(
      flattenDraftGroups(normalized)[0].model.isNativeDefault,
    ).toBeUndefined();
  });
});
