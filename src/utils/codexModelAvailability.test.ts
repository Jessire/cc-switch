import { describe, expect, it } from "vitest";
import { findUnavailableConfiguredModelIds } from "./codexModelAvailability";

describe("Codex fetched model availability", () => {
  it("reports configured models missing from the latest fetched list without altering them", () => {
    const configured = [
      { model: "gpt-stable", enabled: true },
      { model: "gpt-removed", enabled: true },
      { model: "gpt-removed", enabled: false },
      { model: "" },
    ];

    expect(
      findUnavailableConfiguredModelIds(configured, [
        { id: "gpt-stable" },
        { id: "gpt-new" },
      ]),
    ).toEqual(["gpt-removed"]);
    expect(configured).toHaveLength(4);
  });

  it("treats an empty fetched list as unavailable for every configured model", () => {
    expect(
      findUnavailableConfiguredModelIds(
        [{ model: "gpt-a" }, { model: "gpt-b" }],
        [],
      ),
    ).toEqual(["gpt-a", "gpt-b"]);
  });
});
