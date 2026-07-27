//! Session 级模型路由
//!
//! 支持两种方式为单个会话/请求指定 provider 与模型:
//! - 会话内命令 `/model provider[,model]` / `/model reset`（写入内存 override 表）
//! - 模型名前缀 `provider/model`（单请求生效，无状态）

use std::collections::HashMap;
use std::sync::RwLock;

/// 单个会话的路由覆盖
#[derive(Debug, Clone)]
pub struct SessionOverride {
    pub provider_id: String,
    pub model: Option<String>,
}

/// session_id -> SessionOverride 的内存表（进程内，不持久化）
#[derive(Default)]
pub struct SessionOverrideMap {
    inner: RwLock<HashMap<String, SessionOverride>>,
}

impl SessionOverrideMap {
    pub fn set(&self, session_id: &str, ov: SessionOverride) {
        if let Ok(mut map) = self.inner.write() {
            map.insert(session_id.to_string(), ov);
        }
    }

    pub fn get(&self, session_id: &str) -> Option<SessionOverride> {
        self.inner
            .read()
            .ok()
            .and_then(|map| map.get(session_id).cloned())
    }

    pub fn clear(&self, session_id: &str) -> bool {
        self.inner
            .write()
            .ok()
            .map(|mut map| map.remove(session_id).is_some())
            .unwrap_or(false)
    }
}

/// `/model` 命令解析结果
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ModelCommand {
    Reset,
    Set {
        provider: String,
        model: Option<String>,
    },
}

/// 解析会话内 `/model` 命令
///
/// 支持格式:
/// - `/model reset` → Reset
/// - `/model provider,model` → Set { provider, model: Some }
/// - `/model provider` → Set { provider, model: None }
///
/// 非 `/model` 开头或参数为空时返回 None。
pub fn parse_model_command(text: &str) -> Option<ModelCommand> {
    let trimmed = text.trim();
    let rest = trimmed
        .strip_prefix("/model")
        .or_else(|| trimmed.strip_prefix("@model"))?;
    // 必须是 "/model" 结尾或后跟空白，避免误伤 "/modeling"
    if !rest.is_empty() && !rest.starts_with(char::is_whitespace) {
        return None;
    }
    let args = rest.trim();
    if args.is_empty() {
        return None;
    }
    if args.eq_ignore_ascii_case("reset") {
        return Some(ModelCommand::Reset);
    }
    // 支持中英文逗号分隔 provider 与 model
    let (provider, model) = match args.split_once([',', '，']) {
        Some((p, m)) => (p.trim(), Some(m.trim())),
        None => (args, None),
    };
    if provider.is_empty() {
        return None;
    }
    let model = model.filter(|m| !m.is_empty()).map(|m| m.to_string());
    Some(ModelCommand::Set {
        provider: provider.to_string(),
        model,
    })
}

/// 按第一个 `/` 拆分模型名前缀: `provider/model` → (provider, model)
pub fn parse_provider_prefix(model: &str) -> Option<(&str, &str)> {
    let (prefix, rest) = model.split_once('/')?;
    if prefix.is_empty() || rest.is_empty() {
        return None;
    }
    Some((prefix, rest))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_model_command_reset() {
        assert_eq!(parse_model_command("/model reset"), Some(ModelCommand::Reset));
        assert_eq!(
            parse_model_command("  /model RESET  "),
            Some(ModelCommand::Reset)
        );
    }

    #[test]
    fn test_parse_model_command_set_provider_and_model() {
        assert_eq!(
            parse_model_command("/model openrouter,claude-sonnet-4"),
            Some(ModelCommand::Set {
                provider: "openrouter".to_string(),
                model: Some("claude-sonnet-4".to_string()),
            })
        );
        // 中文逗号
        assert_eq!(
            parse_model_command("/model 中转A，gpt-4o"),
            Some(ModelCommand::Set {
                provider: "中转A".to_string(),
                model: Some("gpt-4o".to_string()),
            })
        );
    }

    #[test]
    fn test_parse_model_command_set_provider_only() {
        assert_eq!(
            parse_model_command("/model openrouter"),
            Some(ModelCommand::Set {
                provider: "openrouter".to_string(),
                model: None,
            })
        );
    }

    #[test]
    fn test_parse_model_command_invalid() {
        assert_eq!(parse_model_command("/model"), None);
        assert_eq!(parse_model_command("/model   "), None);
        assert_eq!(parse_model_command("/modeling xyz"), None);
        assert_eq!(parse_model_command("hello world"), None);
        assert_eq!(parse_model_command("/model ,gpt-4o"), None);
    }

    #[test]
    fn test_parse_provider_prefix() {
        assert_eq!(
            parse_provider_prefix("openrouter/gpt-4o"),
            Some(("openrouter", "gpt-4o"))
        );
        // 只按第一个 / 拆
        assert_eq!(
            parse_provider_prefix("myproxy/anthropic/claude-3"),
            Some(("myproxy", "anthropic/claude-3"))
        );
        assert_eq!(parse_provider_prefix("gpt-4o"), None);
        assert_eq!(parse_provider_prefix("/gpt-4o"), None);
        assert_eq!(parse_provider_prefix("openrouter/"), None);
    }

    #[test]
    fn test_override_map() {
        let map = SessionOverrideMap::default();
        assert!(map.get("s1").is_none());
        map.set(
            "s1",
            SessionOverride {
                provider_id: "p1".to_string(),
                model: Some("m1".to_string()),
            },
        );
        let ov = map.get("s1").unwrap();
        assert_eq!(ov.provider_id, "p1");
        assert_eq!(ov.model.as_deref(), Some("m1"));
        assert!(map.clear("s1"));
        assert!(!map.clear("s1"));
        assert!(map.get("s1").is_none());
    }
}
