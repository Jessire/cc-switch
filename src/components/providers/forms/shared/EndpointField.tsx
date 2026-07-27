import { useTranslation } from "react-i18next";
import { FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Link2, Zap } from "lucide-react";

interface EndpointFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hint?: string;
  fullUrlHint?: string;
  showManageButton?: boolean;
  onManageClick?: () => void;
  manageButtonLabel?: string;
  showFullUrlToggle?: boolean;
  isFullUrl?: boolean;
  onFullUrlChange?: (value: boolean) => void;
}

export function EndpointField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  fullUrlHint,
  showManageButton = true,
  onManageClick,
  manageButtonLabel,
  showFullUrlToggle = false,
  isFullUrl = false,
  onFullUrlChange,
}: EndpointFieldProps) {
  const { t } = useTranslation();

  const defaultManageLabel = t("providerForm.manageAndTest", {
    defaultValue: "管理和测速",
  });
  const effectiveHint =
    showFullUrlToggle && isFullUrl
      ? fullUrlHint ||
        t("providerForm.fullUrlHint", {
          defaultValue:
            "💡 请填写完整请求 URL，并且必须开启代理后使用；代理将直接使用此 URL，不拼接路径",
        })
      : hint;

  return (
    <div className="space-y-2">
      <div className="flex min-h-5 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <FormLabel htmlFor={id} className="leading-5">
            {label}
          </FormLabel>
          {showFullUrlToggle && onFullUrlChange ? (
            <div className="flex h-5 items-center gap-1.5 rounded-md bg-muted/50 px-1.5">
              <Link2
                className={`h-3 w-3 ${
                  isFullUrl ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[11px] font-medium leading-none ${
                  isFullUrl ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {t("providerForm.fullUrlLabel", {
                  defaultValue: "完整 URL",
                })}
              </span>
              <Switch
                checked={isFullUrl}
                onCheckedChange={onFullUrlChange}
                aria-label={t("providerForm.fullUrlLabel", {
                  defaultValue: "完整 URL",
                })}
                size="sm"
              />
            </div>
          ) : null}
        </div>
        {showManageButton && onManageClick ? (
          <button
            type="button"
            onClick={onManageClick}
            className="flex h-5 shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Zap className="h-3.5 w-3.5" />
            {manageButtonLabel || defaultManageLabel}
          </button>
        ) : null}
      </div>
      <Input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {effectiveHint ? (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {effectiveHint}
          </p>
        </div>
      ) : null}
    </div>
  );
}
