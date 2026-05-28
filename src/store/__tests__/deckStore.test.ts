import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDeckStore } from '../deckStore';

vi.mock('../../api/tauri', () => ({
  getDecks: vi.fn().mockResolvedValue([
    { id: 'd1', name: '2024-01-01', date_created: '2024-01-01', card_count: 5, due_count: 3 },
  ]),
  getDeck: vi.fn().mockResolvedValue({ id: 'd1', name: '2024-01-01', date_created: '2024-01-01', cards: [] }),
  importFile: vi.fn().mockResolvedValue({
    id: 'd1', name: '2024-01-01', date_created: '2024-01-01',
    cards: [{ id: 'c1', front: 'Q', back: 'A', tags: [], created_at: 0 }],
  }),
  deleteDeck: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  useDeckStore.setState({ decks: [], currentDeck: null, loading: false, error: null });
});

describe('deckStore', () => {
  it('fetchDecks populates decks', async () => {
    await useDeckStore.getState().fetchDecks();
    expect(useDeckStore.getState().decks).toHaveLength(1);
    expect(useDeckStore.getState().decks[0].id).toBe('d1');
  });

  it('fetchDeck sets currentDeck', async () => {
    await useDeckStore.getState().fetchDeck('d1');
    expect(useDeckStore.getState().currentDeck?.id).toBe('d1');
  });

  it('importFile updates decks state', async () => {
    const result = await useDeckStore.getState().importFile('/path/to/file.json');
    expect(result).not.toBeNull();
    expect(useDeckStore.getState().decks).toHaveLength(1);
  });
});
