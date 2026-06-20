import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type {
  Card,
  CardReview,
  Deck,
  DeckProgress,
  DeckSummary,
  Quality,
  ReviewLogEntry,
  Settings,
  Stats,
} from '../types';

export async function importFile(path: string): Promise<Deck> {
  return invoke<Deck>('import_file', { path });
}

export async function openFileDialog(): Promise<string | null> {
  const result = await open({
    multiple: false,
    filters: [
      { name: 'Flashcard Files', extensions: ['mL', 'json', 'yaml', 'yml', 'toml', 'csv'] },
    ],
  });
  if (Array.isArray(result)) return result[0] ?? null;
  return result;
}

export async function getDecks(): Promise<DeckSummary[]> {
  return invoke<DeckSummary[]>('get_decks');
}

export async function getDeck(id: string): Promise<Deck | null> {
  return invoke<Deck | null>('get_deck', { id });
}

export async function deleteDeck(id: string): Promise<void> {
  return invoke<void>('delete_deck', { id });
}

export async function getDueCards(deckId: string): Promise<Card[]> {
  return invoke<Card[]>('get_due_cards', { deckId });
}

export async function getAllCards(deckId: string): Promise<Card[]> {
  return invoke<Card[]>('get_all_cards', { deckId });
}

export async function submitReview(
  cardId: string,
  quality: Quality,
  sessionId: string
): Promise<CardReview> {
  return invoke<CardReview>('submit_review', { cardId, quality, sessionId });
}

export async function saveProgress(progress: DeckProgress): Promise<void> {
  return invoke<void>('save_progress', { progress });
}

export async function getProgress(deckId: string): Promise<DeckProgress | null> {
  return invoke<DeckProgress | null>('get_progress', { deckId });
}

export async function clearProgress(deckId: string): Promise<void> {
  return invoke<void>('clear_progress', { deckId });
}

export async function getCardHistory(cardId: string): Promise<ReviewLogEntry[]> {
  return invoke<ReviewLogEntry[]>('get_card_history', { cardId });
}

export async function endSession(
  sessionId: string,
  cardsCorrect: number,
  cardsTotal: number
): Promise<void> {
  return invoke<void>('end_session', { sessionId, cardsCorrect, cardsTotal });
}

export async function getStats(): Promise<Stats> {
  return invoke<Stats>('get_stats');
}

export async function getSettings(): Promise<Settings> {
  return invoke<Settings>('get_settings');
}

export async function updateSettings(settings: Settings): Promise<void> {
  return invoke<void>('update_settings', { settings });
}
