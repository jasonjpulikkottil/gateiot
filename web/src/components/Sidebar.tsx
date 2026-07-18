'use client';

import { logout } from '../app/actions/auth';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '⬡' },
  { id: 'logs', label: 'Swipe Logs', icon: '≡' },
  { id: 'employees', label: 'Employees', icon: '◉' },
  { id: 'analytics', label: 'Analytics', icon: '⟠' },
  { id: 'model', label: 'ML Trainer', icon: '⬡' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">🔐</div>
        <div>
          <div className="sidebar__logo-text">GateIoT</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>HR Dashboard</div>
        </div>
      </div>

      <nav style={{ flex: 1 }}>
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <span style={{ fontSize: '1rem', width: 20 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="live-dot" />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Live monitoring
          </span>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, marginBottom: 12 }}>
          dwvmhksojxkmwcvlxxne
        </div>
        <form action={logout}>
          <button 
            type="submit"
            style={{
              width: '100%',
              padding: '6px 12px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>⎋</span> Logout
          </button>
        </form>
      </div>
    </aside>
  );
}
