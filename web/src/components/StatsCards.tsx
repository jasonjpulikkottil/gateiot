'use client';

import type { DailyStats } from '@/lib/types';

interface StatsCardProps {
  stats: DailyStats | null;
  loading: boolean;
}

const cards = [
  {
    key: 'totalEntries' as keyof DailyStats,
    label: 'Entries Today',
    icon: '↗',
    color: 'var(--green)',
    bg: 'var(--green-soft)',
  },
  {
    key: 'totalExits' as keyof DailyStats,
    label: 'Exits Today',
    icon: '↙',
    color: 'var(--accent)',
    bg: 'var(--accent-soft)',
  },
  {
    key: 'totalDenied' as keyof DailyStats,
    label: 'Denied',
    icon: '✗',
    color: 'var(--red)',
    bg: 'var(--red-soft)',
  },
  {
    key: 'presentNow' as keyof DailyStats,
    label: 'Currently In',
    icon: '●',
    color: 'var(--amber)',
    bg: 'var(--amber-soft)',
  },
  {
    key: 'avgTemp' as keyof DailyStats,
    label: 'Avg Temp (°C)',
    icon: '🌡',
    color: 'var(--amber)',
    bg: 'var(--amber-soft)',
    decimals: 1,
  },
  {
    key: 'avgHumidity' as keyof DailyStats,
    label: 'Avg Humidity (%)',
    icon: '💧',
    color: 'var(--accent)',
    bg: 'var(--accent-soft)',
    decimals: 1,
  },
];

export default function StatsCards({ stats, loading }: StatsCardProps) {
  return (
    <div className="stats-grid">
      {cards.map((card) => {
        const raw = stats?.[card.key];
        const value =
          loading || raw === undefined
            ? '—'
            : card.decimals
            ? (raw as number).toFixed(card.decimals)
            : String(raw);

        return (
          <div key={card.key} className="stat-card">
            <div
              className="stat-card__icon"
              style={{ background: card.bg, color: card.color, fontSize: '1.1rem' }}
            >
              {card.icon}
            </div>
            <div className="stat-card__value" style={{ color: card.color }}>
              {value}
            </div>
            <div className="stat-card__label">{card.label}</div>
          </div>
        );
      })}
    </div>
  );
}
