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
}

type GroupsState = Partial<Record<AppId, PerAppGroupsState>>;

const STORAGE_KEY = "cc-switch-provider-groups-v1";

const emptyPerApp = (): PerAppGroupsState => ({
  groups: [],
  activeGroupId: ALL_GROUP_ID,
});

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
    return all[appId] ?? emptyPerApp();
  });

  // Only re-hydrate when appId actually changes. Avoid setState on first mount
  // so consumers (e.g. ProviderList card spies) do not get a double render.
  useEffect(() => {
    if (appIdRef.current === appId) return;
    appIdRef.current = appId;
    const all = readState();
    setState(all[appId] ?? emptyPerApp());
  }, [appId]);

  const persist = useCallback(
    (next: PerAppGroupsState) => {
      const all = readState();
      all[appId] = next;
      writeState(all);
      setState(next);
    },
    [appId],
  );

  const activeGroupId = state.activeGroupId ?? ALL_GROUP_ID;
  const groups = state.groups;

  const setActiveGroupId = useCallback(
    (id: ActiveGroupId) => {
      persist({ groups: state.groups, activeGroupId: id });
    },
    [persist, state.groups],
  );

  const createGroup = useCallback(
    (name: string): string | null => {
      const clean = sanitizeName(name);
      if (!clean) return null;
      const id = generateGroupId();
      const next: PerAppGroupsState = {
        groups: [...state.groups, { id, name: clean, providerIds: [] }],
        activeGroupId: id,
      };
      persist(next);
      return id;
    },
    [persist, state.groups],
  );

  const renameGroup = useCallback(
    (id: string, name: string) => {
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
      const next: PerAppGroupsState = {
        groups: state.groups.filter((g) => g.id !== id),
        activeGroupId:
          state.activeGroupId === id ? ALL_GROUP_ID : state.activeGroupId,
      };
      persist(next);
    },
    [persist, state],
  );

  const assignProviders = useCallback(
    (groupId: string, providerIds: string[]) => {
      if (!providerIds.length) return;
      const idSet = new Set(providerIds);
      const nextGroups = state.groups.map((g) => {
        if (g.id === groupId) {
          const merged = new Set([...g.providerIds, ...providerIds]);
          return { ...g, providerIds: Array.from(merged) };
        }
        // remove overlapping ids from other groups (single-group membership)
        const filtered = g.providerIds.filter((pid) => !idSet.has(pid));
        if (filtered.length === g.providerIds.length) return g;
        return { ...g, providerIds: filtered };
      });
      persist({ ...state, groups: nextGroups });
    },
    [persist, state],
  );

  const removeFromGroup = useCallback(
    (groupId: string, providerIds: string[]) => {
      if (!providerIds.length) return;
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

  const providerToGroup = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of state.groups) {
      for (const pid of g.providerIds) {
        map.set(pid, g.id);
      }
    }
    return map;
  }, [state.groups]);

  const getGroupOf = useCallback(
    (providerId: string): string | undefined => providerToGroup.get(providerId),
    [providerToGroup],
  );

  const filterByActiveGroup = useCallback(
    (providers: Provider[]): Provider[] => {
      if (activeGroupId === ALL_GROUP_ID) return providers;
      if (activeGroupId === UNGROUPED_GROUP_ID) {
        return providers.filter((p) => !providerToGroup.has(p.id));
      }
      const target = state.groups.find((g) => g.id === activeGroupId);
      if (!target) return providers;
      const idSet = new Set(target.providerIds);
      return providers.filter((p) => idSet.has(p.id));
    },
    [activeGroupId, providerToGroup, state.groups],
  );

  return {
    groups,
    activeGroupId,
    setActiveGroupId,
    createGroup,
    renameGroup,
    deleteGroup,
    assignProviders,
    removeFromGroup,
    removeFromAllGroups,
    getGroupOf,
    filterByActiveGroup,
  };
}
