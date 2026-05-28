use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Card {
    pub id: String,
    pub front: String,
    pub back: String,
    pub tags: Vec<String>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Deck {
    pub id: String,
    pub name: String,
    pub date_created: String,
    pub cards: Vec<Card>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeckSummary {
    pub id: String,
    pub name: String,
    pub date_created: String,
    pub card_count: i64,
    pub due_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CardReview {
    pub id: String,
    pub card_id: String,
    pub ease_factor: f64,
    pub interval: i32,
    pub repetitions: i32,
    pub due_date: i64,
    pub last_review: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudySession {
    pub id: String,
    pub deck_id: String,
    pub started_at: i64,
    pub ended_at: i64,
    pub cards_correct: i32,
    pub cards_total: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyStats {
    pub date: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stats {
    pub total_studied: i64,
    pub correct_ratio: f64,
    pub streak_days: i32,
    pub cards_due_today: i64,
    pub avg_ease_factor: f64,
    pub sessions: Vec<DailyStats>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub theme: String,
    pub color_mode: String,
    pub daily_goal: i32,
    pub shuffle_default: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            theme: "clean".to_string(),
            color_mode: "dark".to_string(),
            daily_goal: 20,
            shuffle_default: false,
        }
    }
}
