import { create } from 'zustand';
import * as api from '../api/tauri';
import type { Card, Quality } from '../types';
import { useToastStore } from './toastStore';

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface SessionStats {
  accuracy: number;
  duration: number;
  cardsTotal: number;
  cardsCorrect: number;
}

interface StudyStore {
  cards: Card[];
  baseCardCount: number;
  currentIndex: number;
  isShuffled: boolean;
  sessionId: string | null;
  startTime: number;
  correctCount: number;
  isComplete: boolean;
  deckId: string | null;
  sessionStats: SessionStats;
  startSession: (deckId: string, shuffle: boolean, resume?: boolean) => Promise<void>;
  nextCard: (quality: Quality) => Promise<void>;
  restartSession: () => Promise<void>;
  toggleShuffle: () => Promise<void>;
}

/**
 * Persist where the user currently is in the deck so the next launch can
 * resume from the exact same card. Best-effort: failures only surface a toast.
 */
async function persistProgress(
  deckId: string,
  cards: Card[],
  currentIndex: number,
  correctCount: number,
  baseCardCount: number,
  isShuffled: boolean
): Promise<void> {
  try {
    await api.saveProgress({
      deck_id: deckId,
      current_index: currentIndex,
      correct_count: correctCount,
      base_card_count: baseCardCount,
      card_order: cards.map((c) => c.id),
      is_shuffled: isShuffled,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    useToastStore.getState().addToast(`Saving progress failed: ${msg}`, 'error');
  }
}

export const useStudyStore = create<StudyStore>((set, get) => ({
  cards: [],
  baseCardCount: 0,
  currentIndex: 0,
  isShuffled: false,
  sessionId: null,
  startTime: 0,
  correctCount: 0,
  isComplete: false,
  deckId: null,
  sessionStats: { accuracy: 0, duration: 0, cardsTotal: 0, cardsCorrect: 0 },

  startSession: async (deckId, shuffle, resume = true) => {
    try {
      const allCards = await api.getAllCards(deckId);

      // Try to resume the saved position for this deck (auto-saved last session).
      let cards = allCards;
      let currentIndex = 0;
      let correctCount = 0;
      let baseCardCount = allCards.length;
      let isShuffled = shuffle;

      const progress = resume ? await api.getProgress(deckId).catch(() => null) : null;
      if (progress && progress.card_order.length > 0) {
        const byId = new Map(allCards.map((c) => [c.id, c]));
        const restored = progress.card_order
          .map((id) => byId.get(id))
          .filter((c): c is Card => c !== undefined);
        // Only resume if the saved order still maps to real cards and we
        // weren't already at the very end.
        if (restored.length > 0 && progress.current_index < restored.length) {
          cards = restored;
          currentIndex = Math.max(0, progress.current_index);
          correctCount = progress.correct_count;
          baseCardCount = progress.base_card_count || restored.length;
          isShuffled = progress.is_shuffled;
        } else {
          await api.clearProgress(deckId).catch(() => {});
          if (shuffle) cards = fisherYates(allCards);
        }
      } else if (shuffle) {
        cards = fisherYates(allCards);
      }

      const sessionId = crypto.randomUUID();
      set({
        cards,
        baseCardCount,
        currentIndex,
        isShuffled,
        sessionId,
        startTime: Date.now(),
        correctCount,
        isComplete: false,
        deckId,
        sessionStats: { accuracy: 0, duration: 0, cardsTotal: baseCardCount, cardsCorrect: correctCount },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      useToastStore.getState().addToast(`Failed to start session: ${msg}`, 'error');
    }
  },

  nextCard: async (quality) => {
    const { cards, currentIndex, sessionId, correctCount, startTime, baseCardCount, deckId, isShuffled } = get();
    if (!sessionId || currentIndex >= cards.length) return;

    const currentCard = cards[currentIndex];
    const isCorrect = quality >= 3;
    const newCorrectCount = correctCount + (isCorrect ? 1 : 0);
    const newIndex = currentIndex + 1;

    try {
      await api.submitReview(currentCard.id, quality, sessionId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      useToastStore.getState().addToast(`Review submit failed: ${msg}`, 'error');
    }

    // Again: re-insert card 3 positions ahead so it comes back soon
    let updatedCards = cards;
    if (quality === 1) {
      updatedCards = [...cards];
      const insertAt = Math.min(newIndex + 2, cards.length);
      updatedCards.splice(insertAt, 0, currentCard);
    }

    const isComplete = newIndex >= updatedCards.length;

    if (isComplete) {
      const duration = Date.now() - startTime;
      const accuracy = baseCardCount > 0 ? newCorrectCount / baseCardCount : 0;
      const sessionStats = {
        accuracy,
        duration,
        cardsTotal: baseCardCount,
        cardsCorrect: newCorrectCount,
      };
      try {
        await api.endSession(sessionId, newCorrectCount, baseCardCount);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        useToastStore.getState().addToast(`Session end failed: ${msg}`, 'error');
      }
      // Session finished: clear the resume point so next launch starts fresh.
      if (deckId) await api.clearProgress(deckId).catch(() => {});
      set({ cards: updatedCards, currentIndex: newIndex, correctCount: newCorrectCount, isComplete: true, sessionStats });
    } else {
      // Auto-save the resume point after every card.
      if (deckId) {
        await persistProgress(deckId, updatedCards, newIndex, newCorrectCount, baseCardCount, isShuffled);
      }
      set({ cards: updatedCards, currentIndex: newIndex, correctCount: newCorrectCount });
    }
  },

  restartSession: async () => {
    const { deckId, isShuffled } = get();
    if (deckId) {
      // Restart means start over, so drop any saved resume point first.
      await api.clearProgress(deckId).catch(() => {});
      await get().startSession(deckId, isShuffled, false);
    }
  },

  toggleShuffle: async () => {
    const { deckId, isShuffled } = get();
    const newShuffled = !isShuffled;
    set({ isShuffled: newShuffled });
    if (deckId) {
      // Changing shuffle reshuffles the deck, so the old resume point is invalid.
      await api.clearProgress(deckId).catch(() => {});
      await get().startSession(deckId, newShuffled, false);
    }
  },
}));
