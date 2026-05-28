use crate::models::Card;
use rand::seq::SliceRandom;
use rand::thread_rng;

/// Fisher-Yates shuffle using the rand crate.
pub fn shuffle_cards(mut cards: Vec<Card>) -> Vec<Card> {
    let mut rng = thread_rng();
    cards.shuffle(&mut rng);
    cards
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::Card;

    fn make_cards(n: usize) -> Vec<Card> {
        (0..n)
            .map(|i| Card {
                id: format!("card-{}", i),
                front: format!("Q{}", i),
                back: format!("A{}", i),
                tags: Vec::new(),
                created_at: 0,
            })
            .collect()
    }

    #[test]
    fn test_shuffle_preserves_length() {
        let cards = make_cards(10);
        let shuffled = shuffle_cards(cards.clone());
        assert_eq!(shuffled.len(), 10);
    }

    #[test]
    fn test_shuffle_preserves_all_elements() {
        let cards = make_cards(5);
        let original_ids: std::collections::HashSet<String> =
            cards.iter().map(|c| c.id.clone()).collect();
        let shuffled = shuffle_cards(cards);
        let shuffled_ids: std::collections::HashSet<String> =
            shuffled.iter().map(|c| c.id.clone()).collect();
        assert_eq!(original_ids, shuffled_ids);
    }

    #[test]
    fn test_shuffle_empty() {
        let cards: Vec<Card> = Vec::new();
        let shuffled = shuffle_cards(cards);
        assert_eq!(shuffled.len(), 0);
    }

    #[test]
    fn test_shuffle_single_card() {
        let cards = make_cards(1);
        let shuffled = shuffle_cards(cards);
        assert_eq!(shuffled.len(), 1);
        assert_eq!(shuffled[0].id, "card-0");
    }

    #[test]
    fn test_shuffle_frontback_intact() {
        let cards = make_cards(5);
        let shuffled = shuffle_cards(cards);
        // Each card's front/back should still match its id
        for card in &shuffled {
            let idx: usize = card.id.strip_prefix("card-").unwrap().parse().unwrap();
            assert_eq!(card.front, format!("Q{}", idx));
            assert_eq!(card.back, format!("A{}", idx));
        }
    }
}
