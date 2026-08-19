import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "@/components/ui/checkbox";

describe("Checkbox", () => {
  it("keeps the compact Radix visual style and boolean callback contract", () => {
    const onCheckedChange = vi.fn();

    const { rerender } = render(
      <Checkbox
        checked
        aria-label="toggle model"
        onCheckedChange={onCheckedChange}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "toggle model" });
    expect(checkbox.tagName).toBe("BUTTON");
    expect(checkbox).toHaveAttribute("data-state", "checked");
    expect(checkbox).toHaveClass(
      "h-4",
      "w-4",
      "data-[state=checked]:bg-primary",
    );
    expect(checkbox.querySelector("svg")).toHaveClass("h-4", "w-4");

    fireEvent.click(checkbox);
    expect(onCheckedChange).toHaveBeenCalledWith(false);

    rerender(
      <Checkbox
        checked="indeterminate"
        aria-label="toggle model"
        onCheckedChange={onCheckedChange}
      />,
    );
    expect(checkbox).toHaveAttribute("data-state", "indeterminate");
    expect(checkbox).toHaveAttribute("aria-checked", "mixed");
    expect(checkbox.querySelector("svg")).toHaveClass("h-4", "w-4");
  });
});
