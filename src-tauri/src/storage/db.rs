use crate::models::*;
use rusqlite::{params, Connection, Result as SqlResult};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

pub struct Database {
    pub conn: Connection,
}

impl Database {
    pub fn new(path: &str) -> SqlResult<Self> {
        let conn = Connection::open(path)?;
        let db = Database { conn };
        db.init()?;
        Ok(db)
    }

    pub fn in_memory() -> SqlResult<Self> {
        let conn = Connection::open_in_memory()?;
        let db = Database { conn };
        db.init()?;
        Ok(db)
    }

    fn init(&self) -> SqlResult<()> {
        self.conn.execute_batch(
            "
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS decks (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                date_created TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS cards (
                id TEXT PRIMARY KEY,
                deck_id TEXT NOT NULL,
                front TEXT NOT NULL,
                back TEXT NOT NULL,
                tags TEXT NOT NULL DEFAULT '[]',
                created_at INTEGER NOT NULL,
                FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS card_reviews (
                id TEXT PRIMARY KEY,
                card_id TEXT NOT NULL UNIQUE,
                ease_factor REAL NOT NULL DEFAULT 2.5,
                interval INTEGER NOT NULL DEFAULT 1,
                repetitions INTEGER NOT NULL DEFAULT 0,
                due_date INTEGER NOT NULL DEFAULT 0,
                last_review INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS study_sessions (
                id TEXT PRIMARY KEY,
                deck_id TEXT NOT NULL,
                started_at INTEGER NOT NULL,
                ended_at INTEGER NOT NULL DEFAULT 0,
                cards_correct INTEGER NOT NULL DEFAULT 0,
                cards_total INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        ",
        )
    }

    pub fn insert_deck(&self, deck: &Deck) -> SqlResult<()> {
        let now = now_unix();
        self.conn.execute(
            "INSERT OR REPLACE INTO decks (id, name, date_created, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![deck.id, deck.name, deck.date_created, now],
        )?;
        for card in &deck.cards {
            self.insert_card(card, &deck.id)?;
        }
        Ok(())
    }

    fn insert_card(&self, card: &Card, deck_id: &str) -> SqlResult<()> {
        let tags_json = serde_json::to_string(&card.tags).unwrap_or_else(|_| "[]".to_string());
        self.conn.execute(
            "INSERT OR REPLACE INTO cards (id, deck_id, front, back, tags, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![card.id, deck_id, card.front, card.back, tags_json, card.created_at],
        )?;
        // Initialize review for new card (ignore if already exists)
        self.conn.execute(
            "INSERT OR IGNORE INTO card_reviews (id, card_id, ease_factor, interval, repetitions, due_date, last_review)
             VALUES (?1, ?2, 2.5, 1, 0, 0, 0)",
            params![Uuid::new_v4().to_string(), card.id],
        )?;
        Ok(())
    }

    pub fn get_all_decks(&self) -> SqlResult<Vec<DeckSummary>> {
        let now = now_unix();
        let mut stmt = self.conn.prepare(
            "SELECT d.id, d.name, d.date_created,
                COUNT(c.id) as card_count,
                (SELECT COUNT(*) FROM cards c2
                 LEFT JOIN card_reviews cr ON c2.id = cr.card_id
                 WHERE c2.deck_id = d.id AND (cr.due_date IS NULL OR cr.due_date <= ?1)) as due_count
             FROM decks d LEFT JOIN cards c ON d.id = c.deck_id
             GROUP BY d.id ORDER BY d.created_at DESC",
        )?;
        let rows = stmt.query_map(params![now], |row| {
            Ok(DeckSummary {
                id: row.get(0)?,
                name: row.get(1)?,
                date_created: row.get(2)?,
                card_count: row.get(3)?,
                due_count: row.get(4)?,
            })
        })?;
        rows.collect()
    }

    pub fn get_deck(&self, deck_id: &str) -> SqlResult<Option<Deck>> {
        let deck_row = self
            .conn
            .query_row(
                "SELECT id, name, date_created FROM decks WHERE id = ?1",
                params![deck_id],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                    ))
                },
            )
            .optional()?;

        if let Some((id, name, date_created)) = deck_row {
            let cards = self.get_deck_cards(deck_id)?;
            Ok(Some(Deck {
                id,
                name,
                date_created,
                cards,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn get_deck_cards(&self, deck_id: &str) -> SqlResult<Vec<Card>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, front, back, tags, created_at FROM cards WHERE deck_id = ?1",
        )?;
        let rows = stmt.query_map(params![deck_id], |row| {
            let tags_str: String = row.get(3)?;
            let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
            Ok(Card {
                id: row.get(0)?,
                front: row.get(1)?,
                back: row.get(2)?,
                tags,
                created_at: row.get(4)?,
            })
        })?;
        rows.collect()
    }

    pub fn get_due_cards(&self, deck_id: &str) -> SqlResult<Vec<Card>> {
        let now = now_unix();
        let mut stmt = self.conn.prepare(
            "SELECT c.id, c.front, c.back, c.tags, c.created_at
             FROM cards c LEFT JOIN card_reviews cr ON c.id = cr.card_id
             WHERE c.deck_id = ?1 AND (cr.due_date IS NULL OR cr.due_date <= ?2)
             ORDER BY COALESCE(cr.due_date, 0) ASC",
        )?;
        let rows = stmt.query_map(params![deck_id, now], |row| {
            let tags_str: String = row.get(3)?;
            let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
            Ok(Card {
                id: row.get(0)?,
                front: row.get(1)?,
                back: row.get(2)?,
                tags,
                created_at: row.get(4)?,
            })
        })?;
        rows.collect()
    }

    pub fn get_card_review(&self, card_id: &str) -> SqlResult<Option<CardReview>> {
        self.conn
            .query_row(
                "SELECT id, card_id, ease_factor, interval, repetitions, due_date, last_review FROM card_reviews WHERE card_id = ?1",
                params![card_id],
                |row| {
                    Ok(CardReview {
                        id: row.get(0)?,
                        card_id: row.get(1)?,
                        ease_factor: row.get(2)?,
                        interval: row.get(3)?,
                        repetitions: row.get(4)?,
                        due_date: row.get(5)?,
                        last_review: row.get(6)?,
                    })
                },
            )
            .optional()
    }

    pub fn upsert_review(
        &self,
        card_id: &str,
        ease_factor: f64,
        interval: i32,
        repetitions: i32,
        due_date: i64,
    ) -> SqlResult<CardReview> {
        let now = now_unix();
        let new_id = Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO card_reviews (id, card_id, ease_factor, interval, repetitions, due_date, last_review)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(card_id) DO UPDATE SET
             ease_factor=excluded.ease_factor, interval=excluded.interval,
             repetitions=excluded.repetitions, due_date=excluded.due_date, last_review=excluded.last_review",
            params![new_id, card_id, ease_factor, interval, repetitions, due_date, now],
        )?;

        // Fetch the actual id that was stored (might be existing one)
        let stored_id: String = self.conn.query_row(
            "SELECT id FROM card_reviews WHERE card_id = ?1",
            params![card_id],
            |row| row.get(0),
        )?;

        Ok(CardReview {
            id: stored_id,
            card_id: card_id.to_string(),
            ease_factor,
            interval,
            repetitions,
            due_date,
            last_review: now,
        })
    }

    pub fn insert_session(&self, session: &StudySession) -> SqlResult<()> {
        self.conn.execute(
            "INSERT INTO study_sessions (id, deck_id, started_at, ended_at, cards_correct, cards_total)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                session.id,
                session.deck_id,
                session.started_at,
                session.ended_at,
                session.cards_correct,
                session.cards_total
            ],
        )?;
        Ok(())
    }

    pub fn end_session(
        &self,
        session_id: &str,
        cards_correct: i32,
        cards_total: i32,
    ) -> SqlResult<()> {
        let now = now_unix();
        self.conn.execute(
            "UPDATE study_sessions SET ended_at=?1, cards_correct=?2, cards_total=?3 WHERE id=?4",
            params![now, cards_correct, cards_total, session_id],
        )?;
        Ok(())
    }

    pub fn delete_deck(&self, deck_id: &str) -> SqlResult<()> {
        self.conn
            .execute("DELETE FROM decks WHERE id = ?1", params![deck_id])?;
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> SqlResult<Option<String>> {
        self.conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                params![key],
                |row| row.get(0),
            )
            .optional()
    }

    pub fn set_setting(&self, key: &str, value: &str) -> SqlResult<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;
        Ok(())
    }

    // Helper methods for stats queries
    pub fn conn_query_i64(&self, sql: &str, params: &[&dyn rusqlite::ToSql]) -> SqlResult<i64> {
        self.conn.query_row(sql, params, |row| row.get(0))
    }

    pub fn conn_query_f64(&self, sql: &str, params: &[&dyn rusqlite::ToSql]) -> SqlResult<f64> {
        self.conn.query_row(sql, params, |row| row.get(0))
    }
}

fn now_unix() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

trait OptionalExt<T> {
    fn optional(self) -> SqlResult<Option<T>>;
}

impl<T> OptionalExt<T> for SqlResult<T> {
    fn optional(self) -> SqlResult<Option<T>> {
        match self {
            Ok(v) => Ok(Some(v)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::Card;

    fn test_card(id: &str, front: &str, back: &str) -> Card {
        Card {
            id: id.to_string(),
            front: front.to_string(),
            back: back.to_string(),
            tags: vec![],
            created_at: 0,
        }
    }

    fn test_deck(id: &str) -> Deck {
        Deck {
            id: id.to_string(),
            name: "Test Deck".to_string(),
            date_created: "2024-01-01".to_string(),
            cards: vec![
                test_card("c1", "Q1", "A1"),
                test_card("c2", "Q2", "A2"),
            ],
        }
    }

    #[test]
    fn test_create_db() {
        let db = Database::in_memory().unwrap();
        let decks = db.get_all_decks().unwrap();
        assert_eq!(decks.len(), 0);
    }

    #[test]
    fn test_insert_and_get_deck() {
        let db = Database::in_memory().unwrap();
        let deck = test_deck("deck1");
        db.insert_deck(&deck).unwrap();
        let decks = db.get_all_decks().unwrap();
        assert_eq!(decks.len(), 1);
        assert_eq!(decks[0].name, "Test Deck");
    }

    #[test]
    fn test_get_deck_cards() {
        let db = Database::in_memory().unwrap();
        db.insert_deck(&test_deck("deck1")).unwrap();
        let cards = db.get_deck_cards("deck1").unwrap();
        assert_eq!(cards.len(), 2);
    }

    #[test]
    fn test_upsert_review() {
        let db = Database::in_memory().unwrap();
        db.insert_deck(&test_deck("deck1")).unwrap();
        let review = db.upsert_review("c1", 2.5, 6, 2, 9999999999).unwrap();
        assert_eq!(review.card_id, "c1");
        assert_eq!(review.interval, 6);
    }

    #[test]
    fn test_upsert_review_updates_existing() {
        let db = Database::in_memory().unwrap();
        db.insert_deck(&test_deck("deck1")).unwrap();
        db.upsert_review("c1", 2.5, 6, 2, 9999999999).unwrap();
        let review2 = db.upsert_review("c1", 2.6, 15, 3, 9999999999 + 86400).unwrap();
        assert_eq!(review2.interval, 15);
        assert_eq!(review2.repetitions, 3);
    }

    #[test]
    fn test_delete_deck() {
        let db = Database::in_memory().unwrap();
        db.insert_deck(&test_deck("deck1")).unwrap();
        db.delete_deck("deck1").unwrap();
        let decks = db.get_all_decks().unwrap();
        assert_eq!(decks.len(), 0);
    }

    #[test]
    fn test_settings() {
        let db = Database::in_memory().unwrap();
        db.set_setting("theme", "modern").unwrap();
        let val = db.get_setting("theme").unwrap();
        assert_eq!(val, Some("modern".to_string()));
    }

    #[test]
    fn test_get_missing_setting() {
        let db = Database::in_memory().unwrap();
        let val = db.get_setting("nonexistent").unwrap();
        assert_eq!(val, None);
    }

    #[test]
    fn test_deck_card_count() {
        let db = Database::in_memory().unwrap();
        db.insert_deck(&test_deck("deck1")).unwrap();
        let decks = db.get_all_decks().unwrap();
        assert_eq!(decks[0].card_count, 2);
    }

    #[test]
    fn test_get_deck_by_id() {
        let db = Database::in_memory().unwrap();
        let deck = test_deck("deck1");
        db.insert_deck(&deck).unwrap();
        let fetched = db.get_deck("deck1").unwrap();
        assert!(fetched.is_some());
        let fetched = fetched.unwrap();
        assert_eq!(fetched.id, "deck1");
        assert_eq!(fetched.cards.len(), 2);
    }

    #[test]
    fn test_get_nonexistent_deck() {
        let db = Database::in_memory().unwrap();
        let fetched = db.get_deck("notexist").unwrap();
        assert!(fetched.is_none());
    }

    #[test]
    fn test_get_card_review() {
        let db = Database::in_memory().unwrap();
        db.insert_deck(&test_deck("deck1")).unwrap();
        let review = db.get_card_review("c1").unwrap();
        assert!(review.is_some());
        let r = review.unwrap();
        assert_eq!(r.card_id, "c1");
        assert_eq!(r.ease_factor, 2.5);
    }

    #[test]
    fn test_insert_and_end_session() {
        let db = Database::in_memory().unwrap();
        let session = StudySession {
            id: "sess1".to_string(),
            deck_id: "deck1".to_string(),
            started_at: now_unix(),
            ended_at: 0,
            cards_correct: 0,
            cards_total: 0,
        };
        db.insert_session(&session).unwrap();
        db.end_session("sess1", 5, 10).unwrap();
        // Verify by querying stats
        let total = db
            .conn_query_i64(
                "SELECT cards_total FROM study_sessions WHERE id = ?1",
                &[&"sess1" as &dyn rusqlite::ToSql],
            )
            .unwrap();
        assert_eq!(total, 10);
    }
}
