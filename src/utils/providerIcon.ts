import type { AppId } from "@/lib/api/types";

/**
 * Grok Build providers created before the provider-icon rules were aligned
 * received the Grok app icon automatically. The icon picker records the
 * selected icon's default color (`currentColor` for Grok), so an empty color
 * identifies the old automatic value without hiding an explicit user choice.
 */
export function resolveProviderIcon(
  appId: AppId,
  icon?: string,
  iconColor?: string,
): string | undefined {
  const normalizedIcon = icon?.trim();
  if (!normalizedIcon) return undefined;

  if (
    appId === "grokbuild" &&
    normalizedIcon === "grok" &&
    !iconColor?.trim()
  ) {
    return undefined;
  }

  return normalizedIcon;
}

const GROUP_ICON_RULES: ReadonlyArray<{
  icon: string;
  keywords: readonly string[];
}> = [
  { icon: "openai", keywords: ["gpt", "openai"] },
  { icon: "grok", keywords: ["grok", "xai"] },
  { icon: "claude", keywords: ["claude", "anthropic"] },
  { icon: "kimi", keywords: ["国模", "国产"] },
];

/**
 * Pick a shared brand avatar from the provider's group memberships. Group order
 * is authoritative, so a provider in several recognized groups uses the first
 * matching group and remains stable when its external provider name changes.
 */
export function resolveGroupedProviderIcon(
  groupNames: readonly string[],
): string | undefined {
  for (const groupName of groupNames) {
    const normalizedName = groupName.trim().toLocaleLowerCase();
    if (!normalizedName) continue;

    const match = GROUP_ICON_RULES.find(({ keywords }) =>
      keywords.some((keyword) => normalizedName.includes(keyword)),
    );
    if (match) return match.icon;
  }

  return undefined;
}
