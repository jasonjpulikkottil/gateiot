'use client';

import { useActionState, useState, useEffect } from 'react';
import { updatePassword } from '../app/actions/auth';
import { KeyRound, ShieldAlert, CheckCircle2, Clock, Settings } from 'lucide-react';

export default function SettingsTab() {
  const [state, action, isPending] = useActionState(updatePassword, undefined);

  // Gate time restriction states
  const [entryStart, setEntryStart] = useState('08:00');
  const [entryEnd, setEntryEnd] = useState('10:00');
  const [exitStart, setExitStart] = useState('15:00');
  const [exitEnd, setExitEnd] = useState('17:00');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load current settings from DB on mount
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.entry_start) setEntryStart(data.entry_start);
        if (data.entry_end) setEntryEnd(data.entry_end);
        if (data.exit_start) setExitStart(data.exit_start);
        if (data.exit_end) setExitEnd(data.exit_end);
        if (data.timezone) setTimezone(data.timezone);
      })
      .catch((err) => console.error('Failed to load settings', err));
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_start: entryStart,
          entry_end: entryEnd,
          exit_start: exitStart,
          exit_end: exitEnd,
          timezone,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage({ type: 'success', text: 'Time restrictions updated successfully!' });
      } else {
        setSaveMessage({ type: 'error', text: data.error || 'Failed to save settings.' });
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to save settings due to a network error.' });
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '600px', margin: '0 auto', marginTop: '2rem', paddingBottom: '3rem' }}>
      
      {/* ── CARD 1: SECURITY SETTINGS ─────────────────────────────── */}
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <div style={{ padding: '8px', background: 'var(--bg-hover)', borderRadius: '8px' }}>
            <KeyRound size={24} color="var(--primary)" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>Security Settings</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Update your administrator password</p>
          </div>
        </div>

        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="settingsUsername" style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Administrator Username</label>
            <input
              id="settingsUsername"
              type="text"
              readOnly
              value="admin"
              style={{
                padding: '10px 14px',
                background: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-muted)',
                fontSize: '0.95rem',
                cursor: 'not-allowed'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="currentPassword" style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Current Password</label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              placeholder="Enter current password"
              style={{
                padding: '10px 14px',
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '0.95rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="newPassword" style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>New Password</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              placeholder="Enter new password"
              style={{
                padding: '10px 14px',
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '0.95rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="confirmPassword" style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Confirm New Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              placeholder="Confirm new password"
              style={{
                padding: '10px 14px',
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '0.95rem'
              }}
            />
          </div>

          {state?.error && (
            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fca5a5', fontSize: '0.9rem' }}>
              <ShieldAlert size={18} />
              {state.error}
            </div>
          )}

          {state?.success && (
            <div style={{ padding: '12px', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: '#6ee7b7', fontSize: '0.9rem' }}>
              <CheckCircle2 size={18} />
              {state.success}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            style={{
              padding: '12px',
              background: 'var(--primary)',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.7 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {isPending ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* ── CARD 2: GATE GATEWAY RESTRICTIONS ────────────────────── */}
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <div style={{ padding: '8px', background: 'var(--bg-hover)', borderRadius: '8px' }}>
            <Clock size={24} color="var(--accent)" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>Gate Restrictions</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Configure allowed entry & exit time windows</p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Timezone */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="timezone" style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>System Timezone</label>
            <input
              id="timezone"
              type="text"
              required
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="e.g. Asia/Kolkata"
              style={{
                padding: '10px 14px',
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '0.95rem'
              }}
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Uses regional time zone lookup values for current hour validation.</span>
          </div>

          {/* Entry Window Grid */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 10px 0' }}>Allowed Entry Range</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="entryStart" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Start Time</label>
                <input
                  id="entryStart"
                  type="time"
                  required
                  value={entryStart}
                  onChange={(e) => setEntryStart(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="entryEnd" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>End Time</label>
                <input
                  id="entryEnd"
                  type="time"
                  required
                  value={entryEnd}
                  onChange={(e) => setEntryEnd(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Exit Window Grid */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 10px 0' }}>Allowed Exit Range</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="exitStart" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Start Time</label>
                <input
                  id="exitStart"
                  type="time"
                  required
                  value={exitStart}
                  onChange={(e) => setExitStart(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="exitEnd" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>End Time</label>
                <input
                  id="exitEnd"
                  type="time"
                  required
                  value={exitEnd}
                  onChange={(e) => setExitEnd(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            </div>
          </div>

          {saveMessage && (
            <div style={{
              padding: '12px',
              background: saveMessage.type === 'success' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: saveMessage.type === 'success' ? '1px solid rgba(52, 211, 153, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: saveMessage.type === 'success' ? '#6ee7b7' : '#fca5a5',
              fontSize: '0.9rem'
            }}>
              {saveMessage.type === 'success' ? <CheckCircle2 size={18} /> : <ShieldAlert size={18} />}
              {saveMessage.text}
            </div>
          )}

          <button
            type="submit"
            disabled={saveLoading}
            style={{
              padding: '12px',
              background: 'var(--accent)',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: saveLoading ? 'not-allowed' : 'pointer',
              opacity: saveLoading ? 0.7 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {saveLoading ? 'Saving...' : 'Save Restrictions'}
          </button>
        </form>
      </div>

    </div>
  );
}
