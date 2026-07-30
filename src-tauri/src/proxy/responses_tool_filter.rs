//! Narrow request-level filtering for native Responses tool declarations.
//!
//! Some third-party Responses gateways reject the whole request as soon as an
//! unsupported tool is declared, even for plain text prompts. Codex Desktop now
//! eagerly advertises `image_generation`, so native Responses passthrough needs
//! a last-mile scrub before the body is forwarded upstream.

use serde_json::Value;
use std::collections::HashSet;

/// Remove top-level Responses tools whose `type` is explicitly unsupported for
/// the current upstream, and clear a matching forced `tool_choice` if present.
///
/// The filter is intentionally narrow: it only touches the top-level `tools`
/// array and an object-form `tool_choice` that directly points at one of the
/// removed tool types.
pub(crate) fn remove_unsupported_responses_tools(
    body: &mut Value,
    unsupported_tool_types: &[&str],
) -> bool {
    let unsupported: HashSet<&str> = unsupported_tool_types
        .iter()
        .copied()
        .map(str::trim)
        .filter(|tool_type| !tool_type.is_empty())
        .collect();
    if unsupported.is_empty() || !body.is_object() {
        return false;
    }

    let original_tools = body.get("tools").and_then(Value::as_array).cloned();
    let mut changed = false;

    if let Some(tools) = original_tools {
        let original_len = tools.len();
        let filtered: Vec<Value> = tools
            .into_iter()
            .filter(|tool| !tool_type_is_unsupported(tool, &unsupported))
            .collect();
        if filtered.len() != original_len {
            if let Some(obj) = body.as_object_mut() {
                if filtered.is_empty() {
                    obj.remove("tools");
                } else {
                    obj.insert("tools".to_string(), Value::Array(filtered));
                }
            }
            changed = true;
        }
    }

    if should_drop_forced_tool_choice(body, &unsupported) {
        if let Some(obj) = body.as_object_mut() {
            obj.remove("tool_choice");
        }
        changed = true;
    }

    changed
}

fn tool_type_is_unsupported(tool: &Value, unsupported_tool_types: &HashSet<&str>) -> bool {
    tool.get("type")
        .and_then(Value::as_str)
        .map(str::trim)
        .is_some_and(|tool_type| unsupported_tool_types.contains(tool_type))
}

fn should_drop_forced_tool_choice(body: &Value, unsupported_tool_types: &HashSet<&str>) -> bool {
    body.get("tool_choice")
        .and_then(Value::as_object)
        .and_then(|choice| choice.get("type"))
        .and_then(Value::as_str)
        .map(str::trim)
        .is_some_and(|tool_type| unsupported_tool_types.contains(tool_type))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn removes_image_generation_and_keeps_other_tools() {
        let mut body = json!({
            "tools": [
                {"type": "function", "name": "run"},
                {"type": "image_generation"},
                {"type": "web_search"}
            ]
        });

        assert!(remove_unsupported_responses_tools(
            &mut body,
            &["image_generation"]
        ));

        let types: Vec<&str> = body["tools"]
            .as_array()
            .unwrap()
            .iter()
            .map(|tool| tool["type"].as_str().unwrap())
            .collect();
        assert_eq!(types, vec!["function", "web_search"]);
    }

    #[test]
    fn removes_tools_field_when_only_unsupported_tool_exists() {
        let mut body = json!({
            "tools": [{"type": "image_generation"}]
        });

        assert!(remove_unsupported_responses_tools(
            &mut body,
            &["image_generation"]
        ));
        assert!(body.get("tools").is_none());
    }

    #[test]
    fn clears_matching_forced_tool_choice() {
        let mut body = json!({
            "tools": [
                {"type": "function", "name": "run"},
                {"type": "image_generation"}
            ],
            "tool_choice": {"type": "image_generation"}
        });

        assert!(remove_unsupported_responses_tools(
            &mut body,
            &["image_generation"]
        ));
        assert!(body.get("tool_choice").is_none());
        assert_eq!(body["tools"].as_array().unwrap().len(), 1);
    }

    #[test]
    fn keeps_non_matching_tool_choice_and_string_modes() {
        let mut forced_function = json!({
            "tools": [
                {"type": "function", "name": "run"},
                {"type": "image_generation"}
            ],
            "tool_choice": {"type": "function", "name": "run"}
        });

        assert!(remove_unsupported_responses_tools(
            &mut forced_function,
            &["image_generation"]
        ));
        assert_eq!(
            forced_function.get("tool_choice").unwrap(),
            &json!({"type": "function", "name": "run"})
        );

        let mut auto_choice = json!({
            "tools": [{"type": "image_generation"}],
            "tool_choice": "auto"
        });

        assert!(remove_unsupported_responses_tools(
            &mut auto_choice,
            &["image_generation"]
        ));
        assert_eq!(auto_choice.get("tool_choice").unwrap(), &json!("auto"));
    }

    #[test]
    fn noops_when_nothing_matches() {
        let mut body = json!({
            "tools": [{"type": "function", "name": "run"}],
            "tool_choice": {"type": "function", "name": "run"}
        });

        assert!(!remove_unsupported_responses_tools(
            &mut body,
            &["image_generation"]
        ));
    }
}
