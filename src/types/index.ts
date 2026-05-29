// TypeScript interfaces matching Rust structs in src-tauri/src/models/mod.rs

export interface Card {
  id: string;
  front: string;
  back: string;
  tags: string[];
  created_at: number;
}

export interface Deck {
  id: string;
  name: string;
  date_created: string;
  cards: Card[];
}

export interface DeckSummary {
  id: string;
  name: string;
  date_created: string;
  card_count: number;
  due_count: number;
}

export interface CardReview {
  id: string;
  card_id: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  due_date: number;
  last_review: number;
}

export interface StudySession {
  id: string;
  deck_id: string;
  started_at: number;
  ended_at: number;
  cards_correct: number;
  cards_total: number;
}

export interface DailyStats {
  date: string;
  count: number;
}

export interface Stats {
  total_studied: number;
  correct_ratio: number;
  streak_days: number;
  cards_due_today: number;
  avg_ease_factor: number;
  sessions: DailyStats[];
}

export interface Settings {
  theme: 'clean' | 'modern' | 'minimal';
  color_mode: 'dark' | 'light';
  daily_goal: number;
  shuffle_default: boolean;
}

export type Quality = 1 | 2 | 3 | 4;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'clean',
  color_mode: 'dark',
  daily_goal: 20,
  shuffle_default: false,
};
