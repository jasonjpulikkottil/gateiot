'use client';

import type { SwipeLog } from '@/lib/types';
import { format } from 'date-fns';

interface AttendanceTableProps {
  logs: SwipeLog[];
  loading: boolean;
}

const badgeClass: Record<string, string> = {
  entry:   'badge--entry',
  exit:    'badge--exit',
  denied:  'badge--denied',
  unknown: 'badge--unknown',
};

const badgeIcon: Record<string, string> = {
  entry:   '↗',
  exit:    '↙',
  denied:  '✗',
  unknown: '?',
};

export default function AttendanceTable({ logs, loading }: AttendanceTableProps) {
  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48 }}>
        Loading logs…
      </div>
    );
  }

  if (!logs.length) {
    return (
      <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48 }}>
        No swipe events found for this date.
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Employee</th>
            <th>Department</th>
            <th>Card UID</th>
            <th>Type</th>
            <th>Temp (°C)</th>
            <th>Humidity (%)</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                {format(new Date(log.swiped_at), 'HH:mm:ss')}
              </td>
              <td style={{ fontWeight: 600 }}>
                {log.employees?.name ?? (
                  <span className="text-muted">Unknown</span>
                )}
              </td>
              <td className="text-secondary">{log.employees?.department ?? '—'}</td>
              <td>
                <code style={{ fontSize: '0.78rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                  {log.card_uid}
                </code>
              </td>
              <td>
                <span className={`badge ${badgeClass[log.swipe_type] ?? 'badge--unknown'}`}>
                  {badgeIcon[log.swipe_type]} {log.swipe_type}
                </span>
              </td>
              <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                {log.temperature != null ? log.temperature.toFixed(1) : '—'}
              </td>
              <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                {log.humidity != null ? log.humidity.toFixed(1) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
