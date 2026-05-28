import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeckStore } from '../../store/deckStore';
import LoadingSpinner from '../ui/LoadingSpinner';
import type { DeckSummary } from '../../types';

interface Props { onOpenImport: () => void; }

function DeckCard({ deck, onStudy, onImport, onDelete }: {
  deck: DeckSummary;
  onStudy: () => void;
  onImport: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="card deck-card">
      <div className="deck-card__header">
        <div>
          <div className="deck-card__name">{deck.name}</div>
          <div className="deck-card__meta">
            {deck.card_count} cards
            {deck.due_count > 0 && (
              <span className="deck-card__due">{deck.due_count} due</span>
            )}
          </div>
        </div>
        <div className="deck-card__actions">
          <button className="icon-btn" onClick={onImport} title="Edit / Import">
            <EditIcon />
          </button>
          <button className="icon-btn icon-btn--primary" onClick={onStudy} title="Study">
            <PlayIcon />
          </button>
          <button className="icon-btn icon-btn--danger" onClick={onDelete} title="Delete">
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DeckBrowser({ onOpenImport }: Props) {
  const navigate = useNavigate();
  const { decks, loading, fetchDecks, deleteDeck } = useDeckStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { fetchDecks(); }, [fetchDecks]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this deck?')) return;
    setDeletingId(id);
    await deleteDeck(id);
    setDeletingId(null);
  };

  return (
    <div className="page">
      <div className="deck-browser__header">
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>Your Decks</h1>
        <button className="btn" onClick={onOpenImport}>+ New Deck</button>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-xl)' }}>
          <LoadingSpinner size={40} />
        </div>
      )}

      {!loading && decks.length === 0 && (
        <div className="deck-browser__empty">
          <div className="deck-browser__empty-icon">
            <EmptyIcon />
          </div>
          <h2>No decks yet</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
            Import a flashcard file to get started
          </p>
          <button className="btn" onClick={onOpenImport}>Import File</button>
        </div>
      )}

      <div className="deck-grid">
        {decks.map((deck) => (
          <DeckCard
            key={deck.id}
            deck={deck}
            onStudy={() => navigate(`/study/${deck.id}`)}
            onImport={onOpenImport}
            onDelete={() => handleDelete(deck.id)}
          />
        ))}
      </div>

      <style>{`
        .deck-browser__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-lg); }
        .deck-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--spacing-md); }
        .deck-card__header { display: flex; justify-content: space-between; align-items: flex-start; }
        .deck-card__name { font-size: var(--font-size-lg); font-weight: 600; margin-bottom: var(--spacing-xs); }
        .deck-card__meta { font-size: var(--font-size-sm); color: var(--text-secondary); display: flex; align-items: center; gap: var(--spacing-sm); }
        .deck-card__due { background: var(--accent); color: #fff; padding: 2px 8px; border-radius: var(--border-radius-sm); font-size: 11px; font-weight: 600; }
        .deck-card__actions { display: flex; gap: var(--spacing-xs); }
        .icon-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: var(--border-radius-sm); color: var(--text-secondary); transition: background 0.15s, color 0.15s; }
        .icon-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }
        .icon-btn--primary:hover { color: var(--accent); }
        .icon-btn--danger:hover { color: #ef4444; }
        .deck-browser__empty { text-align: center; padding: var(--spacing-xl); }
        .deck-browser__empty-icon { font-size: 64px; margin-bottom: var(--spacing-md); opacity: 0.3; }
        .deck-browser__empty h2 { font-size: var(--font-size-xl); margin-bottom: var(--spacing-sm); }
      `}</style>
    </div>
  );
}

const PlayIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const EditIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>;
const EmptyIcon = () => <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>;
