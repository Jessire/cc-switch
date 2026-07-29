import { describe, expect, it } from "vitest";
import {
  normalizeCodexCatalogModelsForSave,
  syncCodexModelToCatalogFirst,
} from "./ProviderForm";

describe("Codex catalog menu state", () => {
  it("preserves disabled and global menu metadata", () => {
    expect(
      normalizeCodexCatalogModelsForSave([
        {
          model: " model-a ",
          displayName: " Model A ",
          enabled: false,
          menuOrder: 3.9,
          isNativeDefault: true,
        },
      ]),
    ).toEqual([
      {
        model: "model-a",
        displayName: "Model A",
        enabled: false,
        menuOrder: 3,
        isNativeDefault: true,
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
