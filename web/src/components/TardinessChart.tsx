'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import type { SwipeLog } from '@/lib/types';
import { format } from 'date-fns';

interface TardinessChartProps {
  logs: SwipeLog[];
}

interface ChartPoint {
  time: string;
  arrivalMinutes: number | null;  // minutes after midnight
  shiftStartMinutes: number | null;
  lateBy: number | null;          // positive = late
  name: string;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export default function TardinessChart({ logs }: TardinessChartProps) {
  const points: ChartPoint[] = logs
    .filter((l) => l.swipe_type === 'entry' && l.granted && l.employees?.shift_start)
    .map((l) => {
      const arr = new Date(l.swiped_at);
      const arrMin = arr.getHours() * 60 + arr.getMinutes();
      const shiftMin = timeToMinutes(l.employees!.shift_start!);
      return {
        time: format(arr, 'HH:mm'),
        arrivalMinutes: arrMin,
        shiftStartMinutes: shiftMin,
        lateBy: arrMin - shiftMin,
        name: l.employees?.name ?? 'Unknown',
      };
    });

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: ChartPoint }[] }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const lateBy = d.lateBy ?? 0;
    return (
      <div className="card" style={{ padding: 12, minWidth: 180 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.name}</div>
        <div className="text-secondary" style={{ fontSize: '0.8rem' }}>Arrival: {d.time}</div>
        <div
          style={{
            fontSize: '0.8rem',
            color: lateBy > 0 ? 'var(--red)' : 'var(--green)',
            marginTop: 4,
            fontWeight: 600,
          }}
        >
          {lateBy > 0 ? `${lateBy} min late` : `${Math.abs(lateBy)} min early`}
        </div>
      </div>
    );
  };

  if (!points.length) {
    return (
      <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
        No entry events to plot yet.
      </div>
    );
  }

  return (
    <div className="card">
      <div className="section-title" style={{ marginBottom: 20 }}>
        <span>⏰</span> Arrival vs. Shift Start
        <span className="section-title__sub">Minutes relative to shift start time</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={points} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}m`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
          <ReferenceLine y={0} stroke="var(--amber)" strokeDasharray="4 4" label={{ value: 'On time', fill: 'var(--amber)', fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="lateBy"
            name="Late/Early (min)"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 5, fill: 'var(--accent)', stroke: 'var(--bg-base)', strokeWidth: 2 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
