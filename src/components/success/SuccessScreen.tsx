import { useNavigate, useParams } from 'react-router-dom';
import { useStudyStore } from '../../store/studyStore';

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export default function SuccessScreen() {
  const navigate = useNavigate();
  const { deckId } = useParams<{ deckId: string }>();
  const { sessionStats, restartSession } = useStudyStore();
  const { accuracy, duration, cardsTotal, cardsCorrect } = sessionStats;
  const pct = Math.round(accuracy * 100);

  const handleRestart = async () => {
    if (deckId) await restartSession();
    navigate(`/study/${deckId}`);
  };

  return (
    <div className="success-screen">
      <div className="success-card" style={{ animation: 'fadeIn 0.4s ease' }}>
        <div className="success-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" stroke="var(--accent)" strokeWidth="1.5"/>
            <polyline points="9 12 11 14 15 10" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-sm)' }}>
          Session Complete!
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xl)' }}>
          Great job — you've reviewed all cards.
        </p>

        <div className="success-stats">
          <div className="success-stat">
            <div className="success-stat__value">{cardsTotal}</div>
            <div className="success-stat__label">Cards Reviewed</div>
          </div>
          <div className="success-stat">
            <div className="success-stat__value">{cardsCorrect}</div>
            <div className="success-stat__label">Correct</div>
          </div>
          <div className="success-stat">
            <div className="success-stat__value" style={{ color: pct >= 80 ? '#22c55e' : pct >= 60 ? '#f97316' : '#ef4444' }}>
              {pct}%
            </div>
            <div className="success-stat__label">Accuracy</div>
          </div>
          <div className="success-stat">
            <div className="success-stat__value">{formatDuration(duration)}</div>
            <div className="success-stat__label">Time</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center' }}>
          <button className="btn btn--ghost" onClick={() => navigate('/')}>← Back to Decks</button>
          <button className="btn" onClick={handleRestart}>Restart Session</button>
        </div>
      </div>

      <style>{`
        .success-screen {
          min-height: 100vh; background: var(--bg-primary);
          display: flex; align-items: center; justify-content: center; padding: var(--spacing-lg);
        }
        .success-card {
          background: var(--bg-secondary); border: 1px solid var(--border);
          border-radius: var(--border-radius-lg); box-shadow: var(--shadow-md);
          padding: var(--spacing-xl); text-align: center; max-width: 500px; width: 100%;
        }
        .success-icon { margin-bottom: var(--spacing-lg); }
        .success-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--spacing-md); margin-bottom: var(--spacing-xl); }
        .success-stat { padding: var(--spacing-md); background: var(--bg-tertiary); border-radius: var(--border-radius-md); }
        .success-stat__value { font-size: var(--font-size-xl); font-weight: 700; margin-bottom: var(--spacing-xs); color: var(--text-primary); }
        .success-stat__label { font-size: var(--font-size-sm); color: var(--text-secondary); }
        @media (max-width: 480px) { .success-stats { grid-template-columns: repeat(2, 1fr); } }
      `}</style>
    </div>
  );
}
