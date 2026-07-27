import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PROVIDER_CARD_TSX = path.resolve(
  __dirname,
  "..",
  "..",
  "src",
  "components",
  "providers",
  "ProviderCard.tsx",
);

describe("ProviderCard layout", () => {
  const source = fs.readFileSync(PROVIDER_CARD_TSX, "utf8");

  it("lets website links use available card width before truncating", () => {
    expect(source).not.toContain("max-w-[280px]");
    expect(source).toContain("flex min-w-0 flex-1 items-center gap-2");
    expect(source).toContain("min-w-0 flex-1 space-y-0.5");
    expect(source).toContain(
      "inline-flex max-w-full items-center overflow-hidden text-left text-xs leading-5",
    );
  });

  it("uses a compact row surface without a permanent decorative gradient", () => {
    expect(source).toContain("rounded-lg border border-border/70");
    expect(source).toContain("px-3 py-2.5");
    expect(source).not.toContain("absolute inset-0 bg-gradient-to-r");
  });
});
