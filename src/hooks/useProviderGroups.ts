import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppId } from "@/lib/api";
import type { Provider } from "@/types";

export const ALL_GROUP_ID = "__all__";
export const UNGROUPED_GROUP_ID = "__ungrouped__";
export type SpecialGroupId = typeof ALL_GROUP_ID | typeof UNGROUPED_GROUP_ID;
export type ActiveGroupId = SpecialGroupId | string;

export interface ProviderGroup {
  id: string;
  name: string;
  providerIds: string[];
}

interface PerAppGroupsState {
  groups: ProviderGroup[];
  activeGroupId: ActiveGroupId;
  /** Visual order of tabs, including special groups. */
  tabOrder?: ActiveGroupId[];
}

type GroupsState = Partial<Record<AppId, PerAppGroupsState>>;

const STORAGE_KEY = "cc-switch-provider-groups-v1";
const SPECIAL_TAB_IDS: ActiveGroupId[] = [ALL_GROUP_ID, UNGROUPED_GROUP_ID];

const emptyPerApp = (): PerAppGroupsState => ({
  groups: [],
  activeGroupId: ALL_GROUP_ID,
  tabOrder: [...SPECIAL_TAB_IDS],
});

function isSpecialTabId(id: string): id is SpecialGroupId {
  return id === ALL_GROUP_ID || id === UNGROUPED_GROUP_ID;
}

export function normalizeTabOrder(
  groups: ProviderGroup[],
  tabOrder?: ActiveGroupId[],
): ActiveGroupId[] {
  const customIds = groups.map((g) => g.id);
  const customSet = new Set(customIds);
  const seen = new Set<string>();
  const next: ActiveGroupId[] = [];

  for (const id of tabOrder ?? []) {
    if (seen.has(id)) continue;
    if (isSpecialTabId(id) || customSet.has(id)) {
      next.push(id);
      seen.add(id);
    }
  }

  for (const id of SPECIAL_TAB_IDS) {
    if (!seen.has(id)) {
      next.push(id);
      seen.add(id);
    }
  }

  for (const id of customIds) {
    if (!seen.has(id)) {
      next.push(id);
      seen.add(id);
    }
  }

  return next;
}

function normalizePerApp(raw?: PerAppGroupsState | null): PerAppGroupsState {
  if (!raw || typeof raw !== "object") return emptyPerApp();
  const groups = Array.isArray(raw.groups) ? raw.groups : [];
  return {
    groups,
    activeGroupId: raw.activeGroupId ?? ALL_GROUP_ID,
    tabOrder: normalizeTabOrder(groups, raw.tabOrder),
  };
}

function readState(): GroupsState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as GroupsState;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeState(state: GroupsState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / privacy errors
  }
}

function generateGroupId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeName(name: string): string {
  return name.trim().slice(0, 40);
}

