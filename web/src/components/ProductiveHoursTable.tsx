'use client';

import type { SwipeLog, Employee } from '@/lib/types';
import { format } from 'date-fns';
import { Clock, CheckCircle2, AlertTriangle, Play } from 'lucide-react';

interface ProductiveHoursTableProps {
  employees: Employee[];
  logs: SwipeLog[];
  selectedDate: string;
  loading: boolean;
}

export default function ProductiveHoursTable({ employees, logs, selectedDate, loading }: ProductiveHoursTableProps) {
  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48 }}>
        Calculating productive hours...
      </div>
    );
  }

  const isToday = format(new Date(), 'yyyy-MM-dd') === selectedDate;

  const rows = employees.map((emp) => {
    // Filter and sort logs for this employee
    const empLogs = logs.filter((l) => l.employee_id === emp.id && l.granted);
    
    const entryLog = empLogs
      .filter((l) => l.swipe_type === 'entry')
      .sort((a, b) => new Date(a.swiped_at).getTime() - new Date(b.swiped_at).getTime())[0];

    const exitLog = empLogs
      .filter((l) => l.swipe_type === 'exit')
      .sort((a, b) => new Date(b.swiped_at).getTime() - new Date(a.swiped_at).getTime())[0];

    let checkIn = '—';
    let checkOut = '—';
    let duration = '—';
    let status: 'Absent' | 'Active' | 'Completed' | 'Missing Checkout' = 'Absent';

    if (entryLog) {
      checkIn = format(new Date(entryLog.swiped_at), 'HH:mm:ss');
      
      if (exitLog) {
        checkOut = format(new Date(exitLog.swiped_at), 'HH:mm:ss');
        const entryTime = new Date(entryLog.swiped_at);
        const exitTime = new Date(exitLog.swiped_at);
        const diffMs = exitTime.getTime() - entryTime.getTime();
        
        if (diffMs > 0) {
          const totalMinutes = Math.floor(diffMs / 60000);
          const h = Math.floor(totalMinutes / 60);
          const m = totalMinutes % 60;
          duration = `${h}h ${m}m`;
          status = 'Completed';
        } else {
          duration = '0h 0m';
          status = 'Completed';
        }
      } else {
        // Entry but no exit
        if (isToday) {
          const entryTime = new Date(entryLog.swiped_at);
          const diffMs = new Date().getTime() - entryTime.getTime();
          const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
          const h = Math.floor(totalMinutes / 60);
          const m = totalMinutes % 60;
          duration = `${h}h ${m}m`;
          status = 'Active';
        } else {
          duration = '—';
          status = 'Missing Checkout';
        }
      }
    }

    return {
      employee: emp,
      checkIn,
      checkOut,
      duration,
      status,
    };
  });

  const statusBadge = (status: 'Absent' | 'Active' | 'Completed' | 'Missing Checkout') => {
    switch (status) {
      case 'Completed':
        return (
          <span className="badge" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
            <CheckCircle2 size={12} style={{ marginRight: 4 }} /> Completed
          </span>
        );
      case 'Active':
        return (
          <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            <Play size={12} style={{ marginRight: 4 }} /> Clocked In
          </span>
        );
      case 'Missing Checkout':
        return (
          <span className="badge" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>
            <AlertTriangle size={12} style={{ marginRight: 4 }} /> Missing Exit
          </span>
        );
      case 'Absent':
        return (
          <span className="badge" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>
            Absent
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="table-wrapper">
      <table style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Department</th>
            <th>Shift Schedule</th>
            <th>Check In</th>
            <th>Check Out</th>
            <th>Total Productive Hours</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.employee.id}>
              <td>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600 }}>{row.employee.name}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{row.employee.email || 'No email'}</span>
                </div>
              </td>
              <td className="text-secondary">{row.employee.department || '—'}</td>
              <td className="text-secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {row.employee.shift_start} – {row.employee.shift_end}
              </td>
              <td style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                {row.checkIn}
              </td>
              <td style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                {row.checkOut}
              </td>
              <td style={{ fontWeight: 600, color: row.status === 'Completed' || row.status === 'Active' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {(row.status === 'Completed' || row.status === 'Active') && (
                    <Clock size={14} color="var(--accent)" />
                  )}
                  {row.duration}
                </div>
              </td>
              <td>{statusBadge(row.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
