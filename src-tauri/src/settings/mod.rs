use crate::models::Settings;
use crate::storage::db::Database;

pub fn get_settings(db: &Database) -> Settings {
    let theme = db
        .get_setting("theme")
        .ok()
        .flatten()
        .unwrap_or_else(|| "clean".to_string());
    let color_mode = db
        .get_setting("color_mode")
        .ok()
        .flatten()
        .unwrap_or_else(|| "dark".to_string());
    let daily_goal: i32 = db
        .get_setting("daily_goal")
        .ok()
        .flatten()
        .and_then(|v| v.parse().ok())
        .unwrap_or(20);
    let shuffle_default: bool = db
        .get_setting("shuffle_default")
        .ok()
        .flatten()
        .and_then(|v| v.parse().ok())
        .unwrap_or(false);
    Settings {
        theme,
        color_mode,
        daily_goal,
        shuffle_default,
    }
}

pub fn save_settings(db: &Database, settings: &Settings) -> rusqlite::Result<()> {
    db.set_setting("theme", &settings.theme)?;
    db.set_setting("color_mode", &settings.color_mode)?;
    db.set_setting("daily_goal", &settings.daily_goal.to_string())?;
    db.set_setting("shuffle_default", &settings.shuffle_default.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::db::Database;

    #[test]
    fn test_default_settings() {
        let db = Database::in_memory().unwrap();
        let settings = get_settings(&db);
        assert_eq!(settings.theme, "clean");
        assert_eq!(settings.color_mode, "dark");
        assert_eq!(settings.daily_goal, 20);
        assert!(!settings.shuffle_default);
    }

    #[test]
    fn test_save_and_load_settings() {
        let db = Database::in_memory().unwrap();
        let settings = Settings {
            theme: "modern".to_string(),
            color_mode: "light".to_string(),
            daily_goal: 30,
            shuffle_default: true,
        };
        save_settings(&db, &settings).unwrap();

        let loaded = get_settings(&db);
        assert_eq!(loaded.theme, "modern");
        assert_eq!(loaded.color_mode, "light");
        assert_eq!(loaded.daily_goal, 30);
        assert!(loaded.shuffle_default);
    }

    #[test]
    fn test_update_single_setting() {
        let db = Database::in_memory().unwrap();
        // Save defaults first
        let defaults = Settings::default();
        save_settings(&db, &defaults).unwrap();

        // Update theme
        let updated = Settings {
            theme: "minimal".to_string(),
            ..defaults
        };
        save_settings(&db, &updated).unwrap();

        let loaded = get_settings(&db);
        assert_eq!(loaded.theme, "minimal");
        assert_eq!(loaded.color_mode, "dark"); // unchanged
    }
}
