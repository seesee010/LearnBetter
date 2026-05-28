use std::time::{SystemTime, UNIX_EPOCH};

pub struct ReviewResult {
    pub ease_factor: f64,
    pub interval: i32,
    pub repetitions: i32,
    pub due_date: i64,
}

/// SM-2 spaced repetition review algorithm.
/// quality: 0-5 (0-2 = failed, 3-5 = passed)
/// Returns updated (ease_factor, interval, repetitions, due_date_unix)
pub fn review(quality: u8, ease_factor: f64, interval: i32, repetitions: i32) -> ReviewResult {
    let q = quality as f64;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    if quality < 3 {
        // Failed — reset repetitions and interval
        ReviewResult {
            ease_factor: ease_factor.max(1.3),
            interval: 1,
            repetitions: 0,
            due_date: now + 86400,
        }
    } else {
        // Passed
        let new_interval = match repetitions {
            0 => 1,
            1 => 6,
            _ => (interval as f64 * ease_factor).round() as i32,
        };

        // SM-2 ease factor update formula
        let delta = 0.1 - (5.0 - q) * (0.08 + (5.0 - q) * 0.02);
        let new_ease_factor = (ease_factor + delta).max(1.3);
        let new_repetitions = repetitions + 1;
        let new_interval = new_interval.max(1);

        ReviewResult {
            ease_factor: new_ease_factor,
            interval: new_interval,
            repetitions: new_repetitions,
            due_date: now + (new_interval as i64) * 86400,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> i64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64
    }

    #[test]
    fn test_quality_0_resets() {
        let r = review(0, 2.5, 10, 5);
        assert_eq!(r.repetitions, 0);
        assert_eq!(r.interval, 1);
        assert!(r.ease_factor >= 1.3);
    }

    #[test]
    fn test_quality_1_resets() {
        let r = review(1, 2.5, 10, 5);
        assert_eq!(r.repetitions, 0);
        assert_eq!(r.interval, 1);
    }

    #[test]
    fn test_quality_2_resets() {
        let r = review(2, 2.5, 10, 5);
        assert_eq!(r.repetitions, 0);
        assert_eq!(r.interval, 1);
    }

    #[test]
    fn test_quality_3_first_rep() {
        let r = review(3, 2.5, 1, 0);
        assert_eq!(r.repetitions, 1);
        assert_eq!(r.interval, 1);
    }

    #[test]
    fn test_quality_3_second_rep() {
        let r = review(3, 2.5, 1, 1);
        assert_eq!(r.repetitions, 2);
        assert_eq!(r.interval, 6);
    }

    #[test]
    fn test_quality_4_increases_interval() {
        let r = review(4, 2.5, 6, 2);
        assert!(r.interval > 6);
        assert_eq!(r.repetitions, 3);
    }

    #[test]
    fn test_quality_5_increases_interval() {
        let r = review(5, 2.5, 6, 2);
        assert!(r.interval > 6);
        assert_eq!(r.repetitions, 3);
    }

    #[test]
    fn test_ease_factor_minimum_enforced() {
        // Even with low ease factor and quality 3, should stay >= 1.3
        let r = review(3, 1.3, 1, 0);
        assert!(r.ease_factor >= 1.3);
    }

    #[test]
    fn test_quality_5_increases_ease() {
        let r = review(5, 2.5, 6, 2);
        assert!(r.ease_factor > 2.5);
    }

    #[test]
    fn test_quality_3_decreases_ease() {
        // Quality 3: delta = 0.1 - 2*(0.08 + 2*0.02) = 0.1 - 2*0.12 = 0.1 - 0.24 = -0.14
        let r = review(3, 2.5, 1, 0);
        assert!(r.ease_factor < 2.5);
    }

    #[test]
    fn test_quality_4_maintains_ease() {
        // Quality 4: delta = 0.1 - 1*(0.08 + 1*0.02) = 0.1 - 0.10 = 0.0
        let r = review(4, 2.5, 6, 2);
        assert!((r.ease_factor - 2.5).abs() < 0.001);
    }

    #[test]
    fn test_due_date_is_future() {
        let n = now();
        let r = review(4, 2.5, 6, 2);
        assert!(r.due_date > n);
    }

    #[test]
    fn test_failed_due_date_is_tomorrow() {
        let n = now();
        let r = review(0, 2.5, 10, 5);
        // Should be approximately 1 day in the future
        assert!(r.due_date > n);
        assert!(r.due_date <= n + 86400 + 5); // allow 5 seconds tolerance
    }

    #[test]
    fn test_interval_grows_geometrically() {
        // After rep 2, interval = prev_interval * ease_factor
        let r = review(4, 2.5, 6, 2);
        assert_eq!(r.interval, (6_f64 * 2.5).round() as i32); // = 15
    }
}
