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
import { ArrowRight, ChevronDown, GripVertical, Loader2 } from "lucide-react";
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
        "group/model-row grid min-h-12 grid-cols-[1.5rem_1.75rem_minmax(0,1fr)] items-center gap-2 rounded-md border border-transparent bg-transparent px-2 py-1.5 transition-colors hover:bg-muted/50 hover:border-border-default",
        !isEnabled && "bg-muted/20 text-muted-foreground",
        isDragging &&
          "relative z-20 bg-background shadow-md ring-1 ring-border-default",
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
            onBlur={() => setIsEditing(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter") setIsEditing(false);
            }}
          />
        ) : (
          <button
            type="button"
            className="block min-w-0 max-w-full truncate bg-transparent px-1 text-left text-sm font-medium text-foreground hover:text-primary hover:underline hover:underline-offset-2"
            title={t("codexConfig.editModelName")}
            onClick={() => setIsEditing(true)}
          >
            {displayName}
          </button>
        )}
        <div
          className="truncate px-1 text-xs text-muted-foreground"
          title={entry.model.model}
        >
          {entry.model.model}
        </div>
      </div>
    </div>
  );
}

function SortableProviderGroup({
  group,
  onMenuGroupNameChange,
  onEntryChange,
  onGroupEnabledChange,
}: {
  group: DraftProviderGroup;
  onMenuGroupNameChange: (name: string) => void;
  onEntryChange: (key: string, patch: Partial<CodexCatalogModel>) => void;
  onGroupEnabledChange: (enabled: boolean) => void;
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
  const enabledCount = group.entries.filter(
    (entry) => entry.model.enabled !== false,
  ).length;
  const groupChecked: boolean | "indeterminate" =
    enabledCount === group.entries.length
      ? true
      : enabledCount === 0
        ? false
        : "indeterminate";
  const compactRow = group.entries.length <= 2;

  const groupHeader = (
    <div className="flex min-w-0 items-center gap-2">
      <Checkbox
        checked={groupChecked}
        onCheckedChange={() =>
          onGroupEnabledChange(enabledCount !== group.entries.length)
        }
        aria-label={t("codexConfig.enableProviderModels", {
          defaultValue: "Show this group's models in the Codex menu",
        })}
        className="h-7 w-7 rounded-lg"
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 cursor-grab rounded-md text-muted-foreground active:cursor-grabbing"
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
        className="h-8 min-w-0 flex-1 border-transparent bg-transparent px-1 text-base font-medium shadow-none hover:border-input focus:border-input focus:bg-background"
      />

      <span className="shrink-0 px-1 text-xs font-normal tabular-nums text-muted-foreground">
        {t("codexConfig.providerModelCount", {
          count: group.entries.length,
        })}
      </span>
    </div>
  );

  const models = (layout: "inline" | "grid") => (
    <SortableContext
      items={group.entries.map((entry) => entry.key)}
      strategy={rectSortingStrategy}
    >
      <div
        className={cn(
          layout === "inline"
            ? "contents"
            : "grid grid-cols-1 gap-1 px-2 pb-2 pt-1 md:grid-cols-3",
        )}
      >
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
  );

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "overflow-hidden rounded-xl border border-border-default bg-background",
        isDragging && "relative z-10 shadow-md ring-1 ring-border-default",
      )}
    >
      {compactRow ? (
        <div className="grid min-h-11 grid-cols-[minmax(10rem,0.9fr)_repeat(2,minmax(0,1fr))] items-center gap-1.5 bg-muted/35 px-2.5 py-1.5">
          {groupHeader}
          {models("inline")}
        </div>
      ) : (
        <>
          <div className="bg-muted/35 px-3 py-1.5">{groupHeader}</div>
          {models("grid")}
        </>
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

  const handleGroupEnabledChange = (providerId: string, enabled: boolean) => {
    setGroups((current) =>
      current.map((group) =>
        group.providerId === providerId
          ? {
              ...group,
              entries: group.entries.map((entry) => ({
                ...entry,
                model: { ...entry.model, enabled },
              })),
            }
          : group,
      ),
    );
  };

  const renameMatches = useMemo(
    () => findDraftModelRenameMatches(groups, renameFrom, renameTo),
    [groups, renameFrom, renameTo],
  );

  useEffect(() => {
    if (renameMatches.length === 0) setIsRenamePreviewOpen(false);
  }, [renameMatches.length]);

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
  const totalModelCount = groups.reduce(
    (total, group) => total + group.entries.length,
    0,
  );
  const enabledModelCount = groups.reduce(
    (total, group) =>
      total +
      group.entries.filter((entry) => entry.model.enabled !== false).length,
    0,
  );

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
        <DialogHeader className="gap-2 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <DialogTitle className="shrink-0 text-base">
            {t("codexConfig.modelMenuManager")}
          </DialogTitle>
          <div className="flex min-w-0 flex-1 flex-wrap items-end justify-end gap-x-1.5 gap-y-1.5">
            <label className="flex flex-col gap-1">
              <span className="px-1 text-[11px] leading-none text-muted-foreground">
                {t("codexConfig.batchRenameFrom")}
              </span>
              <Input
                value={renameFrom}
                onChange={(event) => {
                  setRenameFrom(event.target.value);
                }}
                placeholder={t("codexConfig.batchRenameFromPlaceholder")}
                aria-label={t("codexConfig.batchRenameFrom")}
                className="h-8 w-32 text-xs sm:w-40"
              />
            </label>
            <ArrowRight className="mb-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <label className="flex flex-col gap-1">
              <span className="px-1 text-[11px] leading-none text-muted-foreground">
                {t("codexConfig.batchRenameTo")}
              </span>
              <Input
                value={renameTo}
                onChange={(event) => {
                  setRenameTo(event.target.value);
                }}
                placeholder={t("codexConfig.batchRenameToPlaceholder")}
                aria-label={t("codexConfig.batchRenameTo")}
                className="h-8 w-32 text-xs sm:w-40"
              />
            </label>
            <Popover
              open={isRenamePreviewOpen}
              onOpenChange={setIsRenamePreviewOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={renameMatches.length === 0}
                  className="h-8 gap-1 rounded-md px-2 text-xs"
                >
                  {t("codexConfig.batchRenamePreview")}
                  {renameMatches.length > 0 && (
                    <span className="tabular-nums">{renameMatches.length}</span>
                  )}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="end"
                sideOffset={6}
                className="z-[130] w-[min(34rem,calc(100vw-3rem))] p-2"
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
              variant="outline"
              size="sm"
              onClick={handleBatchRename}
              disabled={!renameFrom.trim() || renameMatches.length === 0}
              className="h-8 rounded-md px-2.5 text-xs"
            >
              {t("codexConfig.batchRenameAction")}
            </Button>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 px-4 py-3 sm:px-6 sm:py-3">
          {groups.length > 0 ? (
            <ScrollArea className="h-[min(62vh,36rem)] pr-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={groups.map((group) => group.key)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1.5">
                    {groups.map((group) => (
                      <SortableProviderGroup
                        key={group.key}
                        group={group}
                        onMenuGroupNameChange={(name) =>
                          handleMenuGroupNameChange(group.providerId, name)
                        }
                        onEntryChange={handleEntryChange}
                        onGroupEnabledChange={(enabled) =>
                          handleGroupEnabledChange(group.providerId, enabled)
                        }
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

        <DialogFooter className="gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="mr-auto text-xs tabular-nums text-muted-foreground">
            {t("codexConfig.modelMenuEnabledCount", {
              enabled: enabledModelCount,
              total: totalModelCount,
            })}
          </div>
          <div className="flex items-center justify-end gap-2">
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
