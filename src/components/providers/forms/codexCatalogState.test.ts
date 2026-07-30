import { describe, expect, it } from "vitest";
import {
  normalizeCodexCatalogModelsForSave,
  syncCodexModelToCatalogFirst,
} from "./ProviderForm";

describe("Codex catalog menu state", () => {
  it("preserves disabled and global menu metadata while removing the retired default flag", () => {
    expect(
      normalizeCodexCatalogModelsForSave([
        {
          model: " model-a ",
          displayName: " Model A ",
          enabled: false,
          menuOrder: 3.9,
          isNativeDefault: true,
        } as unknown as import("@/types").CodexCatalogModel,
      ]),
    ).toEqual([
      {
        model: "model-a",
        displayName: "Model A",
        enabled: false,
        menuOrder: 3,
      },
    ]);
  });

  it("uses the first enabled model and keeps the old value when all are disabled", () => {
    const config = 'model = "old-model"\n';
    expect(
      syncCodexModelToCatalogFirst(config, [
        { model: "disabled", enabled: false },
        { model: "enabled", enabled: true },
      ]),
    ).toContain('model = "enabled"');
    expect(
      syncCodexModelToCatalogFirst(config, [
        { model: "disabled", enabled: false },
      ]),
    ).toBe(config);
  });
});
