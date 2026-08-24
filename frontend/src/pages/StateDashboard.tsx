import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import ReactECharts from 'echarts-for-react';
import { ArrowLeft } from 'lucide-react';

function getRiskClass(s: number) { return s >= 76 ? 'critical' : s >= 51 ? 'high' : s >= 26 ? 'moderate' : 'low'; }

export default function StateDashboard() {
  const { state } = useParams();
  const [data, setData] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const nav = useNavigate();

  useEffect(() => {
    if (!state) return;
    Promise.all([
      api.getState(state),
      api.getProjects({ state, limit: 50 }),
    ]).then(([s, p]) => { setData(s); setProjects(p.projects || []); });
  }, [state]);

  if (!data) return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>;

  const distEntries = Object.entries(data.districts || {}) as [string, any][];

  const distChart = {
    tooltip: { trigger: 'axis' },
    grid: { left: 120, right: 30, top: 20, bottom: 30 },
    xAxis: { type: 'value', axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#1e293b' } } },
    yAxis: { type: 'category', data: distEntries.sort((a,b) => b[1].avg_risk - a[1].avg_risk).map(([d]) => d), axisLabel: { color: '#94a3b8', fontSize: 11 } },
    series: [
      { name: 'Avg Risk', type: 'bar', barWidth: 14, data: distEntries.sort((a,b) => b[1].avg_risk - a[1].avg_risk).map(([,v]) => ({
        value: v.avg_risk, itemStyle: { color: v.avg_risk >= 76 ? '#ef4444' : v.avg_risk >= 51 ? '#f97316' : v.avg_risk >= 26 ? '#f59e0b' : '#10b981', borderRadius: [0,4,4,0] },
      }))},
    ],
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <button className="btn btn-outline btn-sm" onClick={() => nav('/')}><ArrowLeft size={14} /> Back</button>
          </div>
          <h1 className="page-title">{state} — State Dashboard</h1>
          <div className="page-subtitle">{data.total_projects} projects | {data.critical} critical | Avg risk: {data.avg_risk}</div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card info"><div className="stat-label">Total Projects</div><div className="stat-value">{data.total_projects}</div></div>
        <div className="stat-card critical"><div className="stat-label">Critical</div><div className="stat-value" style={{ color: 'var(--red)' }}>{data.critical}</div></div>
        <div className="stat-card high"><div className="stat-label">Delayed</div><div className="stat-value" style={{ color: 'var(--orange)' }}>{data.delayed}</div></div>
        <div className="stat-card moderate"><div className="stat-label">Avg Delay (days)</div><div className="stat-value">{data.avg_delay}</div></div>
      </div>

      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-header"><span className="card-title">District Risk Comparison</span></div>
          <ReactECharts option={distChart} style={{ height: '400px' }} />
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">District Summary</span></div>
          <table className="data-table">
            <thead><tr><th>District</th><th>Projects</th><th>Critical</th><th>Avg Risk</th><th>Avg Delay</th></tr></thead>
            <tbody>
              {distEntries.sort((a,b) => b[1].avg_risk - a[1].avg_risk).map(([d, v]) => (
                <tr key={d}><td style={{ fontWeight: 600 }}>{d}</td><td>{v.total}</td>
                <td style={{ color: 'var(--red)' }}>{v.critical}</td>
                <td><span className={`risk-badge ${getRiskClass(v.avg_risk)}`}>{v.avg_risk}</span></td>
                <td>{v.avg_delay} days</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Projects — {state}</span></div>
        <table className="data-table">
          <thead><tr><th>ID</th><th>Project</th><th>District</th><th>Risk</th><th>Delay</th><th>Completion</th></tr></thead>
          <tbody>
            {projects.sort((a: any, b: any) => b.risk_score - a.risk_score).slice(0, 30).map((p: any) => (
              <tr key={p.project_id} className="clickable" onClick={() => nav(`/project/${p.project_id}`)}>
                <td style={{ fontWeight: 600 }}>{p.project_id}</td>
                <td>{p.project_name}</td><td>{p.district}</td>
                <td><span className={`risk-badge ${getRiskClass(p.risk_score)}`}>{p.risk_score}</span></td>
                <td>{p.expected_delay_days} days</td>
                <td>
                  <div className="progress-bar" style={{ width: '100px' }}>
                    <div className={`progress-fill ${p.overall_completion_pct > 0.7 ? 'green' : p.overall_completion_pct > 0.4 ? 'yellow' : 'red'}`}
                      style={{ width: `${p.overall_completion_pct * 100}%` }} />
                  </div>
                  <span style={{ fontSize: '11px', marginLeft: '6px' }}>{(p.overall_completion_pct * 100).toFixed(0)}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