export function useProviderGroups(appId: AppId) {
  const appIdRef = useRef(appId);
  const [state, setState] = useState<PerAppGroupsState>(() => {
    const all = readState();
    return normalizePerApp(all[appId]);
  });

  // Only re-hydrate when appId actually changes. Avoid setState on first mount
  // so consumers (e.g. ProviderList card spies) do not get a double render.
  useEffect(() => {
    if (appIdRef.current === appId) return;
    appIdRef.current = appId;
    const all = readState();
    setState(normalizePerApp(all[appId]));
  }, [appId]);

  const persist = useCallback(
    (next: PerAppGroupsState) => {
      const normalized = normalizePerApp(next);
      const all = readState();
      all[appId] = normalized;
      writeState(all);
      setState(normalized);
    },
    [appId],
  );

  const activeGroupId = state.activeGroupId ?? ALL_GROUP_ID;
  const groups = state.groups;
  const tabOrder = useMemo(
    () => normalizeTabOrder(state.groups, state.tabOrder),
    [state.groups, state.tabOrder],
  );

  const setActiveGroupId = useCallback(
    (id: ActiveGroupId) => {
      persist({
        groups: state.groups,
        activeGroupId: id,
        tabOrder: state.tabOrder,
      });
    },
    [persist, state.groups, state.tabOrder],
  );

  const createGroup = useCallback(
    (name: string): string | null => {
      const clean = sanitizeName(name);
      if (!clean) return null;
      const id = generateGroupId();
      const nextGroups = [
        ...state.groups,
        { id, name: clean, providerIds: [] },
      ];
      const next: PerAppGroupsState = {
        groups: nextGroups,
        activeGroupId: id,
        // Always append newly created groups to the end of the tab strip.
        tabOrder: [...normalizeTabOrder(state.groups, state.tabOrder), id],
      };
      persist(next);
      return id;
    },
    [persist, state.groups, state.tabOrder],
  );

  const renameGroup = useCallback(
    (id: string, name: string) => {
      if (isSpecialTabId(id)) return;
      const clean = sanitizeName(name);
      if (!clean) return;
      const next: PerAppGroupsState = {
        ...state,
        groups: state.groups.map((g) =>
          g.id === id ? { ...g, name: clean } : g,
        ),
      };
      persist(next);
    },
    [persist, state],
  );

  const deleteGroup = useCallback(
    (id: string) => {
      if (isSpecialTabId(id)) return;
      const nextGroups = state.groups.filter((g) => g.id !== id);
      const next: PerAppGroupsState = {
        groups: nextGroups,
        activeGroupId:
          state.activeGroupId === id ? ALL_GROUP_ID : state.activeGroupId,
        tabOrder: normalizeTabOrder(nextGroups, state.tabOrder).filter(
          (tabId) => tabId !== id,
        ),
      };
      persist(next);
    },
    [persist, state],
  );

  // Reorder the full tab strip, including special groups.
  const reorderGroups = useCallback(
    (orderedIds: ActiveGroupId[]) => {
      if (!orderedIds.length) return;
      const currentOrder = normalizeTabOrder(state.groups, state.tabOrder);
      const nextOrder = normalizeTabOrder(state.groups, orderedIds);
      const customOrder = nextOrder.filter((id) => !isSpecialTabId(id));
      const byId = new Map(state.groups.map((g) => [g.id, g]));
      const nextGroups: ProviderGroup[] = [];
      for (const id of customOrder) {
        const group = byId.get(id);
        if (group) {
          nextGroups.push(group);
          byId.delete(id);
        }
      }
      for (const leftover of byId.values()) {
        nextGroups.push(leftover);
      }

      const sameTabs =
        nextOrder.length === currentOrder.length &&
        nextOrder.every((id, i) => id === currentOrder[i]);
      const sameGroups =
        nextGroups.length === state.groups.length &&
        nextGroups.every((g, i) => g.id === state.groups[i]?.id);
      if (sameTabs && sameGroups) return;

      persist({
        ...state,
        groups: nextGroups,
        tabOrder: nextOrder,
      });
    },
    [persist, state],
  );

  // Multi-group membership: add to target without removing from others.
  const assignProviders = useCallback(
    (groupId: string, providerIds: string[]) => {
      if (!providerIds.length || isSpecialTabId(groupId)) return;
      const nextGroups = state.groups.map((g) => {
        if (g.id !== groupId) return g;
        const merged = new Set([...g.providerIds, ...providerIds]);
        return { ...g, providerIds: Array.from(merged) };
      });
      persist({ ...state, groups: nextGroups });
    },
    [persist, state],
  );

  const removeFromGroup = useCallback(
    (groupId: string, providerIds: string[]) => {
      if (!providerIds.length || isSpecialTabId(groupId)) return;
      const idSet = new Set(providerIds);
      const nextGroups = state.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              providerIds: g.providerIds.filter((pid) => !idSet.has(pid)),
            }
          : g,
      );
      persist({ ...state, groups: nextGroups });
    },
    [persist, state],
  );

  const removeFromAllGroups = useCallback(
    (providerIds: string[]) => {
      if (!providerIds.length) return;
      const idSet = new Set(providerIds);
      const nextGroups = state.groups.map((g) => {
        const filtered = g.providerIds.filter((pid) => !idSet.has(pid));
        if (filtered.length === g.providerIds.length) return g;
        return { ...g, providerIds: filtered };
      });
      persist({ ...state, groups: nextGroups });
    },
    [persist, state],
  );

  const replaceGroupProvidersByName = useCallback(
    (name: string, providerIds: string[]): string | null => {
      const clean = sanitizeName(name);
      if (!clean) return null;
      const existing = state.groups.find((group) => group.name === clean);
      const groupId = existing?.id ?? generateGroupId();
      const nextGroups = existing
        ? state.groups.map((group) =>
            group.id === groupId ? { ...group, providerIds } : group,
          )
        : [...state.groups, { id: groupId, name: clean, providerIds }];
      persist({
        groups: nextGroups,
        activeGroupId: existing ? state.activeGroupId : groupId,
        tabOrder: existing
          ? state.tabOrder
          : [...normalizeTabOrder(state.groups, state.tabOrder), groupId],
      });
      return groupId;
    },
    [persist, state],
  );

  const replaceGroupsProvidersByName = useCallback(
    (replacements: Array<{ name: string; providerIds: string[] }>) => {
      const normalized = replacements
        .map((item) => ({
          name: sanitizeName(item.name),
          providerIds: item.providerIds,
        }))
        .filter((item) => item.name);
      if (!normalized.length) return;
      const groupsByName = new Map(
        state.groups.map((group) => [group.name, group]),
      );
      const addedIds: string[] = [];
      const nextGroups = [...state.groups];
      normalized.forEach(({ name, providerIds }) => {
        const existing = groupsByName.get(name);
        if (existing) {
          const index = nextGroups.findIndex(
            (group) => group.id === existing.id,
          );
          if (index >= 0) nextGroups[index] = { ...existing, providerIds };
          return;
        }
        const id = generateGroupId();
        addedIds.push(id);
        nextGroups.push({ id, name, providerIds });
        groupsByName.set(name, { id, name, providerIds });
      });
      persist({
        groups: nextGroups,
        activeGroupId: state.activeGroupId,
        tabOrder: [
          ...normalizeTabOrder(state.groups, state.tabOrder),
          ...addedIds,
        ],
      });
    },
    [persist, state],
  );

  // providerId -> groupIds (multi-group)
  const providerToGroups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const g of state.groups) {
      for (const pid of g.providerIds) {
        const list = map.get(pid);
        if (list) list.push(g.id);
        else map.set(pid, [g.id]);
      }
    }
    return map;
  }, [state.groups]);

  const getGroupsOf = useCallback(
    (providerId: string): ProviderGroup[] => {
      const ids = providerToGroups.get(providerId);
      if (!ids?.length) return [];
      return state.groups.filter((g) => ids.includes(g.id));
    },
    [providerToGroups, state.groups],
  );

  // Backward-compatible: first group id if any.
  const getGroupOf = useCallback(
    (providerId: string): string | undefined =>
      providerToGroups.get(providerId)?.[0],
    [providerToGroups],
  );

  const filterByActiveGroup = useCallback(
    (providers: Provider[]): Provider[] => {
      if (activeGroupId === ALL_GROUP_ID) return providers;
      if (activeGroupId === UNGROUPED_GROUP_ID) {
        return providers.filter((p) => !providerToGroups.has(p.id));
      }
      const target = state.groups.find((g) => g.id === activeGroupId);
      if (!target) return providers;
      const idSet = new Set(target.providerIds);
      return providers.filter((p) => idSet.has(p.id));
    },
    [activeGroupId, providerToGroups, state.groups],
  );

  return {
    groups,
    tabOrder,
    activeGroupId,
    setActiveGroupId,
    createGroup,
    renameGroup,
    deleteGroup,
    reorderGroups,
    assignProviders,
    removeFromGroup,
    removeFromAllGroups,
    replaceGroupProvidersByName,
    replaceGroupsProvidersByName,
    getGroupOf,
    getGroupsOf,
    filterByActiveGroup,
  };
}
