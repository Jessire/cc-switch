/**
 * 切换供应商后自动重启对应客户端
 *
 * 放置在主界面头部，与代理接管 / 故障转移开关并列。
 * 状态存 localStorage，按设备记忆。
 */

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, FolderX, Loader2, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { AppId } from "@/lib/api";
import {
  appSupportsClientRestart,
  clientRestartApi,
} from "@/lib/api/clientRestart";

const STORAGE_KEY = "cc-switch-auto-restart-client-v1";
const GROUP_SKIP_STORAGE_KEY = "cc-switch-skip-restart-in-group-v1";

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeEnabled(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore quota / private mode
  }
}

/** Read current toggle without React (for switchProvider). */
export function isAutoRestartClientEnabled(): boolean {
  return readEnabled();
}

function readGroupSkipEnabled(): boolean {
  try {
    return localStorage.getItem(GROUP_SKIP_STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

function writeGroupSkipEnabled(value: boolean) {
  try {
    localStorage.setItem(GROUP_SKIP_STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore quota / private mode
  }
}

export function isGroupRestartSuppressed(): boolean {
  return readGroupSkipEnabled();
}

interface AutoRestartToggleProps {
  className?: string;
  activeApp: AppId;
}

function appLabel(app: AppId): string {
  switch (app) {
    case "codex":
      return "Codex";
    case "claude-desktop":
      return "Claude Desktop";
    case "grokbuild":
      return "Grok Build";
    case "claude":
      return "Claude Code";
    case "gemini":
      return "Gemini";
    case "opencode":
      return "OpenCode";
    case "openclaw":
      return "OpenClaw";
    case "hermes":
      return "Hermes";
    default:
      return app;
  }
}

export function AutoRestartToggle({
  className,
  activeApp,
}: AutoRestartToggleProps) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [groupSkipEnabled, setGroupSkipEnabled] = useState(true);
  const supported = appSupportsClientRestart(activeApp);
  const label = appLabel(activeApp);

  useEffect(() => {
    setEnabled(readEnabled());
    setGroupSkipEnabled(readGroupSkipEnabled());
  }, []);

  const handleToggle = useCallback((checked: boolean) => {
    setPending(true);
    setEnabled(checked);
    writeEnabled(checked);
    // tiny delay so switch animation feels intentional
    window.setTimeout(() => setPending(false), 120);
  }, []);

  const handleGroupToggle = useCallback((checked: boolean) => {
    setGroupSkipEnabled(checked);
    writeGroupSkipEnabled(checked);
  }, []);

  const handleManualRestart = useCallback(async () => {
    if (!supported || restarting) return;
    setRestarting(true);
    try {
      const result = await clientRestartApi.restart(activeApp);
      if (!result.supported) {
        toast.error(result.message);
      } else if (result.launched) {
        toast.success(result.message);
      } else if (result.killed) {
        toast.error(result.message);
      } else {
        toast.info(result.message);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      toast.error(
        t("autoRestart.manual.failed", {
          detail,
          defaultValue: "手动重启失败: {{detail}}",
        }),
      );
    } finally {
      setRestarting(false);
    }
  }, [activeApp, restarting, supported, t]);

  const tooltipText = !supported
    ? t("autoRestart.tooltip.unsupported", {
        app: label,
        defaultValue: `${label} 为 CLI / 配置即时生效，无需自动重启客户端`,
      })
    : !enabled
      ? t("autoRestart.mode.disabled", {
          defaultValue: "自动重启已关闭",
        })
      : groupSkipEnabled
        ? t("autoRestart.mode.crossGroup", {
            defaultValue: "跨分组切换时自动重启",
          })
        : t("autoRestart.mode.always", {
            defaultValue: "每次切换供应商都自动重启",
          });

  const groupTooltipText = !supported
    ? t("autoRestart.groupSkip.unsupported", {
        app: label,
        defaultValue: `${label} 无需自动重启客户端`,
      })
    : groupSkipEnabled
      ? t("autoRestart.groupSkip.enabled", {
          defaultValue: "已开启：在自建分组内切换中转时不自动重启客户端",
        })
      : t("autoRestart.groupSkip.disabled", {
          defaultValue: "已关闭：在自建分组内切换中转时仍自动重启客户端",
        });

  return (
    <div className={cn("flex items-center", className)}>
      <div
        className="flex h-8 items-center gap-1 rounded-lg bg-muted/60 px-1.5 transition-colors"
        title={tooltipText}
      >
        <button
          type="button"
          onClick={handleManualRestart}
          disabled={!supported || restarting}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md hover:bg-background/80 disabled:cursor-not-allowed disabled:opacity-45"
          title={t("autoRestart.manual.tooltip", {
            app: label,
            defaultValue: `立即重启 ${label}`,
          })}
          aria-label={t("autoRestart.manual.aria", {
            app: label,
            defaultValue: `立即重启 ${label}`,
          })}
        >
          {restarting ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <RefreshCw
              className={cn(
                "h-4 w-4 transition-colors",
                enabled && supported
                  ? "text-emerald-500"
                  : "text-muted-foreground",
              )}
            />
          )}
        </button>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={pending || !supported}
          aria-label={t("autoRestart.aria", {
            defaultValue: "切换供应商后自动重启客户端",
          })}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="grid h-6 w-5 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!supported}
              title={groupTooltipText}
              aria-label={t("autoRestart.options.aria", {
                defaultValue: "自动重启选项",
              })}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuCheckboxItem
              checked={groupSkipEnabled}
              onCheckedChange={handleGroupToggle}
              disabled={!enabled || !supported}
              className="pl-8 pr-2"
            >
              <FolderX className="h-4 w-4 text-muted-foreground" />
              {t("autoRestart.groupSkip.menu", {
                defaultValue: "同分组切换时不重启",
              })}
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
