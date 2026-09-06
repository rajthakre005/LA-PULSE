import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api';
import { Shield, AlertTriangle, Lock, User, ChevronRight, Landmark } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      setError('Invalid credentials. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      {/* Animated background particles */}
      <div className="login-particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${6 + Math.random() * 8}s`,
          }} />
        ))}
      </div>

      {/* Government header strip */}
      <div className="gov-header-strip">
        <div className="gov-header-content">
          <div className="gov-emblem">🏛️</div>
          <div>
            <div className="gov-title">Government of India</div>
            <div className="gov-subtitle">Ministry of Rural Development — Department of Land Resources (DoLR)</div>
          </div>
        </div>
        <div className="gov-links">
          <span>भूमि संसाधन विभाग</span>
        </div>
      </div>

      <div className="login-container">
        <div className="login-card-enhanced">
          {/* Logo section */}
          <div className="login-logo-section">
            <div className="login-shield-ring">
              <Shield size={36} />
            </div>
            <h1 className="login-brand">LA-PULSE</h1>
            <div className="login-tagline">
              Land Acquisition Predictive Early-Warning<br />& Intervention Engine
            </div>
          </div>


          {error && (
            <div className="login-error">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <div className="input-with-icon">
                <User size={16} className="input-icon" />
                <input className="form-input" value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username" autoFocus />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" />
                <input className="form-input" type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password" />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-lg login-btn" disabled={loading}>
              {loading ? (
                <><span className="login-spinner" /> Authenticating...</>
              ) : (
                <>Login to LA-PULSE <ChevronRight size={18} /></>
              )}
            </button>
          </form>

          {/* Data source */}
          <div className="login-source">
            <Landmark size={12} />
            <span>Powered by data from BhoomiRashi Portal, DILRMP & DoLR | RFCTLARR Act 2013</span>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="login-footer">
        <span>© 2026 LA-PULSE</span>
      </div>
    </div>
  );
}
