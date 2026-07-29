//! Restart third-party client apps after provider switch.
//!
//! Used by the main-page "auto restart client" toggle.
//! Currently focuses on desktop clients that cache config in-process:
//! Codex (ChatGPT.exe), Claude Desktop, Grok Build.

use serde::Serialize;
#[cfg(target_os = "windows")]
use std::path::{Path, PathBuf};
#[cfg(target_os = "windows")]
use std::process::Command;
#[cfg(target_os = "windows")]
use std::thread;
#[cfg(target_os = "windows")]
use std::time::Duration;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

/// Hide console windows for taskkill / powershell / cmd child processes on Windows.
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Build a Windows Command with CREATE_NO_WINDOW so no CMD flash appears.
#[cfg(target_os = "windows")]
fn silent_cmd(program: impl AsRef<std::ffi::OsStr>) -> Command {
    let mut cmd = Command::new(program);
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientRestartResult {
    /// App id that was requested
    pub app: String,
    /// Whether any matching process was found/killed
    pub killed: bool,
    /// Number of process names we attempted to terminate
    pub kill_attempts: u32,
    /// Whether a relaunch was attempted
    pub launched: bool,
    /// Whether the app is supported for auto-restart
    pub supported: bool,
    /// Human-readable summary
    pub message: String,
}

struct ClientTarget {
    /// Display name for messages
    label: &'static str,
    /// Process image names to kill (with .exe on Windows)
    #[cfg(target_os = "windows")]
    process_names: &'static [&'static str],
    /// Prefer killing these first (main UI process)
    #[cfg(target_os = "windows")]
    preferred_launch_names: &'static [&'static str],
    /// Known MSIX package name prefixes for shell:AppsFolder relaunch
    #[cfg(target_os = "windows")]
    msix_name_prefixes: &'static [&'static str],
    /// Common install path fallbacks (relative to known folders)
    #[cfg(target_os = "windows")]
    fallback_exes: &'static [&'static str],
}

fn target_for_app(app: &str) -> Option<ClientTarget> {
    match app {
        "codex" => Some(ClientTarget {
            label: "Codex",
            // ChatGPT.exe is the MSIX UI host; codex.exe is the app-server child.
            #[cfg(target_os = "windows")]
            process_names: &["ChatGPT.exe", "codex.exe", "Codex.exe"],
            #[cfg(target_os = "windows")]
            preferred_launch_names: &["ChatGPT.exe"],
            #[cfg(target_os = "windows")]
            msix_name_prefixes: &["OpenAI.Codex"],
            #[cfg(target_os = "windows")]
            fallback_exes: &[],
        }),
        "claude-desktop" => Some(ClientTarget {
            label: "Claude Desktop",
            #[cfg(target_os = "windows")]
            process_names: &["Claude.exe", "claude.exe"],
            #[cfg(target_os = "windows")]
            preferred_launch_names: &["Claude.exe", "claude.exe"],
            #[cfg(target_os = "windows")]
            msix_name_prefixes: &[],
            #[cfg(target_os = "windows")]
            fallback_exes: &[
                r"%LOCALAPPDATA%\AnthropicClaude\claude.exe",
                r"%LOCALAPPDATA%\Programs\Claude\Claude.exe",
                r"%LOCALAPPDATA%\Programs\claude-desktop\Claude.exe",
                r"%LOCALAPPDATA%\Claude\Claude.exe",
            ],
        }),
        "grokbuild" => Some(ClientTarget {
            label: "Grok Build",
            #[cfg(target_os = "windows")]
            process_names: &["Grok.exe", "grok.exe", "Grok Build.exe", "xAI Grok.exe"],
            #[cfg(target_os = "windows")]
            preferred_launch_names: &["Grok.exe", "grok.exe"],
            #[cfg(target_os = "windows")]
            msix_name_prefixes: &["xAI", "Grok"],
            #[cfg(target_os = "windows")]
            fallback_exes: &[
                r"%LOCALAPPDATA%\Programs\Grok\Grok.exe",
                r"%LOCALAPPDATA%\Grok\Grok.exe",
                r"%LOCALAPPDATA%xAI\Grok\Grok.exe",
            ],
        }),
        _ => None,
    }
}

/// Restart the client application associated with a CC Switch app tab.
#[tauri::command]
pub async fn restart_client_app(app: String) -> Result<ClientRestartResult, String> {
    let app_id = app.clone();
    tauri::async_runtime::spawn_blocking(move || restart_client_app_sync(&app_id))
        .await
        .map_err(|e| format!("restart task join error: {e}"))?
}

fn restart_client_app_sync(app: &str) -> Result<ClientRestartResult, String> {
    let Some(target) = target_for_app(app) else {
        return Ok(ClientRestartResult {
            app: app.to_string(),
            killed: false,
            kill_attempts: 0,
            launched: false,
            supported: false,
            message: format!("应用 {app} 无需自动重启客户端"),
        });
    };

    #[cfg(not(target_os = "windows"))]
    {
        Ok(ClientRestartResult {
            app: app.to_string(),
            killed: false,
            kill_attempts: 0,
            launched: false,
            supported: true,
            message: format!("{} 自动重启目前仅支持 Windows", target.label),
        })
    }

    #[cfg(target_os = "windows")]
    {
        restart_windows(app, &target)
    }
}

