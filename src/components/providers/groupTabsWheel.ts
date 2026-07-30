export interface GroupTabsWheelTarget {
  scrollWidth: number;
  clientWidth: number;
  scrollLeft: number;
}

export interface GroupTabsWheelEvent {
  deltaX: number;
  deltaY: number;
  preventDefault: () => void;
  stopPropagation: () => void;
}

export function consumeGroupTabsWheel(
  target: GroupTabsWheelTarget,
  event: GroupTabsWheelEvent,
): boolean {
  if (event.deltaX === 0 && event.deltaY === 0) return false;

  event.preventDefault();
  event.stopPropagation();

  if (target.scrollWidth <= target.clientWidth) return true;

  const delta =
    Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ? event.deltaX
      : event.deltaY;
  const maxScrollLeft = target.scrollWidth - target.clientWidth;
  target.scrollLeft = Math.min(
    maxScrollLeft,
    Math.max(0, target.scrollLeft + delta),
  );
  return true;
}
