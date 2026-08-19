import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Search } from "lucide-react";
import { formatCodexModelDisplayName } from "@/utils/codexModelDisplay";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [searchTerm, setSearchTerm] = useState("");
  const filteredModels = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return models;
    return models.filter((model) => {
      const displayName = formatCodexModelDisplayName(model.id).toLowerCase();
      return (
        model.id.toLowerCase().includes(query) || displayName.includes(query)
      );
    });
  }, [models, searchTerm]);

  if (models.length === 0) return null;

  return (
    <div className="mt-3 space-y-2 border-t border-border-default pt-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-foreground">
          {t("codexConfig.availableModels", { defaultValue: "可选模型" })}
        </span>
        <div className="relative w-full max-w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t("codexConfig.searchModels", {
              defaultValue: "搜索模型",
            })}
            className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
          />
        </div>
      </div>
      {filteredModels.length > 0 ? (
        <div className="grid max-h-52 gap-2 overflow-y-auto pr-1 md:grid-cols-3">
          {filteredModels.map((model) => (
            <button
              key={model.id}
              type="button"
              className="flex min-h-14 min-w-0 items-center gap-2 rounded-md border border-border-default px-3 py-2 text-left hover:bg-muted/40"
              title={model.id}
              onClick={() => onSelect(model.id)}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {formatCodexModelDisplayName(model.id)}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {model.id}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="py-3 text-center text-xs text-muted-foreground">
          {t("codexConfig.noAvailableModels", {
            defaultValue: "没有匹配的模型",
          })}
        </p>
      )}
    </div>
  );
}

export function ModelDropdown({
  models,
  onSelect,
  inline = false,
}: ModelOptionsProps & { inline?: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const grouped = groupModels(models);

  if (inline) {
    return <ModelOptionsList models={models} onSelect={onSelect} />;
  }

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          aria-label={t("providerForm.searchModelAriaLabel", {
            defaultValue: "Select model",
          })}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={4}
        collisionPadding={8}
        className="z-[200] w-72 p-0"
      >
        <Command
          label={t("providerForm.searchModelPlaceholder", {
            defaultValue: "Search models...",
          })}
        >
          <CommandInput
            placeholder={t("providerForm.searchModelPlaceholder", {
              defaultValue: "Search models...",
            })}
          />
          <CommandList className="max-h-64">
            <CommandEmpty>
              {t("providerForm.searchModelEmpty", {
                defaultValue: "No matching models.",
              })}
            </CommandEmpty>
            {grouped.map(([vendor, vendorModels]) => (
              <CommandGroup key={vendor} heading={vendor}>
                {vendorModels.map((m) => (
                  <CommandItem
                    key={m.id}
                    value={m.id}
                    aria-label={m.id}
                    // Expose the vendor name as a keyword so models can also be
                    // fuzzy-matched by vendor, not just by model id.
                    keywords={[m.ownedBy || "Other"]}
                    onSelect={() => {
                      onSelect(m.id);
                      setOpen(false);
                    }}
                  >
                    <ModelOptionLabel model={m} />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
