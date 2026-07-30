import { useEffect, useState } from "react";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { syncCodexModelToCatalogFirst } from "@/components/providers/forms/ProviderForm";
import {
  buildDraftGroups,
  flattenDraftGroups,
  providerCatalogModels,
  reorderDraftGroups,
  reorderDraftModels,
  type DraftModelEntry,
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
  onChange,
}: {
  entry: DraftModelEntry;
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
        "grid min-h-11 grid-cols-[2rem_1.5rem_minmax(9rem,1fr)_minmax(8rem,0.9fr)_2rem] items-center gap-2 border-t border-border-default px-2 py-1.5",
        !isEnabled && "bg-muted/20 text-muted-foreground",
        isDragging && "relative z-20 bg-background shadow-md",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 cursor-grab text-muted-foreground active:cursor-grabbing"
        title={t("codexConfig.dragModel")}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </Button>

      <Checkbox
        checked={isEnabled}
        onCheckedChange={(checked) => onChange({ enabled: checked === true })}
        aria-label={t("codexConfig.disableModel")}
      />

      <div className="min-w-0">
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
      </div>

      <div
        className="truncate text-xs text-muted-foreground"
        title={entry.model.model}
      >
        {entry.model.model}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground"
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
  onProviderNameChange,
  onEntryChange,
}: {
  group: DraftProviderGroup;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onProviderNameChange: (name: string) => void;
  onEntryChange: (entryKey: string, patch: Partial<CodexCatalogModel>) => void;
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
        "overflow-hidden rounded-md border border-border-default bg-background",
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
          value={group.providerName}
          onChange={(event) => onProviderNameChange(event.target.value)}
          aria-label={t("codexConfig.providerName")}
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
          strategy={verticalListSortingStrategy}
        >
          {group.entries.map((entry) => (
            <SortableMenuModelRow
              key={entry.key}
              entry={entry}
              onChange={(patch) => onEntryChange(entry.key, patch)}
            />
          ))}
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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    if (!open) return;
    const next = buildDraftGroups(providers);
    setGroups(next);
    setCollapsedProviderIds(new Set());
    setInitialSnapshot(JSON.stringify(next));
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

  const handleProviderNameChange = (providerId: string, name: string) => {
    setGroups((current) =>
      current.map((group) =>
        group.providerId === providerId
          ? { ...group, providerName: name }
          : group,
      ),
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
        const normalizedProviderName =
          group?.providerName.trim() || original.name;
        const source = nextByProvider.get(entry.providerId) ?? {
          ...original,
          name: normalizedProviderName,
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
        <DialogHeader>
          <DialogTitle>{t("codexConfig.modelMenuManager")}</DialogTitle>
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
                        onProviderNameChange={(name) =>
                          handleProviderNameChange(group.providerId, name)
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
