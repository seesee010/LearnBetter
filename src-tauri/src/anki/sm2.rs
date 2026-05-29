use std::time::{SystemTime, UNIX_EPOCH};

pub struct ReviewResult {
    pub ease_factor: f64,
    pub interval: i32,
    pub repetitions: i32,
    pub due_date: i64,
}

// Learning steps in seconds
const STEP_1_SECS: i64 = 60;       // Again / first step: 1 minute
const STEP_2_SECS: i64 = 10 * 60;  // second learning step: 10 minutes

const GRADUATING_INTERVAL: i32 = 1; // days when graduating via Good
const EASY_INTERVAL: i32 = 4;       // days when graduating via Easy
const MIN_EASE: f64 = 1.3;
const EASY_BONUS: f64 = 1.3;
const HARD_MULTIPLIER: f64 = 1.2;

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

/// Anki-style spaced repetition.
///
/// quality: 1=Again, 2=Hard, 3=Good, 4=Easy
///
/// Card state via repetitions:
///   0 → new / failed, on learning step 1 (1 min)
///   1 → passed step 1, on learning step 2 (10 min)
///  ≥2 → graduated review card, interval in days
pub fn review(quality: u8, ease_factor: f64, interval: i32, repetitions: i32) -> ReviewResult {
    let now = now_secs();
    let in_learning = repetitions < 2;

    match quality {
        // ── Again ─────────────────────────────────────────────────────────────
        1 => ReviewResult {
            ease_factor: if in_learning {
                ease_factor
            } else {
                (ease_factor - 0.2).max(MIN_EASE)
            },
            interval: 0,
            repetitions: 0,
            due_date: now + STEP_1_SECS,
        },

        // ── Hard ──────────────────────────────────────────────────────────────
        2 => {
            if in_learning {
                // Stay at current step
                let delay = if repetitions == 0 { STEP_1_SECS } else { STEP_2_SECS };
                ReviewResult {
                    ease_factor,
                    interval: 0,
                    repetitions,
                    due_date: now + delay,
                }
            } else {
                // Review: interval × 1.2, ease −0.15
                let new_iv = ((interval as f64 * HARD_MULTIPLIER).round() as i32).max(interval + 1);
                ReviewResult {
                    ease_factor: (ease_factor - 0.15).max(MIN_EASE),
                    interval: new_iv,
                    repetitions: repetitions + 1,
                    due_date: now + new_iv as i64 * 86400,
                }
            }
        }

        // ── Good ──────────────────────────────────────────────────────────────
        3 => match repetitions {
            0 => {
                // Advance to step 2 (10 min)
                ReviewResult {
                    ease_factor,
                    interval: 0,
                    repetitions: 1,
                    due_date: now + STEP_2_SECS,
                }
            }
            1 => {
                // Graduate with 1 day
                ReviewResult {
                    ease_factor,
                    interval: GRADUATING_INTERVAL,
                    repetitions: 2,
                    due_date: now + GRADUATING_INTERVAL as i64 * 86400,
                }
            }
            _ => {
                // Review: interval × ease_factor, ease unchanged
                let new_iv = ((interval as f64 * ease_factor).round() as i32).max(interval + 1);
                ReviewResult {
                    ease_factor,
                    interval: new_iv,
                    repetitions: repetitions + 1,
                    due_date: now + new_iv as i64 * 86400,
                }
            }
        },

        // ── Easy ──────────────────────────────────────────────────────────────
        4 => {
            if in_learning {
                // Skip straight to review with 4-day interval
                ReviewResult {
                    ease_factor: ease_factor + 0.15,
                    interval: EASY_INTERVAL,
                    repetitions: 2,
                    due_date: now + EASY_INTERVAL as i64 * 86400,
                }
            } else {
                // Review: interval × ease_factor × easy_bonus, ease +0.15
                let new_iv = ((interval as f64 * ease_factor * EASY_BONUS).round() as i32)
                    .max(interval + 1);
                ReviewResult {
                    ease_factor: ease_factor + 0.15,
                    interval: new_iv,
                    repetitions: repetitions + 1,
                    due_date: now + new_iv as i64 * 86400,
                }
            }
        }

        // Fallback: treat unknown quality as Good
        _ => review(3, ease_factor, interval, repetitions),
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

    // ── Again ──────────────────────────────────────────────────────────────────

    #[test]
    fn again_resets_to_step_1() {
        let r = review(1, 2.5, 10, 5);
        assert_eq!(r.repetitions, 0);
        assert_eq!(r.interval, 0);
        // due in ~1 minute
        let n = now();
        assert!(r.due_date >= n + 58 && r.due_date <= n + 65);
    }

    #[test]
    fn again_on_review_card_decreases_ease() {
        let r = review(1, 2.5, 10, 5);
        assert!((r.ease_factor - 2.3).abs() < 0.001);
    }

    #[test]
    fn again_on_learning_card_keeps_ease() {
        let r = review(1, 2.5, 0, 0);
        assert!((r.ease_factor - 2.5).abs() < 0.001);
    }

    #[test]
    fn again_ease_never_below_min() {
        let r = review(1, 1.3, 10, 5);
        assert!(r.ease_factor >= MIN_EASE);
    }

    // ── Hard ───────────────────────────────────────────────────────────────────

    #[test]
    fn hard_learning_step_0_stays() {
        let r = review(2, 2.5, 0, 0);
        assert_eq!(r.repetitions, 0);
        let n = now();
        // due in ~1 min (step 1)
        assert!(r.due_date >= n + 58 && r.due_date <= n + 65);
    }

    #[test]
    fn hard_learning_step_1_stays() {
        let r = review(2, 2.5, 0, 1);
        assert_eq!(r.repetitions, 1);
        let n = now();
        // due in ~10 min (step 2)
        assert!(r.due_date >= n + 598 && r.due_date <= n + 605);
    }

    #[test]
    fn hard_review_increases_interval_by_1_2() {
        let r = review(2, 2.5, 10, 3);
        assert_eq!(r.interval, 12); // 10 * 1.2 = 12
        assert_eq!(r.repetitions, 4);
    }

    #[test]
    fn hard_review_decreases_ease() {
        let r = review(2, 2.5, 10, 3);
        assert!((r.ease_factor - 2.35).abs() < 0.001);
    }

    // ── Good ───────────────────────────────────────────────────────────────────

    #[test]
    fn good_step_0_advances_to_step_1() {
        let r = review(3, 2.5, 0, 0);
        assert_eq!(r.repetitions, 1);
        assert_eq!(r.interval, 0);
        let n = now();
        // due in ~10 min
        assert!(r.due_date >= n + 598 && r.due_date <= n + 605);
    }

    #[test]
    fn good_step_1_graduates_to_review() {
        let r = review(3, 2.5, 0, 1);
        assert_eq!(r.repetitions, 2);
        assert_eq!(r.interval, 1);
        let n = now();
        assert!(r.due_date >= n + 86395 && r.due_date <= n + 86405);
    }

    #[test]
    fn good_review_multiplies_interval() {
        let r = review(3, 2.5, 10, 3);
        assert_eq!(r.interval, 25); // round(10 * 2.5) = 25
        assert_eq!(r.repetitions, 4);
    }

    #[test]
    fn good_review_keeps_ease_unchanged() {
        let r = review(3, 2.5, 10, 3);
        assert!((r.ease_factor - 2.5).abs() < 0.001);
    }

    // ── Easy ───────────────────────────────────────────────────────────────────

    #[test]
    fn easy_from_learning_graduates_with_4_days() {
        let r = review(4, 2.5, 0, 0);
        assert_eq!(r.repetitions, 2);
        assert_eq!(r.interval, 4);
        let n = now();
        assert!(r.due_date >= n + 4 * 86400 - 5 && r.due_date <= n + 4 * 86400 + 5);
    }

    #[test]
    fn easy_from_learning_increases_ease() {
        let r = review(4, 2.5, 0, 0);
        assert!((r.ease_factor - 2.65).abs() < 0.001);
    }

    #[test]
    fn easy_review_applies_bonus() {
        let r = review(4, 2.5, 10, 3);
        // round(10 * 2.5 * 1.3) = round(32.5) = 33
        assert_eq!(r.interval, 33);
        assert_eq!(r.repetitions, 4);
    }

    #[test]
    fn easy_review_increases_ease() {
        let r = review(4, 2.5, 10, 3);
        assert!((r.ease_factor - 2.65).abs() < 0.001);
    }

    // ── Interval growth ────────────────────────────────────────────────────────

    #[test]
    fn interval_always_grows_on_hard_review() {
        let r = review(2, 2.5, 1, 2);
        assert!(r.interval > 1);
    }

    #[test]
    fn interval_always_grows_on_good_review() {
        let r = review(3, 1.3, 1, 2);
        assert!(r.interval >= 2);
    }
}
