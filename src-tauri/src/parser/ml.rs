use crate::models::Card;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

#[derive(Debug)]
pub enum ParseError {
    InvalidFormat(String),
    IoError(std::io::Error),
}

impl std::fmt::Display for ParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            ParseError::InvalidFormat(msg) => write!(f, "Parse error: {}", msg),
            ParseError::IoError(e) => write!(f, "IO error: {}", e),
        }
    }
}

impl From<std::io::Error> for ParseError {
    fn from(e: std::io::Error) -> Self {
        ParseError::IoError(e)
    }
}

fn now_unix() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

pub fn parse_ml(content: &str) -> Result<Vec<Card>, ParseError> {
    let lines: Vec<&str> = content.lines().collect();

    if lines.is_empty() {
        return Err(ParseError::InvalidFormat("Empty file".to_string()));
    }

    if lines[0].trim() != ".mL" {
        return Err(ParseError::InvalidFormat(
            "File must start with '.mL'".to_string(),
        ));
    }

    let mut cards = Vec::new();
    let mut in_block = false;
    let mut current_front: Option<String> = None;
    let mut current_back: Option<String> = None;

    for (i, line) in lines.iter().enumerate().skip(1) {
        let line = line.trim();

        if line == "--0--" {
            if in_block {
                return Err(ParseError::InvalidFormat(format!(
                    "Unexpected '--0--' inside block at line {}",
                    i + 1
                )));
            }
            in_block = true;
            current_front = None;
            current_back = None;
        } else if line == "--;--" {
            if !in_block {
                return Err(ParseError::InvalidFormat(format!(
                    "Unexpected '--;--' at line {}",
                    i + 1
                )));
            }
            // Save pending card pair if complete
            if let (Some(front), Some(back)) = (current_front.take(), current_back.take()) {
                if !front.is_empty() && !back.is_empty() {
                    cards.push(Card {
                        id: Uuid::new_v4().to_string(),
                        front,
                        back,
                        tags: Vec::new(),
                        created_at: now_unix(),
                    });
                }
            }
            in_block = false;
        } else if in_block {
            if let Some(rest) = line.strip_prefix("F:") {
                // If we have a pending complete pair, save it first
                if let (Some(front), Some(back)) = (current_front.take(), current_back.take()) {
                    if !front.is_empty() && !back.is_empty() {
                        cards.push(Card {
                            id: Uuid::new_v4().to_string(),
                            front,
                            back,
                            tags: Vec::new(),
                            created_at: now_unix(),
                        });
                    }
                }
                current_front = Some(rest.trim().to_string());
                current_back = None;
            } else if let Some(rest) = line.strip_prefix("A:") {
                if current_front.is_none() {
                    return Err(ParseError::InvalidFormat(format!(
                        "Answer without question at line {}",
                        i + 1
                    )));
                }
                current_back = Some(rest.trim().to_string());
            }
        }
    }

    Ok(cards)
}

pub fn parse_ml_file(path: &str) -> Result<Vec<Card>, ParseError> {
    let content = std::fs::read_to_string(path)?;
    parse_ml(&content)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_valid_ml() {
        let content = ".mL\n--0--\nF: What is 2+2?\nA: 4\n--;--\n";
        let cards = parse_ml(content).unwrap();
        assert_eq!(cards.len(), 1);
        assert_eq!(cards[0].front, "What is 2+2?");
        assert_eq!(cards[0].back, "4");
    }

    #[test]
    fn test_parse_multiple_cards_single_block() {
        let content = ".mL\n--0--\nF: Q1\nA: A1\nF: Q2\nA: A2\n--;--\n";
        let cards = parse_ml(content).unwrap();
        assert_eq!(cards.len(), 2);
        assert_eq!(cards[0].front, "Q1");
        assert_eq!(cards[1].front, "Q2");
    }

    #[test]
    fn test_parse_multiple_blocks() {
        let content = ".mL\n--0--\nF: Q1\nA: A1\n--;--\n--0--\nF: Q2\nA: A2\n--;--\n";
        let cards = parse_ml(content).unwrap();
        assert_eq!(cards.len(), 2);
    }

    #[test]
    fn test_parse_invalid_header() {
        let content = "not_ml\nF: Q\nA: A\n";
        assert!(parse_ml(content).is_err());
    }

    #[test]
    fn test_parse_empty_file() {
        let content = "";
        assert!(parse_ml(content).is_err());
    }

    #[test]
    fn test_parse_empty_front_back_skipped() {
        // The format.mL template has empty F:/A: - should return 0 cards, not error
        let content = ".mL\n--0--\nF:\nA:\n\nF:\nA:\n--;--\n";
        let result = parse_ml(content);
        assert!(result.is_ok());
        let cards = result.unwrap();
        assert_eq!(cards.len(), 0);
    }

    #[test]
    fn test_answer_without_question_errors() {
        let content = ".mL\n--0--\nA: orphan answer\n--;--\n";
        assert!(parse_ml(content).is_err());
    }

    #[test]
    fn test_card_ids_are_unique() {
        let content = ".mL\n--0--\nF: Q1\nA: A1\nF: Q2\nA: A2\n--;--\n";
        let cards = parse_ml(content).unwrap();
        assert_ne!(cards[0].id, cards[1].id);
    }
}
