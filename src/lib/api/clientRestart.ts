import { invoke } from "@tauri-apps/api/core";
import type { AppId } from "./types";

export interface ClientRestartResult {
  app: string;
  killed: boolean;
  killAttempts: number;
  launched: boolean;
  supported: boolean;
  message: string;
}

export const clientRestartApi = {
  async restart(app: AppId): Promise<ClientRestartResult> {
    return invoke<ClientRestartResult>("restart_client_app", { app });
  },
};

/** Apps whose desktop client needs process restart after provider switch. */
export function appSupportsClientRestart(app: AppId): boolean {
  return app === "codex" || app === "claude-desktop" || app === "grokbuild";
}
