import { describe, expect, it } from "vitest";
import type { CodexCatalogModel, Provider } from "@/types";
import {
  buildDraftGroups,
  flattenDraftGroups,
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
