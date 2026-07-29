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
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { syncCodexModelToCatalogFirst } from "@/components/providers/forms/ProviderForm";

interface CodexModelMenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providers: Record<string, Provider>;
  currentProviderId: string;
}

interface DraftModelEntry {
  key: string;
  providerId: string;
  providerName: string;
  modelIndex: number;
  model: CodexCatalogModel;
}

function providerCatalogModels(provider: Provider): CodexCatalogModel[] {
  const catalog = provider.settingsConfig?.modelCatalog;
  return Array.isArray(catalog?.models)
    ? catalog.models.filter(
        (model: unknown): model is CodexCatalogModel =>
          !!model &&
          typeof model === "object" &&
          typeof (model as CodexCatalogModel).model === "string",
      )
    : [];
}

function buildDraftEntries(
  providers: Record<string, Provider>,
): DraftModelEntry[] {
  const entries = Object.values(providers)
    .filter((provider) => provider.meta?.codexModelMenuFavorite === true)
    .sort(
      (left, right) =>
        (left.sortIndex ?? Number.MAX_SAFE_INTEGER) -
          (right.sortIndex ?? Number.MAX_SAFE_INTEGER) ||
        left.name.localeCompare(right.name, "zh-CN"),
    )
    .flatMap((provider) =>
      providerCatalogModels(provider).map((model, modelIndex) => ({
        key: JSON.stringify([provider.id, modelIndex]),
        providerId: provider.id,
        providerName: provider.name,
        modelIndex,
        model: { ...model },
      })),
    );

  return entries.sort((left, right) => {
    const leftOrder = left.model.menuOrder;
    const rightOrder = right.model.menuOrder;
    if (leftOrder === undefined && rightOrder !== undefined) return -1;
    if (leftOrder !== undefined && rightOrder === undefined) return 1;
    if (leftOrder !== undefined && rightOrder !== undefined) {
      return leftOrder - rightOrder;
    }
    return 0;
  });
}

