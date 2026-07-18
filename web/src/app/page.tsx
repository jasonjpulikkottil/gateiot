'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';

import Sidebar from '@/components/Sidebar';
import StatsCards from '@/components/StatsCards';
import AttendanceTable from '@/components/AttendanceTable';
import TardinessChart from '@/components/TardinessChart';
import EnvironmentChart from '@/components/EnvironmentChart';
import EmployeeManager from '@/components/EmployeeManager';
import SettingsTab from '@/components/SettingsTab';
import ProductiveHoursTable from '@/components/ProductiveHoursTable';
import ModelTrainer from '@/components/ModelTrainer';

import type { SwipeLog, Employee, DailyStats } from '@/lib/types';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const [logs, setLogs] = useState<SwipeLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<DailyStats | null>(null);

  // ── Fetch logs ────────────────────────────────────────────
  const fetchLogs = useCallback(async (d: string) => {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/logs?date=${d}&limit=200`);
      const json = await res.json();
      const data: SwipeLog[] = json.data ?? [];
      setLogs(data);
      computeStats(data);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  // ── Compute daily stats ───────────────────────────────────
  const computeStats = (data: SwipeLog[]) => {
    const entries = data.filter((l) => l.swipe_type === 'entry' && l.granted).length;
    const exits = data.filter((l) => l.swipe_type === 'exit' && l.granted).length;
    const denied = data.filter((l) => !l.granted).length;
    const present = entries - exits;

    const withTemp = data.filter((l) => l.temperature != null);
    const withHum = data.filter((l) => l.humidity != null);

    const avgTemp = withTemp.length
      ? withTemp.reduce((s, l) => s + l.temperature!, 0) / withTemp.length
      : 0;
    const avgHumidity = withHum.length
      ? withHum.reduce((s, l) => s + l.humidity!, 0) / withHum.length
      : 0;

    setStats({ totalEntries: entries, totalExits: exits, totalDenied: denied, presentNow: Math.max(0, present), avgTemp, avgHumidity });
  };

  // ── Fetch employees ───────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    const res = await fetch('/api/employees');
    const json = await res.json();
    setEmployees(json.data ?? []);
  }, []);

  // ── Auto-refresh every 30 s ───────────────────────────────
  useEffect(() => {
    fetchLogs(date);
    fetchEmployees();
    const id = setInterval(() => fetchLogs(date), 30_000);
    return () => clearInterval(id);
  }, [date, fetchLogs, fetchEmployees]);

  // ── Page header text ─────────────────────────────────────
  const pageTitle: Record<string, string> = {
    dashboard: 'Overview',
    logs: 'Swipe Logs',
    employees: 'Employee Management',
    analytics: 'Analytics',
    settings: 'Security Settings',
  };


  return (
    <div className="app-shell">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="main-content">
        {/* Top bar */}
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: 28 }}
        >
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em' }}>
              {pageTitle[activeTab]}
            </h1>
            <p className="text-secondary" style={{ fontSize: '0.82rem', marginTop: 2 }}>
              GateIoT RFID Attendance System
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab !== 'settings' && (
              <>
                <input
                  id="date-picker"
                  className="input"
                  type="date"
                  value={date}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ width: 160 }}
                />
                <button
                  id="refresh-btn"
                  className="btn btn--ghost"
                  onClick={() => { fetchLogs(date); fetchEmployees(); }}
                >
                  ↺ Refresh
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── DASHBOARD TAB ─────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <>
            <StatsCards stats={stats} loading={logsLoading} />
            <div className="grid-2" style={{ marginBottom: 24 }}>
              <TardinessChart logs={logs} />
              <EnvironmentChart logs={logs} />
            </div>
            <div className="section-title">
              Recent Swipes
              <span className="section-title__sub">Last {logs.length} events</span>
            </div>
            <AttendanceTable logs={logs.slice(0, 10)} loading={logsLoading} />

            <div className="section-title" style={{ marginTop: 32 }}>
              Daily Productive Hours
              <span className="section-title__sub">Hours calculated from entry to exit for {date}</span>
            </div>
            <ProductiveHoursTable employees={employees} logs={logs} selectedDate={date} loading={logsLoading} />
          </>
        )}

        {/* ── LOGS TAB ──────────────────────────────────── */}
        {activeTab === 'logs' && (
          <>
            <StatsCards stats={stats} loading={logsLoading} />
            <div className="section-title">
              All Swipe Events
              <span className="section-title__sub">{logs.length} records on {date}</span>
            </div>
            <AttendanceTable logs={logs} loading={logsLoading} />
          </>
        )}

        {/* ── ANALYTICS TAB ────────────────────────────── */}
        {activeTab === 'analytics' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <TardinessChart logs={logs} />
            </div>
            <EnvironmentChart logs={logs} />
          </>
        )}

        {/* ── EMPLOYEES TAB ────────────────────────────── */}
        {activeTab === 'employees' && (
          <EmployeeManager employees={employees} onRefresh={fetchEmployees} />
        )}

        {/* ── ML TRAINER TAB ───────────────────────────── */}
        {activeTab === 'model' && (
          <ModelTrainer employees={employees} logs={logs} />
        )}

        {/* ── SETTINGS TAB ─────────────────────────────── */}
        {activeTab === 'settings' && (
          <SettingsTab />
        )}
      </main>
    </div>
  );
}
