import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DeckBrowser from '../deck/DeckBrowser';
import { useDeckStore } from '../../store/deckStore';

vi.mock('../../store/deckStore', () => ({ useDeckStore: vi.fn() }));

const mockDecks = [
  { id: 'd1', name: '2024-01-15', date_created: '2024-01-15', card_count: 10, due_count: 3 },
];

describe('DeckBrowser', () => {
  beforeEach(() => {
    (useDeckStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      decks: mockDecks, loading: false, error: null,
      fetchDecks: vi.fn(), deleteDeck: vi.fn(),
    });
  });

  it('renders deck name', () => {
    render(<MemoryRouter><DeckBrowser onOpenImport={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText('2024-01-15')).toBeInTheDocument();
  });

  it('shows empty state when no decks', () => {
    (useDeckStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      decks: [], loading: false, error: null,
      fetchDecks: vi.fn(), deleteDeck: vi.fn(),
    });
    render(<MemoryRouter><DeckBrowser onOpenImport={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText(/No decks yet/i)).toBeInTheDocument();
  });

  it('shows loading spinner', () => {
    (useDeckStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      decks: [], loading: true, error: null,
      fetchDecks: vi.fn(), deleteDeck: vi.fn(),
    });
    render(<MemoryRouter><DeckBrowser onOpenImport={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
