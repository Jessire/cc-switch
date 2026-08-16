import { CSS } from "@dnd-kit/utilities";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Download, ListTree, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Provider } from "@/types";
import type { AppId } from "@/lib/api";
import { providersApi } from "@/lib/api/providers";
import { extractErrorMessage } from "@/utils/errorUtils";
import { useDragSort } from "@/hooks/useDragSort";
import {
  useOpenClawLiveProviderIds,
  useOpenClawDefaultModel,
} from "@/hooks/useOpenClaw";
import {
  useHermesLiveProviderIds,
  useHermesModelConfig,
} from "@/hooks/useHermes";
import { useStreamCheck } from "@/hooks/useStreamCheck";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { ProviderEmptyState } from "@/components/providers/ProviderEmptyState";
import {
  useAutoFailoverEnabled,
  useFailoverQueue,
  useAddToFailoverQueue,
  useRemoveFromFailoverQueue,
} from "@/lib/query/failover";
import {
  useCurrentOmoProviderId,
  useCurrentOmoSlimProviderId,
} from "@/lib/query/omo";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { isTextEditableTarget } from "@/utils/domUtils";
import {
  useProviderGroups,
  ALL_GROUP_ID,
  UNGROUPED_GROUP_ID,
  type ActiveGroupId,
  type ProviderGroup,
} from "@/hooks/useProviderGroups";
import { GroupTabs } from "@/components/providers/GroupTabs";
import { BulkAssignBar } from "@/components/providers/BulkAssignBar";
import { CodexModelMenuDialog } from "@/components/providers/CodexModelMenuDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  buildGrokBuildGroupReplacements,
  buildGrokBuildProviderFromCodex,
} from "@/utils/grokBuildProviderImport";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProviderListProps {
  providers: Record<string, Provider>;
  currentProviderId: string;
  appId: AppId;
  onSwitch: (
    provider: Provider,
    context?: { isWithinCustomGroup?: boolean },
  ) => void;
  onEdit: (provider: Provider) => void;
  onDelete: (provider: Provider) => void;
  onDeleteSelected?: (providerIds: string[]) => Promise<void>;
  onRemoveFromConfig?: (provider: Provider) => void;
  onDisableOmo?: () => void;
  onDisableOmoSlim?: () => void;
  onDuplicate: (provider: Provider) => void;
  onConfigureUsage?: (provider: Provider) => void;
  onOpenWebsite: (url: string) => void;
  onOpenTerminal?: (provider: Provider) => void;
  onCreate?: () => void;
  codexProviders?: Record<string, Provider>;
  onImportCodexProviders?: (providers: Provider[]) => Promise<Provider[]>;
  isLoading?: boolean;
  isProxyRunning?: boolean; // 代理服务运行状态
  isProxyTakeover?: boolean; // 代理接管模式（Live配置已被接管）
  activeProviderId?: string; // 代理当前实际使用的供应商 ID（用于故障转移模式下标注绿色边框）
  onSetAsDefault?: (provider: Provider) => void; // OpenClaw: set as default model
}

