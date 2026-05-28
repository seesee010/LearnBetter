use crate::models::Card;
use crate::parser::ml::ParseError;
use serde::Deserialize;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

#[derive(Deserialize)]
struct FileCard {
    front: String,
    back: String,
    #[serde(default)]
    tags: Vec<String>,
}

#[derive(Deserialize)]
struct FileFormat {
    cards: Vec<FileCard>,
}

fn now_unix() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

fn file_card_to_card(fc: FileCard) -> Result<Card, ParseError> {
    if fc.front.trim().is_empty() {
        return Err(ParseError::InvalidFormat(
            "Card has empty front".to_string(),
        ));
    }
    if fc.back.trim().is_empty() {
        return Err(ParseError::InvalidFormat("Card has empty back".to_string()));
    }
    Ok(Card {
        id: Uuid::new_v4().to_string(),
        front: fc.front,
        back: fc.back,
        tags: fc.tags,
        created_at: now_unix(),
    })
}

pub fn parse_json(content: &str) -> Result<Vec<Card>, ParseError> {
    let format: FileFormat = serde_json::from_str(content)
        .map_err(|e| ParseError::InvalidFormat(format!("JSON error: {}", e)))?;
    format.cards.into_iter().map(file_card_to_card).collect()
}

pub fn parse_yaml(content: &str) -> Result<Vec<Card>, ParseError> {
    let format: FileFormat = serde_yaml::from_str(content)
        .map_err(|e| ParseError::InvalidFormat(format!("YAML error: {}", e)))?;
    format.cards.into_iter().map(file_card_to_card).collect()
}

pub fn parse_toml_content(content: &str) -> Result<Vec<Card>, ParseError> {
    let format: FileFormat = toml::from_str(content)
        .map_err(|e| ParseError::InvalidFormat(format!("TOML error: {}", e)))?;
    format.cards.into_iter().map(file_card_to_card).collect()
}

pub fn parse_csv(content: &str) -> Result<Vec<Card>, ParseError> {
    let mut cards = Vec::new();
    for (i, line) in content.lines().enumerate() {
        if line.trim().is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.splitn(3, ',').collect();
        if parts.len() < 2 {
            return Err(ParseError::InvalidFormat(format!(
                "CSV line {} needs at least 2 columns",
                i + 1
            )));
        }
        let front = parts[0].trim().trim_matches('"').to_string();
        let back = parts[1].trim().trim_matches('"').to_string();
        let tags: Vec<String> = if parts.len() > 2 {
            parts[2]
                .trim()
                .trim_matches('"')
                .split(',')
                .map(|t| t.trim().to_string())
                .filter(|t| !t.is_empty())
                .collect()
        } else {
            Vec::new()
        };
        if front.is_empty() || back.is_empty() {
            continue;
        }
        cards.push(Card {
            id: Uuid::new_v4().to_string(),
            front,
            back,
            tags,
            created_at: now_unix(),
        });
    }
    Ok(cards)
}

pub fn parse_file(path: &str) -> Result<Vec<Card>, ParseError> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| ParseError::InvalidFormat(format!("Cannot read file: {}", e)))?;

    let ext = std::path::Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "ml" => crate::parser::ml::parse_ml(&content),
        "json" => parse_json(&content),
        "yaml" | "yml" => parse_yaml(&content),
        "toml" => parse_toml_content(&content),
        "csv" => parse_csv(&content),
        _ => Err(ParseError::InvalidFormat(format!(
            "Unsupported format: .{}",
            ext
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_json() {
        let json = r#"{"cards":[{"front":"Q1","back":"A1"},{"front":"Q2","back":"A2","tags":["math"]}]}"#;
        let cards = parse_json(json).unwrap();
        assert_eq!(cards.len(), 2);
        assert_eq!(cards[0].front, "Q1");
        assert_eq!(cards[1].tags, vec!["math"]);
    }

    #[test]
    fn test_parse_yaml() {
        let yaml = "cards:\n  - front: Q1\n    back: A1\n  - front: Q2\n    back: A2\n";
        let cards = parse_yaml(yaml).unwrap();
        assert_eq!(cards.len(), 2);
    }

    #[test]
    fn test_parse_toml() {
        let toml_content =
            "[[cards]]\nfront = \"Q1\"\nback = \"A1\"\n\n[[cards]]\nfront = \"Q2\"\nback = \"A2\"\n";
        let cards = parse_toml_content(toml_content).unwrap();
        assert_eq!(cards.len(), 2);
    }

    #[test]
    fn test_parse_csv() {
        let csv = "What is 2+2?,4\nCapital of France?,Paris,geography";
        let cards = parse_csv(csv).unwrap();
        assert_eq!(cards.len(), 2);
        assert_eq!(cards[0].front, "What is 2+2?");
        assert_eq!(cards[1].tags, vec!["geography"]);
    }

    #[test]
    fn test_parse_json_empty_front_errors() {
        let json = r#"{"cards":[{"front":"","back":"A1"}]}"#;
        let result = parse_json(json);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_json_empty_back_errors() {
        let json = r#"{"cards":[{"front":"Q1","back":""}]}"#;
        let result = parse_json(json);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_csv_skips_empty_lines() {
        let csv = "Q1,A1\n\nQ2,A2\n";
        let cards = parse_csv(csv).unwrap();
        assert_eq!(cards.len(), 2);
    }

    #[test]
    fn test_parse_csv_single_column_errors() {
        let csv = "only_one_column";
        let result = parse_csv(csv);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_yaml_with_tags() {
        let yaml =
            "cards:\n  - front: Q1\n    back: A1\n    tags:\n      - science\n      - math\n";
        let cards = parse_yaml(yaml).unwrap();
        assert_eq!(cards[0].tags, vec!["science", "math"]);
    }

    #[test]
    fn test_parse_toml_with_tags() {
        let toml_content =
            "[[cards]]\nfront = \"Q1\"\nback = \"A1\"\ntags = [\"history\"]\n";
        let cards = parse_toml_content(toml_content).unwrap();
        assert_eq!(cards[0].tags, vec!["history"]);
    }
}
