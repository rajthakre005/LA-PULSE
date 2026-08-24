import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api';
import { Shield, AlertTriangle } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('lapulse2026');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.login(username, password);
      setToken(data.access_token);
      nav('/');
    } catch {
      setError('Invalid credentials');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Shield size={32} color="var(--accent)" />
          <div>
            <h1>LA-PULSE</h1>
            <div className="subtitle" style={{ marginBottom: 0 }}>
              Land Acquisition Predictive Early-Warning & Intervention Engine
            </div>
          </div>
        </div>
        <div className="subtitle">SIH 2026 — Ministry of Rural Development</div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px',
            color: 'var(--red)', marginBottom: '16px' }}>
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
            {loading ? 'Authenticating...' : 'Login to LA-PULSE'}
          </button>
        </form>

        <div style={{ marginTop: '24px', padding: '14px', background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius)', fontSize: '11px', color: 'var(--text-muted)' }}>
          <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>Demo Credentials</div>
          <div>National Admin: <b>admin</b> / lapulse2026</div>
          <div>State Admin: <b>state_admin</b> / lapulse2026</div>
          <div>District Officer: <b>dist_officer</b> / lapulse2026</div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '10px', color: 'var(--text-muted)' }}>
          Prototype demonstration using synthetic operational data.
        </div>
      </div>
    </div>
  );
}
