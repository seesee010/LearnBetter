import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStudyStore } from '../studyStore';
import * as api from '../../api/tauri';

vi.mock('../../api/tauri', () => ({
  getAllCards: vi.fn().mockResolvedValue([
    { id: 'c1', front: 'Q1', back: 'A1', tags: [], created_at: 0 },
    { id: 'c2', front: 'Q2', back: 'A2', tags: [], created_at: 0 },
  ]),
  submitReview: vi.fn().mockResolvedValue({
    id: 'r1', card_id: 'c1', ease_factor: 2.5, interval: 1, repetitions: 1, due_date: 9999, last_review: 0,
  }),
  endSession: vi.fn().mockResolvedValue(undefined),
  getProgress: vi.fn().mockResolvedValue(null),
  saveProgress: vi.fn().mockResolvedValue(undefined),
  clearProgress: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../store/toastStore', () => ({
  useToastStore: { getState: () => ({ addToast: vi.fn() }) },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getProgress).mockResolvedValue(null);
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

  it('auto-saves progress after each non-final card', async () => {
    await useStudyStore.getState().startSession('deck1', false);
    await useStudyStore.getState().nextCard(4);
    expect(api.saveProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        deck_id: 'deck1',
        current_index: 1,
        correct_count: 1,
        card_order: ['c1', 'c2'],
      })
    );
  });

  it('clears progress when the session completes', async () => {
    await useStudyStore.getState().startSession('deck1', false);
    await useStudyStore.getState().nextCard(4);
    await useStudyStore.getState().nextCard(4);
    expect(useStudyStore.getState().isComplete).toBe(true);
    expect(api.clearProgress).toHaveBeenCalledWith('deck1');
  });

  it('resumes from a saved position', async () => {
    vi.mocked(api.getProgress).mockResolvedValue({
      deck_id: 'deck1',
      current_index: 1,
      correct_count: 1,
      base_card_count: 2,
      card_order: ['c2', 'c1'],
      is_shuffled: false,
    });
    await useStudyStore.getState().startSession('deck1', false);
    const state = useStudyStore.getState();
    expect(state.currentIndex).toBe(1);
    expect(state.correctCount).toBe(1);
    // Order restored exactly as saved.
    expect(state.cards.map((c) => c.id)).toEqual(['c2', 'c1']);
  });

  it('ignores stale progress whose index is past the end', async () => {
    vi.mocked(api.getProgress).mockResolvedValue({
      deck_id: 'deck1',
      current_index: 5,
      correct_count: 2,
      base_card_count: 2,
      card_order: ['c1', 'c2'],
      is_shuffled: false,
    });
    await useStudyStore.getState().startSession('deck1', false);
    expect(useStudyStore.getState().currentIndex).toBe(0);
    expect(api.clearProgress).toHaveBeenCalledWith('deck1');
  });
});
