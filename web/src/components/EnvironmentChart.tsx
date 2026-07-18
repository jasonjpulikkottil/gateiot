'use client';

import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { SwipeLog } from '@/lib/types';
import { format } from 'date-fns';

interface EnvironmentChartProps {
  logs: SwipeLog[];
}

interface EnvPoint {
  time: string;
  temp: number | null;
  humidity: number | null;
}

export default function EnvironmentChart({ logs }: EnvironmentChartProps) {
  const points: EnvPoint[] = logs
    .filter((l) => l.temperature != null || l.humidity != null)
    .map((l) => ({
      time: format(new Date(l.swiped_at), 'HH:mm'),
      temp: l.temperature,
      humidity: l.humidity,
    }))
    .reverse(); // oldest → newest

  if (!points.length) {
    return (
      <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
        No sensor data yet.
      </div>
    );
  }

  return (
    <div className="card">
      <div className="section-title" style={{ marginBottom: 20 }}>
        <span>🌡</span> Environmental Conditions
        <span className="section-title__sub">DHT11 readings at each swipe event</span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={points} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
          <YAxis yAxisId="temp" domain={[0, 50]} tick={{ fill: 'var(--amber)', fontSize: 11 }} tickFormatter={(v) => `${v}°`} />
          <YAxis yAxisId="hum" orientation="right" domain={[0, 100]} tick={{ fill: 'var(--accent)', fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              color: 'var(--text-primary)',
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
          <Bar yAxisId="hum" dataKey="humidity" name="Humidity (%)" fill="var(--accent)" opacity={0.35} radius={[2, 2, 0, 0]} />
          <Line yAxisId="temp" type="monotone" dataKey="temp" name="Temp (°C)" stroke="var(--amber)" strokeWidth={2} dot={{ r: 4, fill: 'var(--amber)' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
