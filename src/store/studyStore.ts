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
  currentIndex: number;
  isShuffled: boolean;
  sessionId: string | null;
  startTime: number;
  correctCount: number;
  isComplete: boolean;
  deckId: string | null;
  sessionStats: SessionStats;
  startSession: (deckId: string, shuffle: boolean) => Promise<void>;
  nextCard: (quality: Quality) => Promise<void>;
  restartSession: () => Promise<void>;
  toggleShuffle: () => void;
}

export const useStudyStore = create<StudyStore>((set, get) => ({
  cards: [],
  currentIndex: 0,
  isShuffled: false,
  sessionId: null,
  startTime: 0,
  correctCount: 0,
  isComplete: false,
  deckId: null,
  sessionStats: { accuracy: 0, duration: 0, cardsTotal: 0, cardsCorrect: 0 },

  startSession: async (deckId, shuffle) => {
    try {
      let cards = await api.getAllCards(deckId);
      if (shuffle) cards = fisherYates(cards);
      const sessionId = crypto.randomUUID();
      set({
        cards,
        currentIndex: 0,
        isShuffled: shuffle,
        sessionId,
        startTime: Date.now(),
        correctCount: 0,
        isComplete: false,
        deckId,
        sessionStats: { accuracy: 0, duration: 0, cardsTotal: cards.length, cardsCorrect: 0 },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      useToastStore.getState().addToast(`Failed to start session: ${msg}`, 'error');
    }
  },

  nextCard: async (quality) => {
    const { cards, currentIndex, sessionId, correctCount, startTime } = get();
    if (!sessionId || currentIndex >= cards.length) return;

    const currentCard = cards[currentIndex];
    const isCorrect = quality >= 3;
    const newCorrectCount = correctCount + (isCorrect ? 1 : 0);
    const newIndex = currentIndex + 1;
    const isComplete = newIndex >= cards.length;

    try {
      await api.submitReview(currentCard.id, quality, sessionId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      useToastStore.getState().addToast(`Review submit failed: ${msg}`, 'error');
    }

    if (isComplete) {
      const duration = Date.now() - startTime;
      const accuracy = cards.length > 0 ? newCorrectCount / cards.length : 0;
      const sessionStats = {
        accuracy,
        duration,
        cardsTotal: cards.length,
        cardsCorrect: newCorrectCount,
      };
      try {
        await api.endSession(sessionId, newCorrectCount, cards.length);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        useToastStore.getState().addToast(`Session end failed: ${msg}`, 'error');
      }
      set({ currentIndex: newIndex, correctCount: newCorrectCount, isComplete: true, sessionStats });
    } else {
      set({ currentIndex: newIndex, correctCount: newCorrectCount });
    }
  },

  restartSession: async () => {
    const { deckId, isShuffled } = get();
    if (deckId) await get().startSession(deckId, isShuffled);
  },

  toggleShuffle: () => {
    set((state) => ({ isShuffled: !state.isShuffled }));
  },
}));
