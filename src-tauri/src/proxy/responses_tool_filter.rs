//! Narrow last-mile filtering for native Responses tool declarations.
//!
//! Some third-party Responses gateways reject the whole request as soon as an
//! unsupported tool is declared, even for plain text prompts. Codex Desktop now
//! eagerly advertises `image_generation`, so native Responses passthrough needs
//! a final scrub before the body is forwarded upstream.

use serde_json::{Map, Value};
use std::collections::HashSet;

/// A safe summary of the declarations removed from one outgoing request.
#[derive(Debug, Default, Eq, PartialEq)]
pub(crate) struct ResponsesToolFilterResult {
    pub(crate) removed_tools: usize,
    pub(crate) removed_additional_tool_carriers: usize,
    pub(crate) cleared_tool_choice: bool,
}

impl ResponsesToolFilterResult {
    pub(crate) fn changed(&self) -> bool {
        self.removed_tools > 0 || self.cleared_tool_choice
    }
}

/// Remove explicitly unsupported Responses tool declarations from the known
/// native Codex request carriers.
///
/// The filter deliberately does not recurse through arbitrary JSON. It only
/// handles documented `tools` / `tool_choice.allowed_tools.tools` plus Codex's
/// known Responses Lite `input[].additional_tools.tools` carrier. This keeps
/// function schemas, historical tool outputs, and user content intact.
pub(crate) fn remove_unsupported_responses_tools(
    body: &mut Value,
    unsupported_tool_types: &[&str],
) -> ResponsesToolFilterResult {
    let unsupported: HashSet<&str> = unsupported_tool_types
        .iter()
        .copied()
        .map(str::trim)
        .filter(|tool_type| !tool_type.is_empty())
        .collect();
    if unsupported.is_empty() || !body.is_object() {
        return ResponsesToolFilterResult::default();
    }

    let mut result = ResponsesToolFilterResult::default();
    if let Some(object) = body.as_object_mut() {
        result.removed_tools += filter_tools_field(object, &unsupported);
    }
    filter_additional_tools_carriers(body, &unsupported, &mut result);
    filter_tool_choice(body, &unsupported, &mut result);
    result
}

fn filter_additional_tools_carriers(
    body: &mut Value,
    unsupported_tool_types: &HashSet<&str>,
    result: &mut ResponsesToolFilterResult,
) {
    let Some(input) = body.get_mut("input").and_then(Value::as_array_mut) else {
        return;
    };

    let mut index = 0;
    while index < input.len() {
        let is_carrier = input[index]
            .get("type")
            .and_then(Value::as_str)
            .map(str::trim)
            == Some("additional_tools");
        if !is_carrier {
            index += 1;
            continue;
        }

        let removed_tools = input[index]
            .as_object_mut()
            .map(|carrier| filter_tools_field(carrier, unsupported_tool_types))
            .unwrap_or_default();
        if removed_tools == 0 {
            index += 1;
            continue;
        }

        result.removed_tools += removed_tools;
        if input[index].get("tools").is_none() {
            input.remove(index);
            result.removed_additional_tool_carriers += 1;
        } else {
            index += 1;
        }
    }
}

fn filter_tool_choice(
    body: &mut Value,
    unsupported_tool_types: &HashSet<&str>,
    result: &mut ResponsesToolFilterResult,
) {
    let mut remove_tool_choice = false;
    if let Some(choice) = body.get_mut("tool_choice").and_then(Value::as_object_mut) {
        let choice_type = choice.get("type").and_then(Value::as_str).map(str::trim);
        if choice_type.is_some_and(|tool_type| unsupported_tool_types.contains(tool_type)) {
            remove_tool_choice = true;
        } else if choice_type == Some("allowed_tools") {
            let removed_tools = filter_tools_field(choice, unsupported_tool_types);
            result.removed_tools += removed_tools;
            remove_tool_choice = removed_tools > 0 && !choice.contains_key("tools");
        }
    }

    if remove_tool_choice {
        if let Some(object) = body.as_object_mut() {
            object.remove("tool_choice");
            result.cleared_tool_choice = true;
        }
    }
}

fn filter_tools_field(
    object: &mut Map<String, Value>,
    unsupported_tool_types: &HashSet<&str>,
) -> usize {
    let mut remove_field = false;
    let removed_tools = match object.get_mut("tools").and_then(Value::as_array_mut) {
        Some(tools) => {
            let original_len = tools.len();
            tools.retain(|tool| !tool_type_is_unsupported(tool, unsupported_tool_types));
            remove_field = original_len != tools.len() && tools.is_empty();
            original_len - tools.len()
        }
        None => 0,
    };
    if remove_field {
        object.remove("tools");
    }
    removed_tools
}

