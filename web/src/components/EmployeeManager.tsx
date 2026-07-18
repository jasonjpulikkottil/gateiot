'use client';

import { useState } from 'react';
import type { Employee } from '@/lib/types';

interface EmployeeManagerProps {
  employees: Employee[];
  onRefresh: () => void;
}

export default function EmployeeManager({ employees, onRefresh }: EmployeeManagerProps) {
  const [form, setForm] = useState({
    name: '', email: '', department: '', card_uid: '', shift_start: '09:00', shift_end: '18:00',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const url = '/api/employees';
      const method = editingId ? 'PUT' : 'POST';
      const bodyPayload = editingId ? { ...form, id: editingId } : form;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      
      setMessage({ type: 'ok', text: `Employee "${form.name}" ${editingId ? 'updated' : 'added'}.` });
      setForm({ name: '', email: '', department: '', card_uid: '', shift_start: '09:00', shift_end: '18:00' });
      setEditingId(null);
      onRefresh();
    } catch (err) {
      setMessage({ type: 'err', text: String(err) });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (emp: Employee) => {
    setForm({
      name: emp.name,
      email: emp.email ?? '',
      department: emp.department ?? '',
      card_uid: emp.card_uid,
      shift_start: emp.shift_start,
      shift_end: emp.shift_end,
    });
    setEditingId(emp.id);
    setMessage(null);
  };

  const handleCancelEdit = () => {
    setForm({ name: '', email: '', department: '', card_uid: '', shift_start: '09:00', shift_end: '18:00' });
    setEditingId(null);
    setMessage(null);
  };

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Remove "${emp.name}" (${emp.card_uid})? Their log history is preserved.`)) return;
    setDeleting(emp.id);
    try {
      await fetch(`/api/employees?id=${emp.id}`, { method: 'DELETE' });
      onRefresh();
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24 }}>
      {/* Add/Edit form */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: 20 }}>
          {editingId ? '✏️ Edit Employee' : '➕ Register Card UID'}
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="input" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Alice Johnson" />
          </div>
          <div className="form-group">
            <label className="form-label">Card UID * (hex, e.g. 6E8A2407)</label>
            <input className="input" required value={form.card_uid}
              onChange={(e) => setForm({ ...form, card_uid: e.target.value.toUpperCase() })}
              placeholder="6E8A2407" maxLength={12} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input" type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="alice@example.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <input className="input" value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Engineering" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Shift Start</label>
              <input className="input" type="time" value={form.shift_start}
                onChange={(e) => setForm({ ...form, shift_start: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Shift End</label>
              <input className="input" type="time" value={form.shift_end}
                onChange={(e) => setForm({ ...form, shift_end: e.target.value })} />
            </div>
          </div>

          {message && (
            <div style={{
              padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem',
              background: message.type === 'ok' ? 'var(--green-soft)' : 'var(--red-soft)',
              color: message.type === 'ok' ? 'var(--green)' : 'var(--red)',
              border: `1px solid ${message.type === 'ok' ? 'rgba(34,211,165,0.3)' : 'rgba(244,63,94,0.3)'}`,
            }}>
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn--primary" type="submit" disabled={saving} style={{ flex: 1 }}>
              {saving ? (editingId ? 'Updating…' : 'Adding…') : (editingId ? 'Update Employee' : 'Add Employee')}
            </button>
            {editingId && (
              <button type="button" className="btn btn--ghost" onClick={handleCancelEdit} disabled={saving}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Employee list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div className="section-title" style={{ marginBottom: 0 }}>
            👤 Registered Employees
            <span className="section-title__sub">{employees.length} total</span>
          </div>
        </div>
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {employees.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              No employees registered yet.
            </div>
          ) : (
            employees.map((emp) => (
              <div
                key={emp.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 24px', borderBottom: '1px solid var(--border)',
                  transition: 'background var(--transition)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontWeight: 600 }}>{emp.name}</span>
                  <span className="text-secondary" style={{ fontSize: '0.78rem' }}>{emp.department ?? '—'}</span>
                  <code style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{emp.card_uid}</code>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span className="text-secondary" style={{ fontSize: '0.75rem' }}>
                    {emp.shift_start} – {emp.shift_end}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn--ghost"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      onClick={() => handleEdit(emp)}
                      disabled={deleting === emp.id}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn--danger"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      onClick={() => handleDelete(emp)}
                      disabled={deleting === emp.id}
                    >
                      {deleting === emp.id ? '…' : 'Remove'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
