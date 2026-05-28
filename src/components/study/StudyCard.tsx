import { useState, useEffect, useCallback } from 'react';
import type { Card, Quality } from '../../types';

interface Props {
  card: Card;
  onRate: (quality: Quality) => void;
}

export default function StudyCard({ card, onRate }: Props) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => { setFlipped(false); }, [card.id]);

  const flip = useCallback(() => setFlipped(true), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); if (!flipped) flip(); }
      if (flipped) {
        if (e.key === '1') onRate(0);
        if (e.key === '2') onRate(2);
        if (e.key === '3') onRate(3);
        if (e.key === '4') onRate(4);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flipped, flip, onRate]);

  return (
    <div className="study-card-wrapper">
      <div className={`study-card${flipped ? ' study-card--flipped' : ''}`} onClick={!flipped ? flip : undefined}>
        <div className="study-card__inner">
          <div className="study-card__face study-card__front">
            <div className="study-card__label">Question</div>
            <div className="study-card__text">{card.front}</div>
            {!flipped && <div className="study-card__hint">Click or press Space to reveal</div>}
          </div>
          <div className="study-card__face study-card__back">
            <div className="study-card__label">Answer</div>
            <div className="study-card__text">{card.back}</div>
          </div>
        </div>
      </div>

      {flipped && (
        <div className="rating-buttons">
          <button className="rating-btn rating-btn--again" onClick={() => onRate(0)}>
            <span>Again</span><kbd>1</kbd>
          </button>
          <button className="rating-btn rating-btn--hard" onClick={() => onRate(2)}>
            <span>Hard</span><kbd>2</kbd>
          </button>
          <button className="rating-btn rating-btn--good" onClick={() => onRate(3)}>
            <span>Good</span><kbd>3</kbd>
          </button>
          <button className="rating-btn rating-btn--easy" onClick={() => onRate(4)}>
            <span>Easy</span><kbd>4</kbd>
          </button>
        </div>
      )}

      <style>{`
        .study-card-wrapper { display: flex; flex-direction: column; align-items: center; gap: var(--spacing-lg); width: 100%; }
        .study-card { width: 100%; max-width: 640px; height: 320px; perspective: 1200px; cursor: pointer; }
        .study-card--flipped { cursor: default; }
        .study-card__inner {
          position: relative; width: 100%; height: 100%;
          transform-style: preserve-3d;
          transition: transform 0.45s cubic-bezier(0.4,0,0.2,1);
        }
        .study-card--flipped .study-card__inner { transform: rotateY(180deg); }
        .study-card__face {
          position: absolute; inset: 0;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--border-radius-lg);
          box-shadow: var(--shadow-md);
          backface-visibility: hidden;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: var(--spacing-xl);
          text-align: center;
        }
        .study-card__back { transform: rotateY(180deg); background: var(--bg-tertiary); }
        .study-card__label { font-size: var(--font-size-sm); color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: var(--spacing-md); }
        .study-card__text { font-size: var(--font-size-xl); font-weight: 600; line-height: 1.4; color: var(--text-primary); }
        .study-card__hint { margin-top: var(--spacing-md); font-size: var(--font-size-sm); color: var(--text-muted); }
        .rating-buttons { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; justify-content: center; animation: slideUp 0.2s ease; }
        .rating-btn {
          display: flex; align-items: center; gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-lg);
          border-radius: var(--border-radius-md); font-weight: 600;
          font-size: var(--font-size-base); color: #fff;
          transition: opacity 0.15s, transform 0.1s;
          min-width: 100px; justify-content: center;
        }
        .rating-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .rating-btn--again { background: #ef4444; }
        .rating-btn--hard { background: #f97316; }
        .rating-btn--good { background: #22c55e; }
        .rating-btn--easy { background: #3b82f6; }
        kbd { background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 3px; font-size: 11px; font-family: monospace; }
      `}</style>
    </div>
  );
}
