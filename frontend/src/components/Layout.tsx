import { useNavigate, useLocation } from 'react-router-dom';
import { clearToken, api } from '../api';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Bell, Brain, LogOut, Shield,
  BarChart3, FileText
} from 'lucide-react';

const NAV = [
  { section: 'Overview', items: [
    { path: '/', icon: LayoutDashboard, label: 'National Dashboard' },
    { path: '/alerts', icon: Bell, label: 'Alert Center' },
  ]},
  { section: 'Intelligence', items: [
    { path: '/analytics', icon: BarChart3, label: 'Advanced Analytics' },
    { path: '/documents', icon: FileText, label: 'Document Intelligence' },
  ]},
  { section: 'AI/ML', items: [
    { path: '/model', icon: Brain, label: 'Model Metrics' },
  ]},
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const loc = useLocation();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    api.getAlerts({ status: 'active' }).then(d => setAlertCount(d.total || 0)).catch(() => {});
  }, [loc.pathname]);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div>
            <div className="sidebar-logo">LA-PULSE</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Predictive Intelligence
            </div>
          </div>
          <span className="sidebar-badge">SIH 2026</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(s => (
            <div className="nav-section" key={s.section}>
              <div className="nav-section-title">{s.section}</div>
              {s.items.map(item => (
                <div key={item.path}
                  className={`nav-item ${loc.pathname === item.path ? 'active' : ''}`}
                  onClick={() => nav(item.path)}>
                  <item.icon />
                  <span>{item.label}</span>
                  {item.path === '/alerts' && alertCount > 0 && (
                    <span style={{
                      marginLeft: 'auto', fontSize: '10px', fontWeight: 700,
                      background: 'var(--red)', color: 'white', borderRadius: '10px',
                      padding: '1px 6px', minWidth: '18px', textAlign: 'center',
                    }}>{alertCount > 99 ? '99+' : alertCount}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Prototype Demo</span>
            <span onClick={() => { clearToken(); nav('/login'); }}
              style={{ cursor: 'pointer', color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <LogOut size={14} /> Logout
            </span>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <div className="topbar">
          <div className="topbar-title">
            <Shield size={16} style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--accent)' }} />
            Land Acquisition Predictive Early-Warning & Intervention Engine
          </div>
          <div className="topbar-right">
            <div className="demo-badge">Prototype — Synthetic Data</div>
          </div>
        </div>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