function SortableMenuModelRow({
  entry,
  onChange,
  onProviderNameChange,
}: {
  entry: DraftModelEntry;
  onChange: (patch: Partial<CodexCatalogModel>) => void;
  onProviderNameChange: (name: string) => void;
}) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.key });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "grid min-h-12 grid-cols-[2rem_1.5rem_minmax(9rem,1fr)_minmax(8rem,0.8fr)] items-center gap-2 border-b border-border-default px-2 py-1.5 last:border-b-0",
        entry.model.enabled === false && "bg-muted/25 text-muted-foreground",
        isDragging && "relative z-10 bg-background shadow-md",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 cursor-grab text-muted-foreground active:cursor-grabbing"
        title={t("codexConfig.dragModel", { defaultValue: "Drag to reorder" })}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </Button>
      <Checkbox
        checked={entry.model.enabled !== false}
        onCheckedChange={(checked) => onChange({ enabled: checked === true })}
        aria-label={t("codexConfig.disableModel", {
          defaultValue: "Show in Codex menu",
        })}
      />
      <div className="min-w-0">
        <Input
          value={entry.model.displayName ?? ""}
          onChange={(event) => onChange({ displayName: event.target.value })}
          placeholder={entry.model.model}
          aria-label={t("codexConfig.catalogColumnDisplay", {
            defaultValue: "Menu display name",
          })}
          className="h-8"
        />
      </div>
      <div className="min-w-0 space-y-0.5">
        <Input
          value={entry.providerName}
          onChange={(event) => onProviderNameChange(event.target.value)}
          aria-label={t("codexConfig.providerName", {
            defaultValue: "供应商名称",
          })}
          className="h-8 text-xs"
        />
        <div
          className="truncate px-1 text-[11px] text-muted-foreground"
          title={entry.model.model}
        >
          {entry.model.model}
        </div>
      </div>
    </div>
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
  const [entries, setEntries] = useState<DraftModelEntry[]>([]);
  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    if (!open) return;
    const next = buildDraftEntries(providers);
    setEntries(next);
    setInitialSnapshot(JSON.stringify(next));
  }, [open, providers]);

  const duplicateGroups = useMemo(() => {
    const groups = new Map<string, DraftModelEntry[]>();
    for (const entry of entries) {
      if (entry.model.enabled === false || !entry.model.model.trim()) continue;
      const id = entry.model.model.trim();
      groups.set(id, [...(groups.get(id) ?? []), entry]);
    }
    return [...groups.entries()].filter(([, group]) => group.length > 1);
  }, [entries]);

  const handleEntryChange = (
    key: string,
    patch: Partial<CodexCatalogModel>,
  ) => {
    setEntries((current) =>
      current.map((entry) =>
        entry.key === key
          ? { ...entry, model: { ...entry.model, ...patch } }
          : entry,
      ),
    );
  };

  const handleProviderNameChange = (providerId: string, name: string) => {
    setEntries((current) =>
      current.map((entry) =>
        entry.providerId === providerId
          ? { ...entry, providerName: name }
          : entry,
      ),
    );
  };

  const handleDefaultProviderChange = (modelId: string, key: string) => {
    setEntries((current) =>
      current.map((entry) =>
        entry.model.model.trim() === modelId
          ? {
              ...entry,
              model: {
                ...entry.model,
                isNativeDefault: entry.key === key,
              },
            }
          : entry,
      ),
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setEntries((current) => {
      const oldIndex = current.findIndex((entry) => entry.key === active.id);
      const newIndex = current.findIndex((entry) => entry.key === over.id);
      if (oldIndex < 0 || newIndex < 0) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
  };

  const hasChanges = JSON.stringify(entries) !== initialSnapshot;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const nextByProvider = new Map<string, Provider>();
      entries.forEach((entry, menuOrder) => {
        const normalizedProviderName =
          entry.providerName.trim() || providers[entry.providerId].name;
        const source = nextByProvider.get(entry.providerId) ?? {
          ...providers[entry.providerId],
          name: normalizedProviderName,
          settingsConfig: {
            ...providers[entry.providerId].settingsConfig,
            modelCatalog: {
              ...providers[entry.providerId].settingsConfig.modelCatalog,
              models: providerCatalogModels(providers[entry.providerId]).map(
                (model) => ({ ...model }),
              ),
            },
          },
        };
        const models = source.settingsConfig.modelCatalog
          .models as CodexCatalogModel[];
        const { isNativeDefault: _isNativeDefault, ...model } = entry.model;
        models[entry.modelIndex] = {
          ...model,
          menuOrder,
          ...(entry.model.isNativeDefault === true
            ? { isNativeDefault: true }
            : {}),
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
      toast.success(
        t("codexConfig.modelMenuSaved", {
          defaultValue: "Codex 模型菜单已更新",
        }),
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(
        t("codexConfig.modelMenuSaveFailed", {
          error: extractErrorMessage(error),
          defaultValue: "Codex 模型菜单保存失败: {{error}}",
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
        className="max-h-[calc(100vh-2rem)] max-w-3xl overflow-hidden"
      >
        <DialogHeader>
          <DialogTitle>
            {t("codexConfig.modelMenuManager", {
              defaultValue: "Codex 模型菜单",
            })}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {duplicateGroups.length > 0 && (
            <section className="space-y-2">
              <div className="text-xs font-semibold text-foreground">
                {t("codexConfig.nativeDefaultProvider", {
                  defaultValue: "同名模型默认供应商",
                })}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {duplicateGroups.map(([modelId, group]) => {
                  const selected =
                    group.find((entry) => entry.model.isNativeDefault === true)
                      ?.key ?? group[0].key;
                  return (
                    <div
                      key={modelId}
                      className="grid grid-cols-[minmax(7rem,1fr)_minmax(8rem,1fr)] items-center gap-2"
                    >
                      <span className="truncate text-xs" title={modelId}>
                        {modelId}
                      </span>
                      <Select
                        value={selected}
                        onValueChange={(value) =>
                          handleDefaultProviderChange(modelId, value)
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {group.map((entry) => (
                            <SelectItem key={entry.key} value={entry.key}>
                              {entry.providerName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="min-h-0 overflow-hidden rounded-md border border-border-default">
            <div className="grid grid-cols-[3.5rem_minmax(9rem,1fr)_minmax(8rem,0.8fr)] gap-2 border-b border-border-default bg-muted/30 px-3 py-2 text-[11px] font-medium text-muted-foreground">
              <span />
              <span>
                {t("codexConfig.catalogColumnDisplay", {
                  defaultValue: "Menu display name",
                })}
              </span>
              <span>
                {t("codexConfig.modelAndProvider", {
                  defaultValue: "模型 / 供应商",
                })}
              </span>
            </div>
            {entries.length > 0 ? (
              <ScrollArea className="h-[min(50vh,26rem)]">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={entries.map((entry) => entry.key)}
                    strategy={verticalListSortingStrategy}
                  >
                    {entries.map((entry) => (
                      <SortableMenuModelRow
                        key={entry.key}
                        entry={entry}
                        onChange={(patch) =>
                          handleEntryChange(entry.key, patch)
                        }
                        onProviderNameChange={(name) =>
                          handleProviderNameChange(entry.providerId, name)
                        }
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </ScrollArea>
            ) : (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                {t("codexConfig.noFavoriteModels", {
                  defaultValue: "收藏供应商后, 已勾选的模型会显示在这里。",
                })}
              </div>
            )}
          </section>
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
