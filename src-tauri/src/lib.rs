pub mod anki;
pub mod models;
pub mod parser;
pub mod settings;
pub mod storage;

#[cfg(not(test))]
pub mod commands;

pub fn run() {
    #[cfg(not(test))]
    {
        use commands::*;
        use std::sync::Mutex;
        use storage::db::Database;

        let db_path = get_db_path();
        let db = Database::new(&db_path).expect("Failed to initialize database");

        tauri::Builder::default()
            .plugin(tauri_plugin_dialog::init())
            .manage(DbState(Mutex::new(db)))
            .invoke_handler(tauri::generate_handler![
                import_file,
                get_decks,
                get_deck,
                delete_deck,
                get_due_cards,
                get_all_cards,
                submit_review,
                end_session,
                get_stats,
                get_settings,
                update_settings,
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    }
    #[cfg(test)]
    {
        // No-op in test mode
    }
}

fn get_db_path() -> String {
    if let Some(data_dir) = dirs::data_dir() {
        let app_dir = data_dir.join("learnpp");
        std::fs::create_dir_all(&app_dir).ok();
        app_dir.join("learnpp.db").to_string_lossy().to_string()
    } else {
        "learnpp.db".to_string()
    }
}
