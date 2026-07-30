import { describe, expect, it, vi } from "vitest";
import { consumeGroupTabsWheel } from "./groupTabsWheel";

function createEvent(deltaX: number, deltaY: number) {
  return {
    deltaX,
    deltaY,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
}

describe("consumeGroupTabsWheel", () => {
  it("uses vertical wheel movement to scroll the group strip horizontally", () => {
    const target = { scrollWidth: 500, clientWidth: 200, scrollLeft: 80 };
    const event = createEvent(0, 60);

    expect(consumeGroupTabsWheel(target, event)).toBe(true);
    expect(target.scrollLeft).toBe(140);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
  });

  it("keeps consuming wheel events at the right boundary", () => {
    const target = { scrollWidth: 500, clientWidth: 200, scrollLeft: 300 };
    const event = createEvent(0, 80);

    expect(consumeGroupTabsWheel(target, event)).toBe(true);
    expect(target.scrollLeft).toBe(300);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
  });

  it("keeps consuming wheel events even when the strip does not overflow", () => {
    const target = { scrollWidth: 180, clientWidth: 200, scrollLeft: 0 };
    const event = createEvent(0, 80);

    expect(consumeGroupTabsWheel(target, event)).toBe(true);
    expect(target.scrollLeft).toBe(0);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
  });

  it("ignores wheel events without movement", () => {
    const target = { scrollWidth: 500, clientWidth: 200, scrollLeft: 80 };
    const event = createEvent(0, 0);

    expect(consumeGroupTabsWheel(target, event)).toBe(false);
    expect(target.scrollLeft).toBe(80);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
  });
});
