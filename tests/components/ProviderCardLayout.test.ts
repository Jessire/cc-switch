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

  it("keeps the provider identity and website link on one compact fixed-column row", () => {
    expect(source).not.toContain("max-w-[280px]");
    expect(source).toContain("relative flex min-h-12 items-center gap-2");
    expect(source).toContain("flex h-11 w-11 flex-shrink-0");
    expect(source).toContain(
      "grid min-w-0 flex-1 grid-cols-[11rem_1.75rem_8rem_minmax(0,1fr)]",
    );
    expect(source).toContain("flex h-6 items-center justify-center");
    expect(source).toContain(
      "inline-flex min-w-0 items-center overflow-hidden text-left text-[15px] leading-6",
    );
  });

  it("uses a compact row surface without a permanent decorative gradient", () => {
    expect(source).toContain("min-h-[70px] overflow-hidden rounded-lg border");
    expect(source).toContain("px-3 py-2.5");
    expect(source).not.toContain("absolute inset-0 bg-gradient-to-r");
  });
});
