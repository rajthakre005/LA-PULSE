import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import ReactECharts from 'echarts-for-react';
import { Activity, AlertTriangle, TrendingDown, Zap, Building2, Scale } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

function getRiskColor(score: number) {
  if (score >= 76) return 'var(--red)';
  if (score >= 51) return 'var(--orange)';
  if (score >= 26) return 'var(--yellow)';
  return 'var(--green)';
}

function getRiskClass(score: number) {
  if (score >= 76) return 'critical';
  if (score >= 51) return 'high';
  if (score >= 26) return 'moderate';
  return 'low';
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [simResult, setSimResult] = useState<any>(null);
  const nav = useNavigate();

  useEffect(() => {
    Promise.all([
      api.getNational(),
      api.getProjects({ limit: 20, min_risk: 50 }),
    ]).then(([nat, proj]) => {
      setData(nat);
      setProjects(proj.projects || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSimulate = async () => {
    const res = await api.simulateLiveUpdate();
    setSimResult(res);
    // Refresh data
    const [nat, proj] = await Promise.all([
      api.getNational(),
      api.getProjects({ limit: 20, min_risk: 50 }),
    ]);
    setData(nat);
    setProjects(proj.projects || []);
  };

  if (loading || !data) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading dashboard...</div>;

  const stateEntries = Object.entries(data.states || {}) as [string, any][];

  const riskDistChart = {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: ['50%', '75%'], center: ['50%', '50%'],
      label: { show: true, color: '#94a3b8', fontSize: 11 },
      data: [
        { value: data.critical_projects, name: 'Critical', itemStyle: { color: '#ef4444' } },
        { value: data.high_risk_projects, name: 'High', itemStyle: { color: '#f97316' } },
        { value: data.total_projects - data.critical_projects - data.high_risk_projects - data.delayed_projects, name: 'Moderate', itemStyle: { color: '#f59e0b' } },
        { value: data.total_projects - data.critical_projects - data.high_risk_projects, name: 'Low', itemStyle: { color: '#10b981' } },
      ],
    }],
  };

  const stateBarChart = {
    tooltip: { trigger: 'axis' },
    grid: { left: 100, right: 20, top: 10, bottom: 30 },
    xAxis: { type: 'value', axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#1e293b' } } },
    yAxis: {
      type: 'category',
      data: stateEntries.sort((a,b) => b[1].avg_risk - a[1].avg_risk).map(([s]) => s),
      axisLabel: { color: '#94a3b8', fontSize: 11 },
    },
    series: [{
      type: 'bar', barWidth: 16,
      data: stateEntries.sort((a,b) => b[1].avg_risk - a[1].avg_risk).map(([, v]) => ({
        value: v.avg_risk,
        itemStyle: { color: getRiskColor(v.avg_risk), borderRadius: [0, 4, 4, 0] },
      })),
    }],
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">National Dashboard</h1>
          <div className="page-subtitle">Land Acquisition Monitoring — All States</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={handleSimulate}>
            <Zap size={14} /> Simulate Live Update
          </button>
        </div>
      </div>

      {simResult && (
        <div style={{ padding: '14px 20px', background: 'var(--accent-dim)', border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: 'var(--radius)', marginBottom: '20px', fontSize: '13px' }}>
          <strong>Live Update Simulated</strong> — {simResult.project_id}: {simResult.changes?.join(' | ')}
          <span onClick={() => setSimResult(null)} style={{ cursor: 'pointer', marginLeft: '12px', color: 'var(--text-muted)' }}>✕</span>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Building2 size={16} color="var(--accent)" />
            <span className="stat-label">Total Active Projects</span>
          </div>
          <div className="stat-value">{data.total_projects}</div>
        </div>
        <div className="stat-card critical">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangle size={16} color="var(--red)" />
            <span className="stat-label">Critical Projects</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--red)' }}>{data.critical_projects}</div>
        </div>
        <div className="stat-card high">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <TrendingDown size={16} color="var(--orange)" />
            <span className="stat-label">Delayed Projects</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--orange)' }}>{data.delayed_projects}</div>
        </div>
        <div className="stat-card moderate">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Activity size={16} color="var(--yellow)" />
            <span className="stat-label">Avg Delay (days)</span>
          </div>
          <div className="stat-value">{data.avg_delay_days}</div>
        </div>
        <div className="stat-card info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Scale size={16} color="var(--cyan)" />
            <span className="stat-label">Legal Cases</span>
          </div>
          <div className="stat-value">{data.legal_cases_total?.toLocaleString()}</div>
        </div>
        <div className="stat-card info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="stat-label">Compensation Pending (₹)</span>
          </div>
          <div className="stat-value" style={{ fontSize: '22px' }}>₹{(data.compensation_pending_total / 1000).toFixed(2)} Crore</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '24px' }}>
        {/* India Risk Map */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">India Risk Map</span>
            <span className="card-subtitle">Click state to drill down</span>
          </div>
          <div style={{ height: '400px', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <MapContainer center={[22.5, 79]} zoom={5} style={{ height: '100%', width: '100%' }}
              zoomControl={true} scrollWheelZoom={true}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors' />
              {stateEntries.map(([state, info]) => (
                <CircleMarker key={state} center={[info.lat, info.lon]}
                  radius={Math.max(8, Math.sqrt(info.total) * 3)}
                  pathOptions={{ fillColor: getRiskColor(info.avg_risk), fillOpacity: 0.7,
                    color: getRiskColor(info.avg_risk), weight: 2 }}
                  eventHandlers={{ click: () => nav(`/state/${encodeURIComponent(state)}`) }}>
                  <Popup>
                    <div style={{ fontFamily: 'Inter', fontSize: '12px' }}>
                      <strong>{state}</strong><br />
                      Projects: {info.total}<br />
                      Critical: {info.critical}<br />
                      Avg Risk: {info.avg_risk}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* State Risk Ranking */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">State Risk Ranking</span>
            <span className="card-subtitle">Average risk score</span>
          </div>
          <ReactECharts option={stateBarChart} style={{ height: '400px' }} />
        </div>
      </div>

      {/* Intervention Priority Queue */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Intervention Priority Queue — Top 15 Projects</span>
          <span className="card-subtitle">Sorted by Risk × Delay × Impact</span>
        </div>
        <table className="data-table">
          <thead><tr>
            <th>Rank</th><th>Project</th><th>State / District</th><th>Risk</th>
            <th>Delay Prob</th><th>Delay (days)</th><th>Impact</th><th>Status</th>
          </tr></thead>
          <tbody>
            {projects.slice(0, 15).map((p: any, i: number) => (
              <tr key={p.project_id} className="clickable" onClick={() => nav(`/project/${p.project_id}`)}>
                <td style={{ fontWeight: 700 }}>{i + 1}</td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.project_id}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.project_name}</div>
                </td>
                <td>{p.state} / {p.district}</td>
                <td><span className={`risk-badge ${getRiskClass(p.risk_score)}`}>{p.risk_score}</span></td>
                <td>{(p.delay_probability * 100).toFixed(0)}%</td>
                <td style={{ fontWeight: 700, color: p.expected_delay_days > 60 ? 'var(--red)' : 'var(--text-primary)' }}>
                  {p.expected_delay_days}
                </td>
                <td>{p.impact_score}</td>
                <td><span className={`risk-badge ${p.status === 'delayed' ? 'critical' : 'low'}`}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