fn tool_type_is_unsupported(tool: &Value, unsupported_tool_types: &HashSet<&str>) -> bool {
    tool.get("type")
        .and_then(Value::as_str)
        .map(str::trim)
        .is_some_and(|tool_type| unsupported_tool_types.contains(tool_type))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn removes_top_level_image_generation_and_keeps_other_tools() {
        let mut body = json!({
            "tools": [
                {"type": "function", "name": "run"},
                {"type": "image_generation"},
                {"type": "web_search"}
            ]
        });

        let result = remove_unsupported_responses_tools(&mut body, &["image_generation"]);

        assert_eq!(result.removed_tools, 1);
        assert!(result.changed());
        let types: Vec<&str> = body["tools"]
            .as_array()
            .unwrap()
            .iter()
            .map(|tool| tool["type"].as_str().unwrap())
            .collect();
        assert_eq!(types, vec!["function", "web_search"]);
    }

    #[test]
    fn removes_top_level_tools_field_when_only_image_generation_exists() {
        let mut body = json!({
            "tools": [{"type": "image_generation"}]
        });

        let result = remove_unsupported_responses_tools(&mut body, &["image_generation"]);

        assert_eq!(result.removed_tools, 1);
        assert!(body.get("tools").is_none());
    }

    #[test]
    fn clears_direct_forced_image_generation_tool_choice() {
        let mut body = json!({
            "tools": [
                {"type": "function", "name": "run"},
                {"type": "image_generation"}
            ],
            "tool_choice": {"type": "image_generation"}
        });

        let result = remove_unsupported_responses_tools(&mut body, &["image_generation"]);

        assert_eq!(result.removed_tools, 1);
        assert!(result.cleared_tool_choice);
        assert!(body.get("tool_choice").is_none());
        assert_eq!(body["tools"].as_array().unwrap().len(), 1);
    }

    #[test]
    fn filters_allowed_tools_choice_and_preserves_other_choices() {
        let mut allowed_tools = json!({
            "tool_choice": {
                "type": "allowed_tools",
                "mode": "auto",
                "tools": [
                    {"type": "function", "name": "run"},
                    {"type": "image_generation"}
                ]
            }
        });

        let result = remove_unsupported_responses_tools(&mut allowed_tools, &["image_generation"]);

        assert_eq!(result.removed_tools, 1);
        assert!(!result.cleared_tool_choice);
        assert_eq!(
            allowed_tools["tool_choice"]["tools"],
            json!([{"type": "function", "name": "run"}])
        );

        let mut only_image_generation = json!({
            "tool_choice": {
                "type": "allowed_tools",
                "mode": "required",
                "tools": [{"type": "image_generation"}]
            }
        });
        let result =
            remove_unsupported_responses_tools(&mut only_image_generation, &["image_generation"]);
        assert_eq!(result.removed_tools, 1);
        assert!(result.cleared_tool_choice);
        assert!(only_image_generation.get("tool_choice").is_none());

        let mut forced_function = json!({
            "tool_choice": {"type": "function", "name": "run"}
        });
        assert!(
            !remove_unsupported_responses_tools(&mut forced_function, &["image_generation"])
                .changed()
        );
        assert_eq!(
            forced_function["tool_choice"],
            json!({"type": "function", "name": "run"})
        );
    }

    #[test]
    fn filters_image_generation_from_additional_tools_carrier_only() {
        let mut body = json!({
            "input": [
                {"type": "message", "role": "user", "content": "hello"},
                {
                    "type": "additional_tools",
                    "tools": [
                        {"type": "function", "name": "run"},
                        {"type": "image_generation"}
                    ]
                }
            ]
        });

        let result = remove_unsupported_responses_tools(&mut body, &["image_generation"]);

        assert_eq!(result.removed_tools, 1);
        assert_eq!(result.removed_additional_tool_carriers, 0);
        assert_eq!(
            body["input"][1]["tools"],
            json!([{"type": "function", "name": "run"}])
        );
    }

    #[test]
    fn drops_empty_additional_tools_carrier_without_touching_user_content() {
        let mut body = json!({
            "input": [
                {"type": "message", "role": "user", "content": "hello"},
                {
                    "type": "additional_tools",
                    "tools": [{"type": "image_generation"}]
                }
            ]
        });

        let result = remove_unsupported_responses_tools(&mut body, &["image_generation"]);

        assert_eq!(result.removed_tools, 1);
        assert_eq!(result.removed_additional_tool_carriers, 1);
        assert_eq!(body["input"].as_array().unwrap().len(), 1);
        assert_eq!(body["input"][0]["content"], json!("hello"));
    }

    #[test]
    fn noops_when_no_known_carrier_contains_an_unsupported_tool() {
        let mut body = json!({
            "tools": [{"type": "function", "name": "run"}],
            "tool_choice": "auto",
            "input": [{
                "type": "additional_tools",
                "tools": [{"type": "web_search"}]
            }],
            "metadata": {"note": "image_generation"}
        });

        let result = remove_unsupported_responses_tools(&mut body, &["image_generation"]);

        assert_eq!(result, ResponsesToolFilterResult::default());
        assert_eq!(body["metadata"]["note"], json!("image_generation"));
    }
}