export function ProviderList({
  providers,
  currentProviderId,
  appId,
  onSwitch,
  onEdit,
  onDelete,
  onDeleteSelected = async () => undefined,
  onRemoveFromConfig,
  onDisableOmo,
  onDisableOmoSlim,
  onDuplicate,
  onConfigureUsage,
  onOpenWebsite,
  onOpenTerminal,
  onCreate,
  codexProviders = {},
  onImportCodexProviders,
  isLoading = false,
  isProxyRunning = false,
  isProxyTakeover = false,
  activeProviderId,
  onSetAsDefault,
}: ProviderListProps) {
  const { t } = useTranslation();
  const {
    groups: providerGroups,
    tabOrder,
    activeGroupId,
    setActiveGroupId,
    createGroup: createProviderGroup,
    renameGroup: renameProviderGroup,
    deleteGroup: deleteProviderGroup,
    reorderGroups,
    assignProviders: assignProvidersToGroup,
    removeFromGroup: removeProvidersFromGroup,
    removeFromAllGroups: removeProvidersFromAllGroups,
    replaceGroupsProvidersByName,
    getGroupsOf,
    filterByActiveGroup,
  } = useProviderGroups(appId);
  const codexGroupsState = useProviderGroups("codex");
  const providerCounts = useMemo(
    () =>
      new Map(
        providerGroups.map((group) => [
          group.id,
          group.providerIds.filter((providerId) =>
            Boolean(providers[providerId]),
          ).length,
        ]),
      ),
    [providerGroups, providers],
  );
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false);
  const [isCodexModelMenuOpen, setIsCodexModelMenuOpen] = useState(false);
  const [selectedCodexGroupIds, setSelectedCodexGroupIds] = useState<string[]>(
    [],
  );
  const appIdRef = useRef(appId);
  useEffect(() => {
    if (appId !== "grokbuild") return;
    setSelectedCodexGroupIds((current) => {
      const available = new Set(
        codexGroupsState.groups.map((group) => group.id),
      );
      return current.filter((id) => available.has(id));
    });
  }, [appId, codexGroupsState.groups]);
  // Only reset bulk selection when the app tab changes, not on first mount.
  useEffect(() => {
    if (appIdRef.current === appId) return;
    appIdRef.current = appId;
    setSelectionMode(false);
    setSelectedIds([]);
  }, [appId]);
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);
  const lastSelectedIdRef = useRef<string | null>(null);
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) setSelectedIds([]);
      return !prev;
    });
  }, []);
  const clearSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds([]);
    lastSelectedIdRef.current = null;
  }, []);
  const handleActiveGroupChange = useCallback(
    (id: ActiveGroupId) => {
      setActiveGroupId(id);
      setSelectedIds([]);
    },
    [setActiveGroupId],
  );
  const handleProviderSwitch = useCallback(
    (provider: Provider) => {
      const currentGroupIds = new Set(
        getGroupsOf(currentProviderId).map((group) => group.id),
      );
      const isWithinCustomGroup = getGroupsOf(provider.id).some((group) =>
        currentGroupIds.has(group.id),
      );
      if (isWithinCustomGroup) {
        onSwitch(provider, { isWithinCustomGroup: true });
      } else {
        onSwitch(provider);
      }
    },
    [currentProviderId, getGroupsOf, onSwitch],
  );
  const handleAssignSelectedTo = useCallback(
    (groupId: string) => {
      if (!selectedIds.length) return;
      assignProvidersToGroup(groupId, selectedIds);
      setSelectedIds([]);
      setSelectionMode(false);
    },
    [assignProvidersToGroup, selectedIds],
  );
  const handleCreateGroupFromBar = useCallback(
    (name: string) => {
      const id = createProviderGroup(name);
      if (id && selectedIds.length) {
        assignProvidersToGroup(id, selectedIds);
        setSelectedIds([]);
        setSelectionMode(false);
      }
    },
    [assignProvidersToGroup, createProviderGroup, selectedIds],
  );
  const handleRemoveSelectedFromCurrent = useCallback(() => {
    if (!selectedIds.length) return;
    if (
      activeGroupId === ALL_GROUP_ID ||
      activeGroupId === UNGROUPED_GROUP_ID
    ) {
      removeProvidersFromAllGroups(selectedIds);
    } else {
      removeProvidersFromGroup(activeGroupId, selectedIds);
    }
    setSelectedIds([]);
    setSelectionMode(false);
  }, [
    activeGroupId,
    removeProvidersFromAllGroups,
    removeProvidersFromGroup,
    selectedIds,
  ]);
  const { checkProvider, isChecking } = useStreamCheck(appId);
  const { sortedProviders, sensors, handleDragEnd } = useDragSort(
    providers,
    appId,
  );

  const { data: opencodeLiveIds } = useQuery({
    queryKey: ["opencodeLiveProviderIds"],
    queryFn: () => providersApi.getOpenCodeLiveProviderIds(),
    enabled: appId === "opencode",
  });

  // OpenClaw: 查询 live 配置中的供应商 ID 列表，用于判断 isInConfig
  const { data: openclawLiveIds } = useOpenClawLiveProviderIds(
    appId === "openclaw",
  );

  // Hermes: 查询 live 配置中的供应商 ID 列表，用于判断 isInConfig
  const { data: hermesLiveIds } = useHermesLiveProviderIds(appId === "hermes");

  // Hermes: 读取当前 model.provider，用于判断哪个供应商是"当前激活"（高亮）
  const { data: hermesModelConfig } = useHermesModelConfig(appId === "hermes");
  const hermesCurrentProviderId = hermesModelConfig?.provider;

  // 判断供应商是否已添加到配置（累加模式应用：OpenCode/OpenClaw/Hermes）
  const isProviderInConfig = useCallback(
    (providerId: string): boolean => {
      if (appId === "opencode") {
        return opencodeLiveIds?.includes(providerId) ?? false;
      }
      if (appId === "openclaw") {
        return openclawLiveIds?.includes(providerId) ?? false;
      }
      if (appId === "hermes") {
        return hermesLiveIds?.includes(providerId) ?? false;
      }
      return true; // 其他应用始终返回 true
    },
    [appId, opencodeLiveIds, openclawLiveIds, hermesLiveIds],
  );

  // OpenClaw: query default model to determine which provider is default
  const { data: openclawDefaultModel } = useOpenClawDefaultModel(
    appId === "openclaw",
  );

  const isProviderDefaultModel = useCallback(
    (providerId: string): boolean => {
      if (appId !== "openclaw" || !openclawDefaultModel?.primary) return false;
      return openclawDefaultModel.primary.startsWith(providerId + "/");
    },
    [appId, openclawDefaultModel],
  );

  // 故障转移相关
  const { data: isAutoFailoverEnabled } = useAutoFailoverEnabled(appId);
  const { data: failoverQueue } = useFailoverQueue(appId);
  const addToQueue = useAddToFailoverQueue();
  const removeFromQueue = useRemoveFromFailoverQueue();

  const isFailoverModeActive =
    isProxyTakeover === true && isAutoFailoverEnabled === true;

  const isOpenCode = appId === "opencode";
  const { data: currentOmoId } = useCurrentOmoProviderId(isOpenCode);
  const { data: currentOmoSlimId } = useCurrentOmoSlimProviderId(isOpenCode);

  const getFailoverPriority = useCallback(
    (providerId: string): number | undefined => {
      if (!isFailoverModeActive || !failoverQueue) return undefined;
      const index = failoverQueue.findIndex(
        (item) => item.providerId === providerId,
      );
      return index >= 0 ? index + 1 : undefined;
    },
    [isFailoverModeActive, failoverQueue],
  );

  const isInFailoverQueue = useCallback(
    (providerId: string): boolean => {
      if (!isFailoverModeActive || !failoverQueue) return false;
      return failoverQueue.some((item) => item.providerId === providerId);
    },
    [isFailoverModeActive, failoverQueue],
  );

  const handleToggleFailover = useCallback(
    (providerId: string, enabled: boolean) => {
      if (enabled) {
        addToQueue.mutate({ appType: appId, providerId });
      } else {
        removeFromQueue.mutate({ appType: appId, providerId });
      }
    },
    [appId, addToQueue, removeFromQueue],
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { data: claudeDesktopStatus } = useQuery({
    queryKey: ["claudeDesktopStatus"],
    queryFn: () => providersApi.getClaudeDesktopStatus(),
    enabled: appId === "claude-desktop",
    refetchInterval: appId === "claude-desktop" ? 5000 : false,
  });

  // 连通性检查不发真实请求、无封号/计费风险，直接执行（无需确认弹窗）。
  const handleTest = useCallback(
    (provider: Provider) => {
      checkProvider(provider.id, provider.name);
    },
    [checkProvider],
  );

  // Import current live config as default provider
  const queryClient = useQueryClient();
  const favoriteMutation = useMutation({
    mutationFn: async ({
      provider,
      favorite,
    }: {
      provider: Provider;
      favorite: boolean;
    }) => {
      const updated: Provider = {
        ...provider,
        meta: {
          ...(provider.meta ?? {}),
          codexModelMenuFavorite: favorite,
        },
      };
      await providersApi.update(updated, "codex");
      return updated;
    },
    onSuccess: async (provider) => {
      await queryClient.invalidateQueries({ queryKey: ["providers", "codex"] });
      toast.success(
        provider.meta?.codexModelMenuFavorite
          ? t("codexConfig.providerFavorited", {
              defaultValue: "已加入 Codex 模型菜单",
            })
          : t("codexConfig.providerUnfavorited", {
              defaultValue: "已从 Codex 模型菜单隐藏",
            }),
      );
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const importMutation = useMutation({
    mutationFn: async (): Promise<boolean> => {
      if (appId === "opencode") {
        const count = await providersApi.importOpenCodeFromLive();
        return count > 0;
      }
      if (appId === "openclaw") {
        const count = await providersApi.importOpenClawFromLive();
        return count > 0;
      }
      if (appId === "hermes") {
        const count = await providersApi.importHermesFromLive();
        return count > 0;
      }
      if (appId === "claude-desktop") {
        const count = await providersApi.importClaudeDesktopFromClaude();
        return count > 0;
      }
      return providersApi.importDefault(appId);
    },
    onSuccess: (imported) => {
      if (imported) {
        queryClient.invalidateQueries({ queryKey: ["providers", appId] });
        if (appId === "claude-desktop") {
          queryClient.invalidateQueries({ queryKey: ["claudeDesktopStatus"] });
        }
        toast.success(t("provider.importCurrentDescription"));
      } else {
        toast.info(t("provider.noProviders"));
      }
    },
    onError: (error: unknown) => {
      // Tauri invoke 的 reject 值是后端序列化出的纯字符串而非 Error 对象，
      // 取 .message 只会得到 undefined（空 toast）。
      toast.error(extractErrorMessage(error) || t("settings.importFailed"));
      // 导入失败前也可能已产生需要上屏的副作用：GrokBuild 官方登录态下点
      // 导入，命令层会先补种官方条目、随后才因 live 不可导入而报错。
      queryClient.invalidateQueries({ queryKey: ["providers", appId] });
    },
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "f") {
        // 正在输入框/可编辑区域中时不抢占 Ctrl+F（例如添加供应商表单里
        // ProviderPresetSelector 的搜索框），避免与其同名快捷键冲突。
        if (isTextEditableTarget(document.activeElement)) return;
        event.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      if (key === "escape") {
        setIsSearchOpen(false);
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isSearchOpen) {
      const frame = requestAnimationFrame(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [isSearchOpen]);

  const filteredProviders = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return sortedProviders;
    return sortedProviders.filter((provider) => {
      const fields = [provider.name, provider.notes, provider.websiteUrl];
      return fields.some((field) =>
        field?.toString().toLowerCase().includes(keyword),
      );
    });
  }, [searchTerm, sortedProviders]);

  const groupFilteredProviders = useMemo(
    () => filterByActiveGroup(filteredProviders),
    [filterByActiveGroup, filteredProviders],
  );
  const toggleProviderSelection = useCallback(
    (id: string, shiftKey = false) => {
      const visibleIds = groupFilteredProviders.map((provider) => provider.id);
      const lastId = lastSelectedIdRef.current;
      if (shiftKey && lastId) {
        const start = visibleIds.indexOf(lastId);
        const end = visibleIds.indexOf(id);
        if (start >= 0 && end >= 0) {
          const [from, to] = start <= end ? [start, end] : [end, start];
          setSelectedIds((current) =>
            Array.from(
              new Set([...current, ...visibleIds.slice(from, to + 1)]),
            ),
          );
          lastSelectedIdRef.current = id;
          return;
        }
      }
      toggleSelect(id);
      lastSelectedIdRef.current = id;
    },
    [groupFilteredProviders, toggleSelect],
  );

  const groupFilteredIdSet = useMemo(
    () => new Set(groupFilteredProviders.map((p) => p.id)),
    [groupFilteredProviders],
  );

  const effectiveSelectedIds = useMemo(
    () => selectedIds.filter((id) => groupFilteredIdSet.has(id)),
    [selectedIds, groupFilteredIdSet],
  );
  const allVisibleSelected =
    groupFilteredProviders.length > 0 &&
    groupFilteredProviders.every((provider) =>
      selectedIds.includes(provider.id),
    );
  const toggleSelectAllVisible = useCallback(() => {
    const visibleIds = groupFilteredProviders.map((provider) => provider.id);
    setSelectedIds((current) => {
      const currentSet = new Set(current);
      if (visibleIds.every((id) => currentSet.has(id))) {
        visibleIds.forEach((id) => currentSet.delete(id));
      } else {
        visibleIds.forEach((id) => currentSet.add(id));
      }
      return Array.from(currentSet);
    });
  }, [groupFilteredProviders]);

  const claudeDesktopStatusMessages = useMemo(() => {
    if (appId !== "claude-desktop" || !claudeDesktopStatus) return [];

    const messages: string[] = [];
    if (!claudeDesktopStatus.supported) {
      messages.push(
        t("claudeDesktop.statusUnsupported", {
          defaultValue: "当前平台暂不支持 Claude Desktop 3P 配置写入。",
        }),
      );
      return messages;
    }

    if (claudeDesktopStatus.staleRawModels) {
      messages.push(
        t("claudeDesktop.statusStaleRawModels", {
          defaultValue:
            "Claude Desktop profile 中存在非 claude-* 模型名，新版 Claude Desktop 可能拒绝加载；重新切换当前供应商可修复。",
        }),
      );
    }
    if (claudeDesktopStatus.missingRouteMappings) {
      messages.push(
        t("claudeDesktop.statusMissingRouteMappings", {
          defaultValue:
            "当前供应商启用了模型映射，但没有有效路由；请编辑供应商并补全至少一个模型映射。",
        }),
      );
    }
    if (
      claudeDesktopStatus.mode === "proxy" &&
      !claudeDesktopStatus.gatewayTokenConfigured
    ) {
      messages.push(
        t("claudeDesktop.statusGatewayTokenMissing", {
          defaultValue:
            "当前本地路由 token 尚未生成；重新切换该供应商会写入新的本地 token。",
        }),
      );
    }

    const expected = claudeDesktopStatus.expectedBaseUrl?.replace(/\/+$/, "");
    const actual = claudeDesktopStatus.actualBaseUrl?.replace(/\/+$/, "");
    if (expected && actual && expected !== actual) {
      messages.push(
        t("claudeDesktop.statusBaseUrlMismatch", {
          expected,
          actual,
          defaultValue:
            "Claude Desktop profile 指向的地址与当前供应商不一致；当前为 {{actual}}，应为 {{expected}}。重新切换当前供应商可修复。",
        }),
      );
    }

    return messages;
  }, [appId, claudeDesktopStatus, t]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="w-full border border-dashed rounded-lg h-28 border-muted-foreground/40 bg-muted/40"
          />
        ))}
      </div>
    );
  }

  if (sortedProviders.length === 0) {
    return (
      <ProviderEmptyState
        appId={appId}
        onCreate={onCreate}
        onImport={() => importMutation.mutate()}
      />
    );
  }

  const renderProviderList = () => (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={groupFilteredProviders.map((provider) => provider.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1.5">
          {groupFilteredProviders.map((provider) => {
            const isOmo = provider.category === "omo";
            const isOmoSlim = provider.category === "omo-slim";
            const isOmoCurrent = isOmo && provider.id === (currentOmoId || "");
            const isOmoSlimCurrent =
              isOmoSlim && provider.id === (currentOmoSlimId || "");
            const isHermesCurrent =
              appId === "hermes" && hermesCurrentProviderId === provider.id;
            return (
              <SortableProviderCard
                key={provider.id}
                provider={provider}
                isCurrent={
                  isOmo
                    ? isOmoCurrent
                    : isOmoSlim
                      ? isOmoSlimCurrent
                      : appId === "hermes"
                        ? isHermesCurrent
                        : provider.id === currentProviderId
                }
                appId={appId}
                isInConfig={isProviderInConfig(provider.id)}
                isOmo={isOmo}
                isOmoSlim={isOmoSlim}
                onSwitch={handleProviderSwitch}
                onEdit={onEdit}
                onDelete={onDelete}
                onRemoveFromConfig={onRemoveFromConfig}
                onDisableOmo={onDisableOmo}
                onDisableOmoSlim={onDisableOmoSlim}
                onDuplicate={onDuplicate}
                onConfigureUsage={onConfigureUsage}
                onOpenWebsite={onOpenWebsite}
                onOpenTerminal={onOpenTerminal}
                onTest={handleTest}
                isTesting={isChecking(provider.id)}
                isProxyRunning={isProxyRunning}
                isProxyTakeover={isProxyTakeover}
                isAutoFailoverEnabled={isFailoverModeActive}
                failoverPriority={getFailoverPriority(provider.id)}
                isInFailoverQueue={isInFailoverQueue(provider.id)}
                onToggleFailover={(enabled) =>
                  handleToggleFailover(provider.id, enabled)
                }
                activeProviderId={activeProviderId}
                // OpenClaw: default model / Hermes: model.provider === provider.id
                isDefaultModel={
                  appId === "hermes"
                    ? isHermesCurrent
                    : isProviderDefaultModel(provider.id)
                }
                onSetAsDefault={
                  onSetAsDefault ? () => onSetAsDefault(provider) : undefined
                }
                selectionMode={selectionMode}
                isSelected={selectedIds.includes(provider.id)}
                onToggleSelect={toggleProviderSelection}
                membershipGroups={getGroupsOf(provider.id)}
                allGroups={providerGroups}
                onAssignToGroup={(groupId) =>
                  assignProvidersToGroup(groupId, [provider.id])
                }
                onRemoveFromGroup={(groupId) =>
                  removeProvidersFromGroup(groupId, [provider.id])
                }
                onCreateGroupAndAssign={(name) => {
                  const id = createProviderGroup(name);
                  if (id) assignProvidersToGroup(id, [provider.id]);
                }}
                onToggleCodexFavorite={(item, favorite) =>
                  favoriteMutation.mutate({ provider: item, favorite })
                }
                isCodexFavoritePending={
                  favoriteMutation.isPending &&
                  favoriteMutation.variables?.provider.id === provider.id
                }
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );

  return (
    <div className="mt-3 space-y-3">
      {claudeDesktopStatusMessages.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t("claudeDesktop.statusTitle", {
              defaultValue: "Claude Desktop 配置需要检查",
            })}
          </div>
          <ul className="mt-2 space-y-1 text-xs leading-relaxed">
            {claudeDesktopStatusMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      <GroupTabs
        groups={providerGroups}
        providerCounts={providerCounts}
        tabOrder={tabOrder}
        activeGroupId={activeGroupId}
        selectionMode={selectionMode}
        onSelectGroup={handleActiveGroupChange}
        onCreateGroup={createProviderGroup}
        onRenameGroup={renameProviderGroup}
        onDeleteGroup={deleteProviderGroup}
        onReorderGroups={reorderGroups}
        onToggleSelectionMode={toggleSelectionMode}
        onCreateProvider={onCreate}
        extraAction={
          appId === "grokbuild" && onImportCodexProviders ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 rounded-lg px-2.5 text-xs"
                >
                  <Download className="h-3.5 w-3.5" />从 Codex 导入
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 max-w-[calc(100vw-2rem)] overflow-hidden p-1"
              >
                <DropdownMenuLabel>选择要导入的 Codex 分组</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {codexGroupsState.groups.length === 0 ? (
                  <DropdownMenuLabel className="font-normal text-muted-foreground">
                    {t("provider.noProviders")}
                  </DropdownMenuLabel>
                ) : (
                  <div className="max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain pr-0.5 [scrollbar-gutter:stable]">
                    {codexGroupsState.groups.map((group) => (
                      <DropdownMenuCheckboxItem
                        key={group.id}
                        checked={selectedCodexGroupIds.includes(group.id)}
                        className="min-h-9 pl-8 pr-2 focus:outline-none focus:ring-0 data-[highlighted]:bg-muted/60 data-[highlighted]:text-foreground"
                        onSelect={(event) => event.preventDefault()}
                        onCheckedChange={(checked) =>
                          setSelectedCodexGroupIds((current) =>
                            checked
                              ? [...new Set([...current, group.id])]
                              : current.filter((id) => id !== group.id),
                          )
                        }
                      >
                        <span
                          className="min-w-0 flex-1 truncate"
                          title={group.name}
                        >
                          {group.name} ({group.providerIds.length})
                        </span>
                      </DropdownMenuCheckboxItem>
                    ))}
                  </div>
                )}
                <DropdownMenuSeparator />
                <Button
                  type="button"
                  size="sm"
                  className="m-1 h-8 w-[calc(100%-0.5rem)]"
                  disabled={selectedCodexGroupIds.length === 0}
                  onClick={() => {
                    const selected = new Set(selectedCodexGroupIds);
                    const selectedGroups = codexGroupsState.groups.filter(
                      (group) => selected.has(group.id),
                    );
                    const sourceProviderIds = Array.from(
                      new Set(
                        selectedGroups.flatMap((group) => group.providerIds),
                      ),
                    ).filter((id) => {
                      const provider = codexProviders[id];
                      return (
                        Boolean(provider) && provider.category !== "official"
                      );
                    });
                    const selectedProviders = sourceProviderIds
                      .map((id) => codexProviders[id])
                      .filter((provider): provider is Provider =>
                        Boolean(provider),
                      )
                      .map(buildGrokBuildProviderFromCodex);
                    void onImportCodexProviders(selectedProviders).then(
                      (importedProviders) => {
                        replaceGroupsProvidersByName(
                          buildGrokBuildGroupReplacements(
                            selectedGroups,
                            codexProviders,
                            sourceProviderIds,
                            importedProviders,
                          ),
                        );
                        setSelectedCodexGroupIds([]);
                        toast.success(
                          `已按分组从 Codex 导入 ${importedProviders.length} 个中转站`,
                        );
                      },
                      (error) => toast.error(extractErrorMessage(error)),
                    );
                  }}
                >
                  导入已选择的分组
                </Button>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : appId === "codex" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 rounded-lg px-2.5 text-xs"
              onClick={() => setIsCodexModelMenuOpen(true)}
            >
              <ListTree className="h-3.5 w-3.5" />
              {t("codexConfig.modelMenuButton", {
                defaultValue: "模型菜单",
              })}
            </Button>
          ) : undefined
        }
      />
      <CodexModelMenuDialog
        open={isCodexModelMenuOpen}
        onOpenChange={setIsCodexModelMenuOpen}
        providers={providers}
        currentProviderId={currentProviderId}
      />
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            key="provider-search"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed left-1/2 top-[6.5rem] z-40 w-[min(90vw,26rem)] -translate-x-1/2 sm:right-6 sm:left-auto sm:translate-x-0"
          >
            <div className="p-4 space-y-3 border shadow-md rounded-2xl border-white/10 bg-background/95 shadow-black/20 backdrop-blur-md">
              <div className="relative flex items-center gap-2">
                <Search className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none left-3 top-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={t("provider.searchPlaceholder", {
                    defaultValue: "Search name, notes, or URL...",
                  })}
                  aria-label={t("provider.searchAriaLabel", {
                    defaultValue: "Search providers",
                  })}
                  className="pr-16 pl-9"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute text-xs -translate-y-1/2 right-11 top-1/2"
                    onClick={() => setSearchTerm("")}
                  >
                    {t("common.clear", { defaultValue: "Clear" })}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  onClick={() => setIsSearchOpen(false)}
                  aria-label={t("provider.searchCloseAriaLabel", {
                    defaultValue: "Close provider search",
                  })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>
                  {t("provider.searchScopeHint", {
                    defaultValue: "Matches provider name, notes, and URL.",
                  })}
                </span>
                <span>
                  {t("provider.searchCloseHint", {
                    defaultValue: "Press Esc to close",
                  })}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {filteredProviders.length === 0 ? (
        <div className="px-6 py-8 text-sm text-center border border-dashed rounded-lg border-border text-muted-foreground">
          {t("provider.noSearchResults", {
            defaultValue: "No providers match your search.",
          })}
        </div>
      ) : groupFilteredProviders.length === 0 ? (
        <div className="px-6 py-8 text-sm text-center border border-dashed rounded-lg border-border text-muted-foreground">
          {t("group.emptyGroup", {
            defaultValue: "No providers in this group.",
          })}
        </div>
      ) : (
        renderProviderList()
      )}
      {selectionMode && (
        <BulkAssignBar
          selectedCount={effectiveSelectedIds.length}
          groups={providerGroups}
          activeGroupId={activeGroupId}
          onAssignTo={handleAssignSelectedTo}
          onRemoveFromCurrent={handleRemoveSelectedFromCurrent}
          onCreateGroup={handleCreateGroupFromBar}
          onCancel={clearSelection}
          allSelected={allVisibleSelected}
          onToggleSelectAll={toggleSelectAllVisible}
          onDeleteSelected={() => setDeleteSelectedOpen(true)}
        />
      )}
      <ConfirmDialog
        isOpen={deleteSelectedOpen}
        title={t("group.deleteSelectedTitle")}
        message={t("group.deleteSelectedMessage", {
          count: effectiveSelectedIds.length,
        })}
        variant="destructive"
        onConfirm={() => {
          setDeleteSelectedOpen(false);
          void onDeleteSelected(effectiveSelectedIds).then(clearSelection);
        }}
        onCancel={() => setDeleteSelectedOpen(false)}
      />
    </div>
  );
}

interface SortableProviderCardProps {
  provider: Provider;
  isCurrent: boolean;
  appId: AppId;
  isInConfig: boolean;
  isOmo: boolean;
  isOmoSlim: boolean;
  onSwitch: (provider: Provider) => void;
  onEdit: (provider: Provider) => void;
  onDelete: (provider: Provider) => void;
  onRemoveFromConfig?: (provider: Provider) => void;
  onDisableOmo?: () => void;
  onDisableOmoSlim?: () => void;
  onDuplicate: (provider: Provider) => void;
  onConfigureUsage?: (provider: Provider) => void;
  onOpenWebsite: (url: string) => void;
  onOpenTerminal?: (provider: Provider) => void;
  onTest?: (provider: Provider) => void;
  isTesting: boolean;
  isProxyRunning: boolean;
  isProxyTakeover: boolean;
  isAutoFailoverEnabled: boolean;
  failoverPriority?: number;
  isInFailoverQueue: boolean;
  onToggleFailover: (enabled: boolean) => void;
  activeProviderId?: string;
  // OpenClaw: default model
  isDefaultModel?: boolean;
  onSetAsDefault?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string, shiftKey?: boolean) => void;
  membershipGroups?: ProviderGroup[];
  allGroups?: ProviderGroup[];
  onAssignToGroup?: (groupId: string) => void;
  onRemoveFromGroup?: (groupId: string) => void;
  onCreateGroupAndAssign?: (name: string) => void;
  onToggleCodexFavorite?: (provider: Provider, favorite: boolean) => void;
  isCodexFavoritePending?: boolean;
}

function SortableProviderCard({
  provider,
  isCurrent,
  appId,
  isInConfig,
  isOmo,
  isOmoSlim,
  onSwitch,
  onEdit,
  onDelete,
  onRemoveFromConfig,
  onDisableOmo,
  onDisableOmoSlim,
  onDuplicate,
  onConfigureUsage,
  onOpenWebsite,
  onOpenTerminal,
  onTest,
  isTesting,
  isProxyRunning,
  isProxyTakeover,
  isAutoFailoverEnabled,
  failoverPriority,
  isInFailoverQueue,
  onToggleFailover,
  activeProviderId,
  isDefaultModel,
  onSetAsDefault,
  selectionMode,
  isSelected,
  onToggleSelect,
  membershipGroups,
  allGroups,
  onAssignToGroup,
  onRemoveFromGroup,
  onCreateGroupAndAssign,
  onToggleCodexFavorite,
  isCodexFavoritePending,
}: SortableProviderCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: provider.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ProviderCard
        provider={provider}
        isCurrent={isCurrent}
        appId={appId}
        isInConfig={isInConfig}
        isOmo={isOmo}
        isOmoSlim={isOmoSlim}
        onSwitch={onSwitch}
        onEdit={onEdit}
        onDelete={onDelete}
        onRemoveFromConfig={onRemoveFromConfig}
        onDisableOmo={onDisableOmo}
        onDisableOmoSlim={onDisableOmoSlim}
        onDuplicate={onDuplicate}
        onConfigureUsage={
          onConfigureUsage ? (item) => onConfigureUsage(item) : () => undefined
        }
        onOpenWebsite={onOpenWebsite}
        onOpenTerminal={onOpenTerminal}
        onTest={onTest}
        isTesting={isTesting}
        isProxyRunning={isProxyRunning}
        isProxyTakeover={isProxyTakeover}
        dragHandleProps={{
          attributes,
          listeners,
          isDragging,
        }}
        isAutoFailoverEnabled={isAutoFailoverEnabled}
        failoverPriority={failoverPriority}
        isInFailoverQueue={isInFailoverQueue}
        onToggleFailover={onToggleFailover}
        activeProviderId={activeProviderId}
        // OpenClaw: default model
        isDefaultModel={isDefaultModel}
        onSetAsDefault={onSetAsDefault}
        selectionMode={selectionMode}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        membershipGroups={membershipGroups}
        allGroups={allGroups}
        onAssignToGroup={onAssignToGroup}
        onRemoveFromGroup={onRemoveFromGroup}
        onCreateGroupAndAssign={onCreateGroupAndAssign}
        onToggleCodexFavorite={onToggleCodexFavorite}
        isCodexFavoritePending={isCodexFavoritePending}
      />
    </div>
  );
}