#[cfg(target_os = "windows")]
fn restart_windows(app: &str, target: &ClientTarget) -> Result<ClientRestartResult, String> {
    let running = list_matching_processes(target.process_names);
    if running.is_empty() {
        return Ok(ClientRestartResult {
            app: app.to_string(),
            killed: false,
            kill_attempts: 0,
            launched: false,
            supported: true,
            message: format!("未检测到运行中的 {}", target.label),
        });
    }

    // Prefer a launch path from the main UI process if present.
    let launch_path = pick_launch_path(&running, target);
    let msix_launch = running
        .iter()
        .find_map(|p| msix_apps_folder_id_from_path(&p.exe_path));

    let mut kill_attempts = 0u32;
    for name in target.process_names {
        // /T kills child tree as well.
        let output = silent_cmd("taskkill")
            .args(["/F", "/IM", name, "/T"])
            .output();
        kill_attempts += 1;
        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout);
                let stderr = String::from_utf8_lossy(&out.stderr);
                log::info!(
                    "[client-restart] taskkill {name}: status={:?} stdout={} stderr={}",
                    out.status.code(),
                    stdout.trim(),
                    stderr.trim()
                );
            }
            Err(e) => {
                log::warn!("[client-restart] taskkill {name} failed: {e}");
            }
        }
    }

    // Give the OS a moment to release file locks / exit cleanly.
    thread::sleep(Duration::from_millis(900));

    let mut launched = false;
    // 1) MSIX AppsFolder (most reliable for Store/MSIX apps like Codex)
    if let Some(ref aumid) = msix_launch {
        let arg = format!("shell:AppsFolder\\{aumid}");
        match silent_cmd("explorer.exe").arg(&arg).spawn() {
            Ok(_) => {
                launched = true;
                log::info!("[client-restart] launched {arg}");
            }
            Err(e) => {
                log::warn!("[client-restart] explorer launch failed: {e}");
            }
        }
    }

    // 2) Direct exe path captured before kill
    if !launched {
        if let Some(path) = launch_path {
            match silent_cmd(&path).spawn() {
                Ok(_) => {
                    launched = true;
                    log::info!("[client-restart] launched {}", path.display());
                }
                Err(e) => {
                    log::warn!(
                        "[client-restart] direct launch failed for {}: {e}",
                        path.display()
                    );
                }
            }
        }
    }

    // 3) Known install path fallbacks
    if !launched {
        for pattern in target.fallback_exes {
            let expanded = expand_env_path(pattern);
            if expanded.is_file() {
                match silent_cmd(&expanded).spawn() {
                    Ok(_) => {
                        launched = true;
                        log::info!("[client-restart] launched {}", expanded.display());
                        break;
                    }
                    Err(e) => {
                        log::warn!(
                            "[client-restart] fallback launch failed for {}: {e}",
                            expanded.display()
                        );
                    }
                }
            }
        }
    }

    // 4) Package-prefix scan for MSIX if we didn't already
    if !launched {
        for prefix in target.msix_name_prefixes {
            if let Some(aumid) = find_msix_aumid_by_prefix(prefix) {
                let arg = format!("shell:AppsFolder\\{aumid}");
                if silent_cmd("explorer.exe").arg(&arg).spawn().is_ok() {
                    launched = true;
                    log::info!("[client-restart] launched {arg} (prefix scan)");
                    break;
                }
            }
        }
    }

    let message = if launched {
        format!("已自动重启 {}", target.label)
    } else {
        format!("已结束 {} 进程，但未能自动启动，请手动打开", target.label)
    };

    Ok(ClientRestartResult {
        app: app.to_string(),
        killed: true,
        kill_attempts,
        launched,
        supported: true,
        message,
    })
}

#[cfg(target_os = "windows")]
#[derive(Debug, Clone)]
struct ProcInfo {
    name: String,
    exe_path: PathBuf,
}

#[cfg(target_os = "windows")]
fn list_matching_processes(names: &[&str]) -> Vec<ProcInfo> {
    // Use PowerShell for reliable executable paths (tasklist alone is weaker).
    let name_list = names
        .iter()
        .map(|n| format!("'{}'", n.replace('\'', "''")))
        .collect::<Vec<_>>()
        .join(",");
    let script = format!(
        "$names=@({name_list}); \
         Get-CimInstance Win32_Process | \
         Where-Object {{ $names -contains $_.Name }} | \
         ForEach-Object {{ '{{0}}|{{1}}' -f $_.Name, $_.ExecutablePath }}"
    );

    let output = silent_cmd("powershell.exe")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle",
            "Hidden",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            &script,
        ])
        .output();

    let Ok(out) = output else {
        return Vec::new();
    };
    if !out.status.success() {
        log::warn!(
            "[client-restart] process list failed: {}",
            String::from_utf8_lossy(&out.stderr)
        );
        return Vec::new();
    }

    String::from_utf8_lossy(&out.stdout)
        .lines()
        .filter_map(|line| {
            let line = line.trim();
            if line.is_empty() {
                return None;
            }
            let mut parts = line.splitn(2, '|');
            let name = parts.next()?.trim().to_string();
            let path = parts.next().unwrap_or("").trim();
            if path.is_empty() {
                return Some(ProcInfo {
                    name,
                    exe_path: PathBuf::new(),
                });
            }
            Some(ProcInfo {
                name,
                exe_path: PathBuf::from(path),
            })
        })
        .collect()
}

