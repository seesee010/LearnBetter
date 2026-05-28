import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStudyStore } from '../studyStore';

vi.mock('../../api/tauri', () => ({
  getAllCards: vi.fn().mockResolvedValue([
    { id: 'c1', front: 'Q1', back: 'A1', tags: [], created_at: 0 },
    { id: 'c2', front: 'Q2', back: 'A2', tags: [], created_at: 0 },
  ]),
  submitReview: vi.fn().mockResolvedValue({
    id: 'r1', card_id: 'c1', ease_factor: 2.5, interval: 1, repetitions: 1, due_date: 9999, last_review: 0,
  }),
  endSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../store/toastStore', () => ({
  useToastStore: { getState: () => ({ addToast: vi.fn() }) },
}));

beforeEach(() => {
  useStudyStore.setState({
    cards: [], currentIndex: 0, isShuffled: false, sessionId: null,
    startTime: 0, correctCount: 0, isComplete: false, deckId: null,
    sessionStats: { accuracy: 0, duration: 0, cardsTotal: 0, cardsCorrect: 0 },
  });
});

describe('studyStore', () => {
  it('startSession loads cards', async () => {
    await useStudyStore.getState().startSession('deck1', false);
    expect(useStudyStore.getState().cards).toHaveLength(2);
    expect(useStudyStore.getState().currentIndex).toBe(0);
    expect(useStudyStore.getState().isComplete).toBe(false);
    expect(useStudyStore.getState().sessionId).not.toBeNull();
  });

  it('nextCard advances index', async () => {
    await useStudyStore.getState().startSession('deck1', false);
    await useStudyStore.getState().nextCard(4);
    expect(useStudyStore.getState().currentIndex).toBe(1);
  });

  it('correct answer increments correctCount', async () => {
    await useStudyStore.getState().startSession('deck1', false);
    await useStudyStore.getState().nextCard(4); // quality 4 = correct
    expect(useStudyStore.getState().correctCount).toBe(1);
  });

  it('wrong answer does not increment correctCount', async () => {
    await useStudyStore.getState().startSession('deck1', false);
    await useStudyStore.getState().nextCard(1); // quality 1 = wrong
    expect(useStudyStore.getState().correctCount).toBe(0);
  });

  it('isComplete true after last card', async () => {
    await useStudyStore.getState().startSession('deck1', false);
    await useStudyStore.getState().nextCard(4);
    await useStudyStore.getState().nextCard(4);
    expect(useStudyStore.getState().isComplete).toBe(true);
  });

  it('sessionStats computed correctly', async () => {
    await useStudyStore.getState().startSession('deck1', false);
    await useStudyStore.getState().nextCard(4); // correct
    await useStudyStore.getState().nextCard(1); // wrong
    const { sessionStats } = useStudyStore.getState();
    expect(sessionStats.cardsTotal).toBe(2);
    expect(sessionStats.cardsCorrect).toBe(1);
    expect(sessionStats.accuracy).toBe(0.5);
  });
});
