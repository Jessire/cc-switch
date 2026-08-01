import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Loader2,
  Pencil,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { CodexCatalogModel, Provider } from "@/types";
import { providersApi } from "@/lib/api/providers";
import { extractErrorMessage } from "@/utils/errorUtils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { syncCodexModelToCatalogFirst } from "@/components/providers/forms/ProviderForm";
import {
  buildDraftGroups,
  findDraftModelRenameMatches,
  flattenDraftGroups,
  providerCatalogModels,
  reorderDraftGroups,
  reorderDraftModels,
  type DraftModelEntry,
  type DraftModelRenameMatch,
  type DraftProviderGroup,
} from "@/components/providers/codexModelMenuState";

interface CodexModelMenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providers: Record<string, Provider>;
  currentProviderId: string;
}

function SortableMenuModelRow({
  entry,
  position,
  onChange,
}: {
  entry: DraftModelEntry;
  position: number;
  onChange: (patch: Partial<CodexCatalogModel>) => void;
}) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: entry.key,
    data: { type: "model", providerId: entry.providerId },
  });
  const isEnabled = entry.model.enabled !== false;
  const displayName = entry.model.displayName?.trim() || entry.model.model;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group/model-row grid min-h-12 grid-cols-[1.5rem_1.75rem_minmax(0,1fr)_2rem] items-center gap-2 rounded-lg border border-border-default bg-background px-2 py-1 transition-colors",
        !isEnabled && "bg-muted/20 text-muted-foreground",
        isDragging && "relative z-20 shadow-lg",
      )}
    >
      <span
        className="inline-flex h-6 w-6 cursor-grab items-center justify-center rounded-md bg-primary/10 text-xs font-medium tabular-nums text-primary active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        {position}
      </span>

      <Checkbox
        checked={isEnabled}
        onCheckedChange={(checked) => onChange({ enabled: checked === true })}
        aria-label={t("codexConfig.disableModel")}
      />

      <div className="min-w-0 space-y-0.5">
        {isEditing ? (
          <Input
            value={entry.model.displayName ?? ""}
            onChange={(event) => onChange({ displayName: event.target.value })}
            placeholder={entry.model.model}
            aria-label={t("codexConfig.catalogColumnDisplay")}
            className="h-8"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") setIsEditing(false);
            }}
          />
        ) : (
          <div
            className="truncate px-1 text-sm font-medium text-foreground"
            title={displayName}
          >
            {displayName}
          </div>
        )}
        <div
          className="truncate px-1 text-xs text-muted-foreground"
          title={entry.model.model}
        >
          {entry.model.model}
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 justify-self-end text-muted-foreground/45 opacity-30 transition-all group-hover/model-row:opacity-100 group-focus-within/model-row:opacity-100 hover:bg-muted hover:text-foreground",
          isEditing && "bg-muted text-foreground opacity-100",
        )}
        onClick={() => setIsEditing((current) => !current)}
        title={
          isEditing
            ? t("codexConfig.finishModelNameEdit")
            : t("codexConfig.editModelName")
        }
      >
        {isEditing ? (
          <Check className="h-4 w-4" />
        ) : (
          <Pencil className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

function SortableProviderGroup({
  group,
  collapsed,
  onToggleCollapsed,
  onMenuGroupNameChange,
  onEntryChange,
}: {
  group: DraftProviderGroup;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onMenuGroupNameChange: (name: string) => void;
  onEntryChange: (key: string, patch: Partial<CodexCatalogModel>) => void;
}) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.key, data: { type: "group" } });

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "overflow-hidden rounded-xl border border-border-default bg-background",
        isDragging && "relative z-10 shadow-lg",
      )}
    >
      <div className="grid min-h-11 grid-cols-[2rem_2rem_minmax(10rem,1fr)_auto] items-center gap-1.5 bg-muted/35 px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={onToggleCollapsed}
          title={
            collapsed
              ? t("codexConfig.expandProviderModels")
              : t("codexConfig.collapseProviderModels")
          }
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 cursor-grab text-muted-foreground active:cursor-grabbing"
          title={t("codexConfig.dragProviderGroup")}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>

        <Input
          value={group.menuGroupName}
          onChange={(event) => onMenuGroupNameChange(event.target.value)}
          aria-label={t("codexConfig.menuGroupName")}
          className="h-8 border-transparent bg-transparent px-2 text-sm font-semibold shadow-none hover:border-input focus:border-input focus:bg-background"
        />

        <span className="shrink-0 rounded-md bg-background/80 px-2 py-1 text-[11px] font-medium text-muted-foreground">
          {t("codexConfig.providerModelCount", {
            count: group.entries.length,
          })}
        </span>
      </div>

      {!collapsed && (
        <SortableContext
          items={group.entries.map((entry) => entry.key)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 gap-2 p-2 md:grid-cols-3">
            {group.entries.map((entry, index) => (
              <SortableMenuModelRow
                key={entry.key}
                entry={entry}
                position={index + 1}
                onChange={(patch) => onEntryChange(entry.key, patch)}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </section>
  );
}

export function CodexModelMenuDialog({
  open,
  onOpenChange,
  providers,
  currentProviderId,
}: CodexModelMenuDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [groups, setGroups] = useState<DraftProviderGroup[]>([]);
  const [collapsedProviderIds, setCollapsedProviderIds] = useState<Set<string>>(
    new Set(),
  );
  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [renameFrom, setRenameFrom] = useState("");
  const [renameTo, setRenameTo] = useState("");
  const [isRenamePreviewOpen, setIsRenamePreviewOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    if (!open) return;
    const next = buildDraftGroups(providers);
    setGroups(next);
    setCollapsedProviderIds(new Set());
    setInitialSnapshot(JSON.stringify(next));
    setRenameFrom("");
    setRenameTo("");
    setIsRenamePreviewOpen(false);
  }, [open, providers]);

  const handleEntryChange = (
    key: string,
    patch: Partial<CodexCatalogModel>,
  ) => {
    setGroups((current) =>
      current.map((group) => ({
        ...group,
        entries: group.entries.map((entry) =>
          entry.key === key
            ? { ...entry, model: { ...entry.model, ...patch } }
            : entry,
        ),
      })),
    );
  };

  const handleMenuGroupNameChange = (providerId: string, name: string) => {
    setGroups((current) =>
      current.map((group) =>
        group.providerId === providerId
          ? { ...group, menuGroupName: name }
          : group,
      ),
    );
  };

  const renameMatches = useMemo(
    () => findDraftModelRenameMatches(groups, renameFrom, renameTo),
    [groups, renameFrom, renameTo],
  );

  const handleBatchRename = () => {
    if (!renameFrom.trim() || !renameMatches.length) return;
    const matchesByKey = new Map<string, DraftModelRenameMatch>(
      renameMatches.map((match) => [match.entryKey, match]),
    );

    setGroups((current) =>
      current.map((group) => ({
        ...group,
        entries: group.entries.map((entry) => {
          const match = matchesByKey.get(entry.key);
          return match
            ? { ...entry, model: { ...entry.model, displayName: match.after } }
            : entry;
        }),
      })),
    );
    setIsRenamePreviewOpen(false);
    toast.success(
      t("codexConfig.batchRenameApplied", { count: renameMatches.length }),
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    if (active.data.current?.type === "group") {
      if (over.data.current?.type !== "group") return;
      setGroups((current) =>
        reorderDraftGroups(current, String(active.id), String(over.id)),
      );
      return;
    }

    if (
      active.data.current?.type !== "model" ||
      over.data.current?.type !== "model"
    ) {
      return;
    }
    const providerId = active.data.current.providerId as string;
    if (providerId !== over.data.current.providerId) return;

    setGroups((current) =>
      reorderDraftModels(
        current,
        providerId,
        String(active.id),
        String(over.id),
      ),
    );
  };

  const hasChanges = JSON.stringify(groups) !== initialSnapshot;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const nextByProvider = new Map<string, Provider>();
      flattenDraftGroups(groups).forEach((entry, menuOrder) => {
        const original = providers[entry.providerId];
        if (!original) return;
        const group = groups.find(
          (item) => item.providerId === entry.providerId,
        );
        const normalizedMenuGroupName =
          group?.menuGroupName.trim() || original.name;
        const source = nextByProvider.get(entry.providerId) ?? {
          ...original,
          meta: {
            ...original.meta,
            codexModelMenuGroupName: normalizedMenuGroupName,
          },
          settingsConfig: {
            ...original.settingsConfig,
            modelCatalog: {
              ...original.settingsConfig.modelCatalog,
              models: providerCatalogModels(original).map((model) => ({
                ...model,
              })),
            },
          },
        };
        const models = source.settingsConfig.modelCatalog
          .models as CodexCatalogModel[];
        const {
          isNativeDefault: _isNativeDefault,
          is_native_default: _is_native_default,
          ...model
        } = entry.model as CodexCatalogModel & {
          isNativeDefault?: unknown;
          is_native_default?: unknown;
        };
        models[entry.modelIndex] = {
          ...model,
          menuOrder,
        };
        nextByProvider.set(entry.providerId, source);
      });

      const changed = [...nextByProvider.values()]
        .map((provider) => {
          const models = providerCatalogModels(provider);
          const configText = provider.settingsConfig.config;
          return {
            ...provider,
            settingsConfig: {
              ...provider.settingsConfig,
              ...(typeof configText === "string"
                ? { config: syncCodexModelToCatalogFirst(configText, models) }
                : {}),
            },
          };
        })
        .filter(
          (provider) =>
            JSON.stringify(provider) !== JSON.stringify(providers[provider.id]),
        )
        .sort((left, right) => {
          if (left.id === currentProviderId) return 1;
          if (right.id === currentProviderId) return -1;
          return 0;
        });

      for (const provider of changed) {
        await providersApi.update(provider, "codex");
      }
      await queryClient.invalidateQueries({ queryKey: ["providers", "codex"] });
      toast.success(t("codexConfig.modelMenuSaved"));
      onOpenChange(false);
    } catch (error) {
      toast.error(
        t("codexConfig.modelMenuSaveFailed", {
          error: extractErrorMessage(error),
        }),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        zIndex="top"
        className="max-h-[calc(100vh-2rem)] max-w-4xl overflow-hidden"
      >
        <DialogHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <DialogTitle className="shrink-0">
            {t("codexConfig.modelMenuManager")}
          </DialogTitle>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5">
            <Input
              value={renameFrom}
              onChange={(event) => {
                setRenameFrom(event.target.value);
                setIsRenamePreviewOpen(event.target.value.trim().length > 0);
              }}
              placeholder={t("codexConfig.batchRenameFrom")}
              aria-label={t("codexConfig.batchRenameFrom")}
              className="h-8 w-28 text-xs sm:w-32"
            />
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <Input
              value={renameTo}
              onChange={(event) => {
                setRenameTo(event.target.value);
                setIsRenamePreviewOpen(renameFrom.trim().length > 0);
              }}
              placeholder={t("codexConfig.batchRenameTo")}
              aria-label={t("codexConfig.batchRenameTo")}
              className="h-8 w-28 text-xs sm:w-32"
            />
            <Popover
              open={isRenamePreviewOpen && renameMatches.length > 0}
              onOpenChange={setIsRenamePreviewOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!renameFrom.trim()}
                  className="h-8 gap-1 rounded-md px-2 text-xs"
                >
                  {renameFrom.trim()
                    ? t("codexConfig.batchRenameMatchCount", {
                        count: renameMatches.length,
                      })
                    : t("codexConfig.batchRenamePreview")}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-[min(34rem,calc(100vw-3rem))] p-2"
              >
                <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-foreground">
                    {t("codexConfig.batchRenamePreview")}
                  </span>
                  <span className="text-muted-foreground">
                    {t("codexConfig.batchRenameMatchCount", {
                      count: renameMatches.length,
                    })}
                  </span>
                </div>
                <ScrollArea className="max-h-64">
                  <div className="space-y-1 pr-2">
                    {renameMatches.map((match) => (
                      <div
                        key={match.entryKey}
                        className="grid grid-cols-[minmax(0,1fr)_1rem_minmax(0,1fr)] items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/60"
                      >
                        <div className="min-w-0">
                          <div
                            className="truncate text-foreground"
                            title={match.before}
                          >
                            {match.before}
                          </div>
                          <div
                            className="truncate text-[10px] text-muted-foreground"
                            title={match.modelId}
                          >
                            {match.modelId}
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <div
                          className="truncate text-foreground"
                          title={match.after || match.modelId}
                        >
                          {match.after || match.modelId}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              size="sm"
              onClick={handleBatchRename}
              disabled={!renameFrom.trim() || renameMatches.length === 0}
              className="h-8 rounded-md px-2.5 text-xs"
            >
              {t("codexConfig.batchRenameAction")}
            </Button>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 px-6 py-4">
          {groups.length > 0 ? (
            <ScrollArea className="h-[min(58vh,32rem)] pr-3">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={groups.map((group) => group.key)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {groups.map((group) => (
                      <SortableProviderGroup
                        key={group.key}
                        group={group}
                        collapsed={collapsedProviderIds.has(group.providerId)}
                        onToggleCollapsed={() =>
                          setCollapsedProviderIds((current) => {
                            const next = new Set(current);
                            if (next.has(group.providerId)) {
                              next.delete(group.providerId);
                            } else {
                              next.add(group.providerId);
                            }
                            return next;
                          })
                        }
                        onMenuGroupNameChange={(name) =>
                          handleMenuGroupNameChange(group.providerId, name)
                        }
                        onEntryChange={handleEntryChange}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </ScrollArea>
          ) : (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              {t("codexConfig.noFavoriteModels")}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
