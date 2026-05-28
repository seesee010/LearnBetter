use crate::models::{DailyStats, Stats};
use crate::storage::db::Database;
use std::time::{SystemTime, UNIX_EPOCH};

pub fn compute_stats(db: &Database) -> Stats {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    let today_start = now - (now % 86400);

    let total_studied = db
        .conn_query_i64(
            "SELECT COALESCE(SUM(cards_total), 0) FROM study_sessions WHERE ended_at > 0",
            &[],
        )
        .unwrap_or(0);

    let total_correct = db
        .conn_query_i64(
            "SELECT COALESCE(SUM(cards_correct), 0) FROM study_sessions WHERE ended_at > 0",
            &[],
        )
        .unwrap_or(0);

    let correct_ratio = if total_studied > 0 {
        total_correct as f64 / total_studied as f64
    } else {
        0.0
    };

    let cards_due_today = db
        .conn_query_i64(
            "SELECT COUNT(*) FROM card_reviews WHERE due_date <= ?1",
            &[&now as &dyn rusqlite::ToSql],
        )
        .unwrap_or(0);

    let avg_ease_factor = db
        .conn_query_f64(
            "SELECT COALESCE(AVG(ease_factor), 2.5) FROM card_reviews",
            &[],
        )
        .unwrap_or(2.5);

    let streak_days = compute_streak(db, today_start);
    let sessions = compute_daily_sessions(db, now);

    Stats {
        total_studied,
        correct_ratio,
        streak_days,
        cards_due_today,
        avg_ease_factor,
        sessions,
    }
}

fn compute_streak(db: &Database, today_start: i64) -> i32 {
    let mut streak = 0i32;
    let mut check_day = today_start;

    loop {
        let day_end = check_day + 86400;
        let count = db
            .conn_query_i64(
                "SELECT COUNT(*) FROM study_sessions WHERE ended_at >= ?1 AND ended_at < ?2",
                &[
                    &check_day as &dyn rusqlite::ToSql,
                    &day_end as &dyn rusqlite::ToSql,
                ],
            )
            .unwrap_or(0);

        if count > 0 {
            streak += 1;
            check_day -= 86400;
        } else {
            break;
        }

        if streak > 365 {
            break; // Safety limit
        }
    }

    streak
}

fn compute_daily_sessions(db: &Database, now: i64) -> Vec<DailyStats> {
    let mut sessions = Vec::new();
    let today_start = now - (now % 86400);

    for i in (0..14i64).rev() {
        let day_start = today_start - i * 86400;
        let day_end = day_start + 86400;

        let count = db
            .conn_query_i64(
                "SELECT COALESCE(SUM(cards_total), 0) FROM study_sessions WHERE ended_at >= ?1 AND ended_at < ?2",
                &[
                    &day_start as &dyn rusqlite::ToSql,
                    &day_end as &dyn rusqlite::ToSql,
                ],
            )
            .unwrap_or(0);

        let date = format_date_unix(day_start);
        sessions.push(DailyStats { date, count });
    }

    sessions
}

pub fn format_date_unix(unix: i64) -> String {
    let secs = unix.max(0) as u64;
    let days_since_epoch = secs / 86400;
    let mut year = 1970u32;
    let mut remaining_days = days_since_epoch as u32;

    loop {
        let days_in_year = if is_leap(year) { 366 } else { 365 };
        if remaining_days < days_in_year {
            break;
        }
        remaining_days -= days_in_year;
        year += 1;
    }

    let month_days = [
        31u32,
        if is_leap(year) { 29 } else { 28 },
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ];
    let mut month = 0u32;
    for &days in &month_days {
        if remaining_days < days {
            break;
        }
        remaining_days -= days;
        month += 1;
    }

    format!("{:04}-{:02}-{:02}", year, month + 1, remaining_days + 1)
}

fn is_leap(year: u32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::StudySession;
    use crate::storage::db::Database;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn now_unix() -> i64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64
    }

    #[test]
    fn test_empty_stats() {
        let db = Database::in_memory().unwrap();
        let stats = compute_stats(&db);
        assert_eq!(stats.total_studied, 0);
        assert_eq!(stats.correct_ratio, 0.0);
        assert_eq!(stats.streak_days, 0);
    }

    #[test]
    fn test_format_date_epoch() {
        // Unix epoch = 1970-01-01
        let date = format_date_unix(0);
        assert_eq!(date, "1970-01-01");
    }

    #[test]
    fn test_format_date_known() {
        // 2024-01-01 = days since epoch
        // 2024 - 1970 = 54 years, with leap years
        let date = format_date_unix(19723 * 86400);
        assert!(date.starts_with("2024"));
    }

    #[test]
    fn test_format_date_2000_03_01() {
        // Test around leap year boundary
        // 2000-03-01: 2000 is a leap year
        let date = format_date_unix(951868800); // approx 2000-03-01
        assert!(date.starts_with("2000"));
    }

    #[test]
    fn test_stats_with_sessions() {
        let db = Database::in_memory().unwrap();
        let now = now_unix();

        let session = StudySession {
            id: "s1".to_string(),
            deck_id: "d1".to_string(),
            started_at: now - 100,
            ended_at: now,
            cards_correct: 8,
            cards_total: 10,
        };
        db.insert_session(&session).unwrap();

        let stats = compute_stats(&db);
        assert_eq!(stats.total_studied, 10);
        assert!((stats.correct_ratio - 0.8).abs() < 0.001);
        assert_eq!(stats.streak_days, 1);
    }

    #[test]
    fn test_streak_consecutive_days() {
        let db = Database::in_memory().unwrap();
        let now = now_unix();
        let today_start = now - (now % 86400);

        // Add sessions for today and yesterday
        let s1 = StudySession {
            id: "s1".to_string(),
            deck_id: "d1".to_string(),
            started_at: today_start,
            ended_at: today_start + 100,
            cards_correct: 5,
            cards_total: 5,
        };
        let s2 = StudySession {
            id: "s2".to_string(),
            deck_id: "d1".to_string(),
            started_at: today_start - 86400,
            ended_at: today_start - 86400 + 100,
            cards_correct: 5,
            cards_total: 5,
        };
        db.insert_session(&s1).unwrap();
        db.insert_session(&s2).unwrap();

        let stats = compute_stats(&db);
        assert_eq!(stats.streak_days, 2);
    }

    #[test]
    fn test_sessions_last_14_days() {
        let db = Database::in_memory().unwrap();
        let stats = compute_stats(&db);
        assert_eq!(stats.sessions.len(), 14);
    }

    #[test]
    fn test_correct_ratio_calculation() {
        let db = Database::in_memory().unwrap();
        let now = now_unix();

        let s1 = StudySession {
            id: "s1".to_string(),
            deck_id: "d1".to_string(),
            started_at: now - 200,
            ended_at: now - 100,
            cards_correct: 3,
            cards_total: 10,
        };
        let s2 = StudySession {
            id: "s2".to_string(),
            deck_id: "d1".to_string(),
            started_at: now - 50,
            ended_at: now,
            cards_correct: 7,
            cards_total: 10,
        };
        db.insert_session(&s1).unwrap();
        db.insert_session(&s2).unwrap();

        let stats = compute_stats(&db);
        assert_eq!(stats.total_studied, 20);
        assert!((stats.correct_ratio - 0.5).abs() < 0.001);
    }

    #[test]
    fn test_is_leap() {
        assert!(is_leap(2000));
        assert!(is_leap(2024));
        assert!(!is_leap(1900));
        assert!(!is_leap(2023));
    }
}
