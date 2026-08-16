import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { formatCodexModelDisplayName } from "@/utils/codexModelDisplay";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FetchedModel } from "@/lib/api/model-fetch";

interface ModelOptionsProps {
  models: FetchedModel[];
  onSelect: (id: string) => void;
}

function groupModels(models: FetchedModel[]) {
  const grouped: Record<string, FetchedModel[]> = {};
  for (const model of models) {
    const vendor = model.ownedBy || "Other";
    if (!grouped[vendor]) grouped[vendor] = [];
    grouped[vendor].push(model);
  }
  return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
}

function ModelOptionLabel({ model }: { model: FetchedModel }) {
  const displayName = formatCodexModelDisplayName(model.id);
  return (
    <span className="min-w-0 truncate">
      {displayName}
      {displayName !== model.id && (
        <span className="ml-2 text-xs text-muted-foreground">{model.id}</span>
      )}
    </span>
  );
}

export function ModelOptionsList({ models, onSelect }: ModelOptionsProps) {
  const { t } = useTranslation();
  if (models.length === 0) return null;

  return (
    <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-border-default bg-muted/20 p-1">
      <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
        {t("providerForm.availableModels", { defaultValue: "可选模型" })}
      </div>
      {groupModels(models).map(([vendor, vendorModels]) => (
        <div key={vendor}>
          <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground/80">
            {vendor}
          </div>
          <div className="space-y-0.5">
            {vendorModels.map((model) => (
              <button
                key={model.id}
                type="button"
                className="flex w-full items-center rounded px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                title={model.id}
                onClick={() => onSelect(model.id)}
              >
                <ModelOptionLabel model={model} />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ModelDropdown({
  models,
  onSelect,
  inline = false,
}: ModelOptionsProps & { inline?: boolean }) {
  if (inline) {
    return <ModelOptionsList models={models} onSelect={onSelect} />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0">
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="z-[200] max-h-64 overflow-y-auto"
      >
        {groupModels(models).map(([vendor, vendorModels], vendorIndex) => (
          <div key={vendor}>
            {vendorIndex > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{vendor}</DropdownMenuLabel>
            {vendorModels.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onSelect={() => onSelect(model.id)}
                className="max-w-full"
                title={model.id}
              >
                <ModelOptionLabel model={model} />
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
