import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderPlus, MinusCircle, Plus, X } from "lucide-react";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ALL_GROUP_ID,
  UNGROUPED_GROUP_ID,
  type ActiveGroupId,
  type ProviderGroup,
} from "@/hooks/useProviderGroups";

interface BulkAssignBarProps {
  selectedCount: number;
  groups: ProviderGroup[];
  activeGroupId: ActiveGroupId;
  onAssignTo: (groupId: string) => void;
  onRemoveFromCurrent: () => void;
  onCreateGroup: (name: string) => void;
  onCancel: () => void;
}

export function BulkAssignBar({
  selectedCount,
  groups,
  activeGroupId,
  onAssignTo,
  onRemoveFromCurrent,
  onCreateGroup,
  onCancel,
}: BulkAssignBarProps) {
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (createOpen) {
      setNameInput("");
      const frame = requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [createOpen]);

  const canRemoveFromCurrent =
    activeGroupId !== ALL_GROUP_ID && activeGroupId !== UNGROUPED_GROUP_ID;

  const handleSubmitCreate = () => {
    const value = nameInput.trim();
    if (!value) return;
    onCreateGroup(value);
    setCreateOpen(false);
  };

  return (
    <div className="fixed left-1/2 bottom-4 z-40 -translate-x-1/2 w-[min(92vw,32rem)]">
      <div className="flex flex-wrap items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-2 shadow-lg shadow-black/20 backdrop-blur-md">
        <span className="text-sm font-medium text-foreground">
          {t("group.selectedCount", { count: selectedCount })}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8 gap-1 rounded-full px-3 text-xs">
                <FolderPlus className="h-3.5 w-3.5" />
                {t("group.assignTo")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[10rem]">
              {groups.length === 0 ? (
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {t("group.noGroups")}
                </DropdownMenuLabel>
              ) : (
                groups.map((group) => (
                  <DropdownMenuItem
                    key={group.id}
                    onSelect={() => onAssignTo(group.id)}
                  >
                    <span className="truncate">{group.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                      {group.providerIds.length}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                {t("group.new")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {canRemoveFromCurrent && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 rounded-full px-3 text-xs"
              onClick={onRemoveFromCurrent}
            >
              <MinusCircle className="h-3.5 w-3.5" />
              {t("group.removeFromGroup")}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={onCancel}
            aria-label={t("common.cancel")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) setCreateOpen(false);
        }}
      >
        <DialogContent className="max-w-sm" zIndex="alert">
          <DialogHeader>
            <DialogTitle>{t("group.newDialogTitle")}</DialogTitle>
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
                  handleSubmitCreate();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSubmitCreate}
              disabled={!nameInput.trim()}
            >
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
