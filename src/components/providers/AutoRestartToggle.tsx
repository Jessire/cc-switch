/**
 * 切换供应商后自动重启对应客户端
 *
 * 放置在主界面头部，与代理接管 / 故障转移开关并列。
 * 状态存 localStorage，按设备记忆。
 */

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { AppId } from "@/lib/api";
import { appSupportsClientRestart } from "@/lib/api/clientRestart";

const STORAGE_KEY = "cc-switch-auto-restart-client-v1";

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
  const supported = appSupportsClientRestart(activeApp);
  const label = appLabel(activeApp);

  useEffect(() => {
    setEnabled(readEnabled());
  }, []);

  const handleToggle = useCallback((checked: boolean) => {
    setPending(true);
    setEnabled(checked);
    writeEnabled(checked);
    // tiny delay so switch animation feels intentional
    window.setTimeout(() => setPending(false), 120);
  }, []);

  const tooltipText = !supported
    ? t("autoRestart.tooltip.unsupported", {
        app: label,
        defaultValue: `${label} 为 CLI / 配置即时生效，无需自动重启客户端`,
      })
    : enabled
      ? t("autoRestart.tooltip.enabled", {
          app: label,
          defaultValue: `已开启：切换 ${label} 供应商后自动重启客户端`,
        })
      : t("autoRestart.tooltip.disabled", {
          app: label,
          defaultValue: `开启后，切换 ${label} 供应商时自动重启对应客户端`,
        });

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-1.5 h-8 rounded-lg bg-muted/50 transition-all",
        className,
      )}
      title={tooltipText}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <RefreshCw
          className={cn(
            "h-4 w-4 transition-colors",
            enabled && supported
              ? "text-emerald-500 animate-pulse"
              : "text-muted-foreground",
          )}
        />
      )}
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={pending}
        aria-label={t("autoRestart.aria", {
          defaultValue: "切换供应商后自动重启客户端",
        })}
      />
    </div>
  );
}
