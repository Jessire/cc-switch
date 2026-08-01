import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
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
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  MoreVertical,
  Plus,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import { consumeGroupTabsWheel } from "./groupTabsWheel";
import {
  ALL_GROUP_ID,
  UNGROUPED_GROUP_ID,
  type ActiveGroupId,
  type ProviderGroup,
} from "@/hooks/useProviderGroups";

interface GroupTabsProps {
  groups: ProviderGroup[];
  providerCounts: ReadonlyMap<string, number>;
  tabOrder: ActiveGroupId[];
  activeGroupId: ActiveGroupId;
  selectionMode: boolean;
  onSelectGroup: (id: ActiveGroupId) => void;
  onCreateGroup: (name: string) => string | null;
  onRenameGroup: (id: string, name: string) => void;
  onDeleteGroup: (id: string) => void;
  onReorderGroups: (orderedIds: ActiveGroupId[]) => void;
  onToggleSelectionMode: () => void;
  onCreateProvider?: () => void;
  extraAction?: ReactNode;
}

type EditingState =
  | { mode: "create" }
  | { mode: "rename"; groupId: string; initialName: string }
  | null;

type TabItem =
  | { kind: "special"; id: typeof ALL_GROUP_ID | typeof UNGROUPED_GROUP_ID }
  | { kind: "custom"; group: ProviderGroup };

interface SortableTabChipProps {
  id: ActiveGroupId;
  label: string;
  count?: number;
  active: boolean;
  showMenu?: boolean;
  onSelect: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  renameLabel?: string;
  deleteLabel?: string;
  menuLabel?: string;
}

function SortableTabChip({
  id,
  label,
  count,
  active,
  showMenu = false,
  onSelect,
  onRename,
  onDelete,
  renameLabel,
  deleteLabel,
  menuLabel,
}: SortableTabChipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      title={label}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "inline-flex h-8 cursor-pointer items-center gap-0.5 rounded-full border pl-2 pr-1 text-xs font-medium transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        active
          ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-border bg-background text-muted-foreground hover:border-border-hover hover:text-foreground",
        isDragging && "z-20 cursor-grabbing opacity-90 shadow-md",
      )}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
    >
      <span className="inline-flex min-w-0 items-center gap-1">
        <GripVertical className="h-3 w-3 shrink-0 opacity-50" />
        <span className="max-w-[10rem] truncate">{label}</span>
        {typeof count === "number" ? (
          <span
            className={cn(
              "ml-0.5 rounded-full px-1.5 text-[10px] tabular-nums",
              active
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground",
            )}
          >
            {count}
          </span>
        ) : null}
      </span>
      {showMenu && onRename && onDelete ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 rounded-full"
              aria-label={menuLabel}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[8rem]">
            <DropdownMenuItem onSelect={onRename}>
              {renameLabel}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={onDelete}
              className="text-destructive focus:text-destructive"
            >
              {deleteLabel}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="w-1" />
      )}
    </div>
  );
}

export function GroupTabs({
  groups,
  providerCounts,
  tabOrder,
  activeGroupId,
  selectionMode,
  onSelectGroup,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
  onReorderGroups,
  onToggleSelectionMode,
  onCreateProvider,
  extraAction,
}: GroupTabsProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<EditingState>(null);
  const [nameInput, setNameInput] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ProviderGroup | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const groupScrollRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const groupById = useMemo(() => {
    const map = new Map(groups.map((group) => [group.id, group]));
    return map;
  }, [groups]);

  const tabs = useMemo<TabItem[]>(() => {
    const items: TabItem[] = [];
    for (const id of tabOrder) {
      if (id === ALL_GROUP_ID || id === UNGROUPED_GROUP_ID) {
        items.push({ kind: "special", id });
        continue;
      }
      const group = groupById.get(id);
      if (group) items.push({ kind: "custom", group });
    }
    return items;
  }, [groupById, tabOrder]);

  useEffect(() => {
    if (editing) {
      setNameInput(editing.mode === "rename" ? editing.initialName : "");
      // Focus after dialog mounts.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [editing]);

  useEffect(() => {
    const element = groupScrollRef.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      // While the pointer is over the group strip, the wheel belongs to this
      // horizontal scroller even at either boundary. This prevents the page
      // from suddenly continuing vertically after the remaining groups appear.
      consumeGroupTabsWheel(element, event);
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, []);

  const dialogTitle = useMemo(() => {
    if (editing?.mode === "rename") return t("group.renameDialogTitle");
    return t("group.newDialogTitle");
  }, [editing, t]);

  const handleSubmit = () => {
    const value = nameInput.trim();
    if (!value) return;
    if (editing?.mode === "rename") {
      onRenameGroup(editing.groupId, value);
    } else {
      onCreateGroup(value);
    }
    setEditing(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tabOrder.findIndex((id) => id === active.id);
    const newIndex = tabOrder.findIndex((id) => id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorderGroups(arrayMove(tabOrder, oldIndex, newIndex));
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <div
          ref={groupScrollRef}
          className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex w-max items-center gap-2 pr-1">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={tabOrder}
                strategy={horizontalListSortingStrategy}
              >
                {tabs.map((tab) => {
                  if (tab.kind === "special") {
                    const label =
                      tab.id === ALL_GROUP_ID
                        ? t("group.all")
                        : t("group.ungrouped");
                    return (
                      <SortableTabChip
                        key={tab.id}
                        id={tab.id}
                        label={label}
                        active={activeGroupId === tab.id}
                        onSelect={() => onSelectGroup(tab.id)}
                      />
                    );
                  }

                  const { group } = tab;
                  return (
                    <SortableTabChip
                      key={group.id}
                      id={group.id}
                      label={group.name}
                      count={providerCounts.get(group.id) ?? 0}
                      active={activeGroupId === group.id}
                      showMenu
                      onSelect={() => onSelectGroup(group.id)}
                      onRename={() =>
                        setEditing({
                          mode: "rename",
                          groupId: group.id,
                          initialName: group.name,
                        })
                      }
                      onDelete={() => setPendingDelete(group)}
                      renameLabel={t("group.rename")}
                      deleteLabel={t("group.delete")}
                      menuLabel={t("group.groupMenu")}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>

            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1 rounded-full px-3 text-xs"
              onClick={() => setEditing({ mode: "create" })}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("group.new")}
            </Button>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 border-l border-border/70 pl-2">
          {extraAction}
          <Button
            variant={selectionMode ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 gap-1 rounded-lg px-2.5 text-xs",
              selectionMode &&
                "bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700",
            )}
            onClick={onToggleSelectionMode}
          >
            {selectionMode ? (
              <CheckSquare className="h-3.5 w-3.5" />
            ) : (
              <Square className="h-3.5 w-3.5" />
            )}
            {selectionMode ? t("group.exitBulk") : t("group.bulkSelect")}
          </Button>

          {onCreateProvider ? (
            <Button
              type="button"
              size="icon"
              onClick={onCreateProvider}
              className="h-8 w-8 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700"
              title={t("header.addProvider")}
              aria-label={t("header.addProvider")}
            >
              <Plus className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-w-sm" zIndex="alert">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            <Input
              ref={inputRef}
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder={t("group.namePlaceholder")}
              maxLength={40}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={!nameInput.trim()}>
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title={t("group.deleteConfirmTitle")}
        message={t("group.deleteConfirmMessage", {
          name: pendingDelete?.name ?? "",
        })}
        variant="destructive"
        onConfirm={() => {
          if (pendingDelete) onDeleteGroup(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
