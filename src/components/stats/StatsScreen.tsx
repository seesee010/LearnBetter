import { useEffect } from 'react';
import { useStatsStore } from '../../store/statsStore';
import LoadingSpinner from '../ui/LoadingSpinner';
import type { DailyStats } from '../../types';

function BarChart({ sessions }: { sessions: DailyStats[] }) {
  const max = Math.max(...sessions.map((s) => Number(s.count)), 1);
  return (
    <div className="bar-chart">
      <svg viewBox={`0 0 ${sessions.length * 30} 80`} className="bar-chart__svg" preserveAspectRatio="none">
        {sessions.map((s, i) => {
          const h = Math.max((Number(s.count) / max) * 60, s.count ? 4 : 0);
          const x = i * 30 + 5;
          return (
            <g key={s.date}>
              <rect x={x} y={80 - h - 16} width={20} height={h} fill="var(--accent)" rx="2" opacity="0.85"/>
              {s.count > 0 && (
                <text x={x + 10} y={80 - h - 20} textAnchor="middle" fontSize="8" fill="var(--text-secondary)">{s.count}</text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="bar-chart__labels">
        {sessions.map((s) => (
          <div key={s.date} className="bar-chart__label">
            {s.date.slice(5)} {/* MM-DD */}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StatsScreen() {
  const { stats, loading, fetchStats } = useStatsStore();

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-xl)' }}>
      <LoadingSpinner size={40} />
    </div>
  );

  if (!stats) return <div className="page"><p style={{ color: 'var(--text-secondary)' }}>No stats yet. Study some cards first!</p></div>;

  return (
    <div className="page">
      <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>Statistics</h1>

      <div className="stats-hero">
        {[
          { value: stats.total_studied.toString(), label: 'Total Studied' },
          { value: `${stats.streak_days}d`, label: 'Streak' },
          { value: `${Math.round(stats.correct_ratio * 100)}%`, label: 'Accuracy' },
          { value: stats.cards_due_today.toString(), label: 'Due Today' },
        ].map(({ value, label }) => (
          <div key={label} className="stats-hero__item card">
            <div className="stats-hero__value">{value}</div>
            <div className="stats-hero__label">{label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 'var(--spacing-lg)', overflowX: 'auto' }}>
        <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-md)' }}>Last 14 Days</h2>
        <BarChart sessions={stats.sessions} />
      </div>

      <style>{`
        .stats-hero { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--spacing-md); }
        .stats-hero__item { text-align: center; }
        .stats-hero__value { font-size: var(--font-size-xl); font-weight: 700; color: var(--accent); margin-bottom: var(--spacing-xs); }
        .stats-hero__label { font-size: var(--font-size-sm); color: var(--text-secondary); }
        .bar-chart { width: 100%; overflow-x: auto; }
        .bar-chart__svg { display: block; width: 100%; min-width: 420px; height: 80px; }
        .bar-chart__labels { display: flex; min-width: 420px; }
        .bar-chart__label { flex: 1; text-align: center; font-size: 9px; color: var(--text-muted); padding-top: 4px; }
        @media (max-width: 640px) { .stats-hero { grid-template-columns: repeat(2, 1fr); } }
      `}</style>
    </div>
  );
}
