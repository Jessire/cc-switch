import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppSwitcher } from "./AppSwitcher";

describe("AppSwitcher", () => {
  it("keeps only Codex and Grok Build icon-only in the normal layout", () => {
    render(
      <AppSwitcher
        activeApp="codex"
        onSwitch={vi.fn()}
        visibleApps={{
          claude: true,
          "claude-desktop": false,
          codex: true,
          gemini: false,
          grokbuild: true,
          opencode: false,
          openclaw: false,
          hermes: false,
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Codex" })).toHaveClass("px-2");
    expect(screen.getByText("Codex")).toHaveClass("max-w-0", "opacity-0");
    expect(screen.getByRole("button", { name: "Grok Build" })).toHaveClass(
      "px-2",
    );
    expect(screen.getByText("Grok Build")).toHaveClass("max-w-0", "opacity-0");
    expect(screen.getByRole("button", { name: "Claude Code" })).toHaveClass(
      "px-3",
    );
    expect(screen.getByText("Claude Code")).toHaveClass(
      "max-w-[120px]",
      "opacity-100",
    );
  });
});
