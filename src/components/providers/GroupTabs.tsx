import { useEffect, useMemo, useRef, useState } from "react";
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
import { GripVertical, MoreVertical, Plus, CheckSquare, Square } from "lucide-react";
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
import {
  ALL_GROUP_ID,
  UNGROUPED_GROUP_ID,
  type ActiveGroupId,
  type ProviderGroup,
} from "@/hooks/useProviderGroups";

interface GroupTabsProps {
  groups: ProviderGroup[];
  activeGroupId: ActiveGroupId;
  selectionMode: boolean;
  onSelectGroup: (id: ActiveGroupId) => void;
  onCreateGroup: (name: string) => string | null;
  onRenameGroup: (id: string, name: string) => void;
  onDeleteGroup: (id: string) => void;
  onReorderGroups: (orderedIds: string[]) => void;
  onToggleSelectionMode: () => void;
}

type EditingState =
  | { mode: "create" }
  | { mode: "rename"; groupId: string; initialName: string }
  | null;

interface SortableGroupChipProps {
  group: ProviderGroup;
  active: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
  renameLabel: string;
  deleteLabel: string;
  menuLabel: string;
}

function SortableGroupChip({
  group,
  active,
  onSelect,
  onRename,
  onDelete,
  renameLabel,
  deleteLabel,
  menuLabel,
}: SortableGroupChipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      title={group.name}
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
          ? "border-primary bg-primary/10 text-primary"
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
        <span className="max-w-[10rem] truncate">{group.name}</span>
        <span
          className={cn(
            "ml-0.5 rounded-full px-1.5 text-[10px] tabular-nums",
            active
              ? "bg-primary/20 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {group.providerIds.length}
        </span>
      </span>
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
          <DropdownMenuItem onSelect={onRename}>{renameLabel}</DropdownMenuItem>
          <DropdownMenuItem
            onSelect={onDelete}
            className="text-destructive focus:text-destructive"
          >
            {deleteLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function GroupTabs({
  groups,
  activeGroupId,
  selectionMode,
  onSelectGroup,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
  onReorderGroups,
  onToggleSelectionMode,
}: GroupTabsProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<EditingState>(null);
  const [nameInput, setNameInput] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ProviderGroup | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  useEffect(() => {
    if (editing) {
      if (editing.mode === "rename") {
        setNameInput(editing.initialName);
      } else {
        setNameInput("");
      }
      const frame = requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [editing]);

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

  const chipClass = (active: boolean) =>
    cn(
      "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors",
      active
        ? "border-primary bg-primary/10 text-primary"
        : "border-border bg-background text-muted-foreground hover:border-border-hover hover:text-foreground",
    );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = groups.findIndex((g) => g.id === active.id);
    const newIndex = groups.findIndex((g) => g.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(groups, oldIndex, newIndex).map((g) => g.id);
    onReorderGroups(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={chipClass(activeGroupId === ALL_GROUP_ID)}
        onClick={() => onSelectGroup(ALL_GROUP_ID)}
      >
        {t("group.all")}
      </button>
      <button
        type="button"
        className={chipClass(activeGroupId === UNGROUPED_GROUP_ID)}
        onClick={() => onSelectGroup(UNGROUPED_GROUP_ID)}
      >
        {t("group.ungrouped")}
      </button>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={groups.map((g) => g.id)}
          strategy={horizontalListSortingStrategy}
        >
          {groups.map((group) => (
            <SortableGroupChip
              key={group.id}
              group={group}
              active={activeGroupId === group.id}
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
          ))}
        </SortableContext>
      </DndContext>

      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1 rounded-full px-3 text-xs"
        onClick={() => setEditing({ mode: "create" })}
      >
        <Plus className="h-3.5 w-3.5" />
        {t("group.new")}
      </Button>

      <Button
        variant={selectionMode ? "default" : "outline"}
        size="sm"
        className="h-8 gap-1 rounded-full px-3 text-xs"
        onClick={onToggleSelectionMode}
      >
        {selectionMode ? (
          <CheckSquare className="h-3.5 w-3.5" />
        ) : (
          <Square className="h-3.5 w-3.5" />
        )}
        {selectionMode ? t("group.exitBulk") : t("group.bulkSelect")}
      </Button>

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
    </div>
  );
}
