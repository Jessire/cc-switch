import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderPlus, Plus } from "lucide-react";
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
import type { ProviderGroup } from "@/hooks/useProviderGroups";

interface ProviderGroupAssignButtonProps {
  groups: ProviderGroup[];
  membershipGroupIds: string[];
  onAssignTo: (groupId: string) => void;
  onRemoveFrom: (groupId: string) => void;
  onCreateAndAssign: (name: string) => void;
}

export function ProviderGroupAssignButton({
  groups,
  membershipGroupIds,
  onAssignTo,
  onRemoveFrom,
  onCreateAndAssign,
}: ProviderGroupAssignButtonProps) {
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const memberSet = useMemo(
    () => new Set(membershipGroupIds),
    [membershipGroupIds],
  );

  const handleSubmitCreate = () => {
    const value = nameInput.trim();
    if (!value) return;
    onCreateAndAssign(value);
    setCreateOpen(false);
    setNameInput("");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-1"
            title={t("group.assignTo")}
            aria-label={t("group.assignTo")}
            onClick={(event) => event.stopPropagation()}
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[11rem]">
          {groups.length === 0 ? (
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t("group.noGroups")}
            </DropdownMenuLabel>
          ) : (
            groups.map((group) => {
              const inGroup = memberSet.has(group.id);
              return (
                <DropdownMenuItem
                  key={group.id}
                  onSelect={() => {
                    if (inGroup) onRemoveFrom(group.id);
                    else onAssignTo(group.id);
                  }}
                >
                  <span className="truncate">{group.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {inGroup
                      ? t("group.inGroup", { defaultValue: "已在组内" })
                      : t("group.addToGroup", { defaultValue: "加入" })}
                  </span>
                </DropdownMenuItem>
              );
            })
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setNameInput("");
              setCreateOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("group.new")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder={t("group.namePlaceholder")}
              maxLength={40}
              autoFocus
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
    </>
  );
}
