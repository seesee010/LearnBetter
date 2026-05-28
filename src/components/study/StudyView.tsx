import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudyStore } from '../../store/studyStore';
import { useSettingsStore } from '../../store/settingsStore';
import LoadingSpinner from '../ui/LoadingSpinner';
import StudyCard from './StudyCard';
import type { Quality } from '../../types';

export default function StudyView() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const shuffleDefault = useSettingsStore((s) => s.settings.shuffle_default);
  const { cards, currentIndex, isShuffled, isComplete, startSession, nextCard, toggleShuffle } = useStudyStore();

  useEffect(() => {
    if (deckId) startSession(deckId, shuffleDefault);
  }, [deckId, shuffleDefault, startSession]);

  useEffect(() => {
    if (isComplete && deckId) navigate(`/success/${deckId}`);
  }, [isComplete, deckId, navigate]);

  if (cards.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <LoadingSpinner size={48} />
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = (currentIndex / cards.length) * 100;

  return (
    <div className="study-view">
      <div className="study-view__header">
        <button className="btn btn--ghost" onClick={() => navigate('/')}>← Back</button>
        <div className="study-view__progress-text">Card {currentIndex + 1} of {cards.length}</div>
        <button
          className={`btn btn--ghost${isShuffled ? ' btn--active' : ''}`}
          onClick={toggleShuffle}
          title="Toggle shuffle"
          style={{ color: isShuffled ? 'var(--accent)' : undefined }}
        >
          ⇄ Shuffle
        </button>
      </div>

      <div className="study-view__progress">
        <div className="study-view__progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <div className="study-view__card-area">
        {currentCard && (
          <StudyCard
            card={currentCard}
            onRate={(q: Quality) => nextCard(q)}
          />
        )}
      </div>

      <style>{`
        .study-view { display: flex; flex-direction: column; height: 100vh; background: var(--bg-primary); }
        .study-view__header {
          display: flex; align-items: center; justify-content: space-between;
          padding: var(--spacing-md) var(--spacing-lg);
          border-bottom: 1px solid var(--border);
        }
        .study-view__progress-text { font-size: var(--font-size-sm); color: var(--text-secondary); }
        .study-view__progress { height: 3px; background: var(--border); }
        .study-view__progress-bar { height: 100%; background: var(--accent); transition: width 0.3s ease; }
        .study-view__card-area {
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding: var(--spacing-xl) var(--spacing-lg);
        }
        .btn--active { border-color: var(--accent); }
      `}</style>
    </div>
  );
}
