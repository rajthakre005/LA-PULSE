import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Bell, Check, AlertTriangle } from 'lucide-react';

export default function AlertCenter() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const nav = useNavigate();

  useEffect(() => {
    api.getAlerts({ limit: 100 }).then(d => setAlerts(d.alerts || []));
  }, []);

  const handleAck = async (id: string) => {
    await api.ackAlert(id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a));
  };

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.severity === filter);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title"><Bell size={24} style={{ verticalAlign: 'middle', marginRight: '8px' }} />Alert Center</h1>
          <div className="page-subtitle">{alerts.length} alerts | {alerts.filter(a => a.status === 'active').length} active</div></div>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['all', 'critical', 'high', 'medium'].map(f => (
          <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <div className="card">
        {filtered.slice(0, 50).map(a => (
          <div className="alert-item" key={a.id}>
            <div className={`alert-severity ${a.severity}`} />
            <div style={{ flex: 1 }}>
              <div className="alert-message">{a.message}</div>
              <div className="alert-project" style={{ cursor: 'pointer' }} onClick={() => nav(`/project/${a.project_id}`)}>
                {a.project_id} — {a.project_name} · {a.type.replace(/_/g, ' ')}
              </div>
            </div>
            {a.status === 'active' && (
              <button className="btn btn-outline btn-sm" onClick={() => handleAck(a.id)}><Check size={12} /> Ack</button>
            )}
            {a.status === 'acknowledged' && <span style={{ fontSize: '11px', color: 'var(--green)' }}>Acknowledged</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