#[cfg(target_os = "windows")]
fn pick_launch_path(running: &[ProcInfo], target: &ClientTarget) -> Option<PathBuf> {
    for preferred in target.preferred_launch_names {
        if let Some(p) = running
            .iter()
            .find(|r| r.name.eq_ignore_ascii_case(preferred))
        {
            if !p.exe_path.as_os_str().is_empty() && p.exe_path.is_file() {
                return Some(p.exe_path.clone());
            }
        }
    }
    running
        .iter()
        .find(|r| !r.exe_path.as_os_str().is_empty() && r.exe_path.is_file())
        .map(|r| r.exe_path.clone())
}

/// Convert a WindowsApps path into `PackageFamilyName!App` for shell:AppsFolder.
#[cfg(target_os = "windows")]
fn msix_apps_folder_id_from_path(path: &Path) -> Option<String> {
    let path_str = path.to_string_lossy();
    // ...\WindowsApps\OpenAI.Codex_26.721.4979.0_x64__2p2nqsd0c76g0\app\ChatGPT.exe
    let marker = "WindowsApps\\";
    let idx = path_str.find(marker)?;
    let rest = &path_str[idx + marker.len()..];
    let package_full = rest.split('\\').next()?.trim();
    if package_full.is_empty() {
        return None;
    }
    let family = package_full_name_to_family(package_full)?;
    Some(format!("{family}!App"))
}

/// `Name_Version_Arch_Resource_Publisher` -> `Name_Publisher`
#[cfg(target_os = "windows")]
fn package_full_name_to_family(full: &str) -> Option<String> {
    let parts: Vec<&str> = full.split('_').collect();
    // Minimum: Name, Version, Arch, Resource, Publisher => 5 parts
    // But Name itself may not contain '_'. Publisher is last.
    if parts.len() < 5 {
        // Still try: first + last
        if parts.len() >= 2 {
            return Some(format!("{}_{}", parts[0], parts[parts.len() - 1]));
        }
        return None;
    }
    let name = parts[0];
    let publisher = parts[parts.len() - 1];
    Some(format!("{name}_{publisher}"))
}

#[cfg(target_os = "windows")]
fn find_msix_aumid_by_prefix(prefix: &str) -> Option<String> {
    let script = format!(
        "Get-AppxPackage | Where-Object {{ $_.Name -like '{prefix}*' }} | \
         Select-Object -First 1 -ExpandProperty PackageFamilyName"
    );
    let output = silent_cmd("powershell.exe")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle",
            "Hidden",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            &script,
        ])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let family = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if family.is_empty() {
        return None;
    }
    Some(format!("{family}!App"))
}

#[cfg(target_os = "windows")]
fn expand_env_path(pattern: &str) -> PathBuf {
    let mut result = pattern.to_string();
    for (key, value) in [
        (
            "%LOCALAPPDATA%",
            std::env::var("LOCALAPPDATA").unwrap_or_default(),
        ),
        ("%APPDATA%", std::env::var("APPDATA").unwrap_or_default()),
        (
            "%PROGRAMFILES%",
            std::env::var("ProgramFiles").unwrap_or_default(),
        ),
        (
            "%USERPROFILE%",
            std::env::var("USERPROFILE").unwrap_or_default(),
        ),
    ] {
        result = result.replace(key, &value);
    }
    PathBuf::from(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(target_os = "windows")]
    #[test]
    fn package_family_from_full_name() {
        let full = "OpenAI.Codex_26.721.4979.0_x64__2p2nqsd0c76g0";
        assert_eq!(
            package_full_name_to_family(full).as_deref(),
            Some("OpenAI.Codex_2p2nqsd0c76g0")
        );
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn msix_id_from_path() {
        let path = PathBuf::from(
            r"C:\Program Files\WindowsApps\OpenAI.Codex_26.721.4979.0_x64__2p2nqsd0c76g0\app\ChatGPT.exe",
        );
        assert_eq!(
            msix_apps_folder_id_from_path(&path).as_deref(),
            Some("OpenAI.Codex_2p2nqsd0c76g0!App")
        );
    }

    #[test]
    fn target_mapping() {
        assert!(target_for_app("codex").is_some());
        assert!(target_for_app("claude-desktop").is_some());
        assert!(target_for_app("grokbuild").is_some());
        assert!(target_for_app("claude").is_none());
        assert!(target_for_app("gemini").is_none());
    }
}
