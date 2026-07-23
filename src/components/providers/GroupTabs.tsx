import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MoreVertical, Plus, CheckSquare, Square } from "lucide-react";
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
  onToggleSelectionMode: () => void;
}

type EditingState =
  | { mode: "create" }
  | { mode: "rename"; groupId: string; initialName: string }
  | null;

export function GroupTabs({
  groups,
  activeGroupId,
  selectionMode,
  onSelectGroup,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
  onToggleSelectionMode,
}: GroupTabsProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<EditingState>(null);
  const [nameInput, setNameInput] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ProviderGroup | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

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

      {groups.map((group) => {
        const active = activeGroupId === group.id;
        return (
          <div
            key={group.id}
            className={cn(
              "inline-flex h-8 items-center gap-0.5 rounded-full border pl-3 pr-1 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-border-hover hover:text-foreground",
            )}
          >
            <button
              type="button"
              className="max-w-[10rem] truncate outline-none"
              onClick={() => onSelectGroup(group.id)}
              title={group.name}
            >
              {group.name}
            </button>
            <span
              className={cn(
                "ml-1 rounded-full px-1.5 text-[10px] tabular-nums",
                active
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {group.providerIds.length}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full"
                  aria-label={t("group.groupMenu")}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[8rem]">
                <DropdownMenuItem
                  onSelect={() =>
                    setEditing({
                      mode: "rename",
                      groupId: group.id,
                      initialName: group.name,
                    })
                  }
                >
                  {t("group.rename")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setPendingDelete(group)}
                  className="text-destructive focus:text-destructive"
                >
                  {t("group.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}

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