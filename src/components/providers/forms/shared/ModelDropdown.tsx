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

export function ModelDropdown({
  models,
  onSelect,
}: {
  models: FetchedModel[];
  onSelect: (id: string) => void;
}) {
  const grouped: Record<string, FetchedModel[]> = {};
  for (const model of models) {
    const vendor = model.ownedBy || "Other";
    if (!grouped[vendor]) grouped[vendor] = [];
    grouped[vendor].push(model);
  }
  const vendors = Object.keys(grouped).sort();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0">
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-64 overflow-y-auto z-[200]"
      >
        {vendors.map((vendor, vi) => (
          <div key={vendor}>
            {vi > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{vendor}</DropdownMenuLabel>
            {grouped[vendor].map((m) => {
              const displayName = formatCodexModelDisplayName(m.id);
              return (
                <DropdownMenuItem
                  key={m.id}
                  onSelect={() => onSelect(m.id)}
                  className="max-w-full"
                  title={m.id}
                >
                  <span className="min-w-0 truncate">
                    {displayName}
                    {displayName !== m.id && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {m.id}
                      </span>
                    )}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
