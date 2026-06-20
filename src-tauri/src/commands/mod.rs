use crate::anki::sm2;
use crate::models::*;
use crate::parser::standard::parse_file;
use crate::settings;
use crate::storage::db::Database;
use crate::storage::stats::compute_stats;
use chrono::Local;
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

pub struct DbState(pub Mutex<Database>);

#[tauri::command]
pub fn import_file(path: String, state: State<DbState>) -> Result<Deck, String> {
    let cards = parse_file(&path).map_err(|e| e.to_string())?;

    let date = Local::now().format("%Y-%m-%d").to_string();
    let deck = Deck {
        id: Uuid::new_v4().to_string(),
        name: date.clone(),
        date_created: date,
        cards,
    };

    let db = state.0.lock().map_err(|e| e.to_string())?;
    db.insert_deck(&deck).map_err(|e| e.to_string())?;
    Ok(deck)
}

#[tauri::command]
pub fn get_decks(state: State<DbState>) -> Result<Vec<DeckSummary>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db.get_all_decks().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_deck(id: String, state: State<DbState>) -> Result<Option<Deck>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db.get_deck(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_deck(id: String, state: State<DbState>) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db.delete_deck(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_due_cards(deck_id: String, state: State<DbState>) -> Result<Vec<Card>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db.get_due_cards(&deck_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_cards(deck_id: String, state: State<DbState>) -> Result<Vec<Card>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db.get_deck_cards(&deck_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn submit_review(
    card_id: String,
    quality: u8,
    _session_id: String,
    state: State<DbState>,
) -> Result<CardReview, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;

    // Get current review state
    let current = db
        .get_card_review(&card_id)
        .map_err(|e| e.to_string())?;
    let (ef, iv, reps) = current
        .map(|r| (r.ease_factor, r.interval, r.repetitions))
        .unwrap_or((2.5, 1, 0));

    let result = sm2::review(quality, ef, iv, reps);
    let review = db
        .upsert_review(
            &card_id,
            result.ease_factor,
            result.interval,
            result.repetitions,
            result.due_date,
        )
        .map_err(|e| e.to_string())?;

    // Append this rating to the history log (which question was rated how).
    db.log_review(&card_id, quality).map_err(|e| e.to_string())?;

    Ok(review)
}

#[tauri::command]
pub fn save_progress(progress: DeckProgress, state: State<DbState>) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db.save_progress(&progress).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_progress(
    deck_id: String,
    state: State<DbState>,
) -> Result<Option<DeckProgress>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db.get_progress(&deck_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_progress(deck_id: String, state: State<DbState>) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db.clear_progress(&deck_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_card_history(
    card_id: String,
    state: State<DbState>,
) -> Result<Vec<ReviewLogEntry>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db.get_card_history(&card_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn end_session(
    session_id: String,
    cards_correct: i32,
    cards_total: i32,
    state: State<DbState>,
) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db.end_session(&session_id, cards_correct, cards_total)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_stats(state: State<DbState>) -> Result<Stats, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    Ok(compute_stats(&db))
}

#[tauri::command]
pub fn get_settings(state: State<DbState>) -> Result<Settings, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    Ok(settings::get_settings(&db))
}

#[tauri::command]
pub fn update_settings(settings: Settings, state: State<DbState>) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    settings::save_settings(&db, &settings).map_err(|e| e.to_string())
}
