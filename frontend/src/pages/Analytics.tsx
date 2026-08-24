import { useState, useEffect } from 'react';
import { api } from '../api';
import ReactECharts from 'echarts-for-react';
import { BarChart3, TrendingUp, Target, Layers, Gauge } from 'lucide-react';

function getRiskColor(s: number) {
  return s >= 76 ? '#ef4444' : s >= 51 ? '#f97316' : s >= 26 ? '#f59e0b' : '#10b981';
}

export default function Analytics() {
  const [national, setNational] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.getNational(),
      api.getProjects({ limit: 500 }),
    ]).then(([n, p]) => {
      setNational(n);
      setProjects(p.projects || []);
    });
  }, []);

  if (!national || !projects.length) return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading analytics...</div>;

  // ── Derive analytics data ──

  // Risk distribution histogram
  const riskBuckets = [0, 0, 0, 0, 0]; // 0-20, 21-40, 41-60, 61-80, 81-100
  projects.forEach(p => {
    const idx = Math.min(4, Math.floor(p.risk_score / 20));
    riskBuckets[idx]++;
  });

  const riskHistogram = {
    tooltip: { trigger: 'axis' },
    grid: { left: 60, right: 30, top: 30, bottom: 40 },
    xAxis: {
      type: 'category',
      data: ['0–20', '21–40', '41–60', '61–80', '81–100'],
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      axisLine: { lineStyle: { color: '#2a3650' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [{
      type: 'bar', barWidth: 32,
      data: riskBuckets.map((v, i) => ({
        value: v,
        itemStyle: {
          color: ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#dc2626'][i],
          borderRadius: [4, 4, 0, 0],
        },
      })),
      animationDuration: 1200,
    }],
  };

  // Stage bottleneck analysis
  const stageNames = ['notification', 'survey', 'verification', 'objection', 'award', 'compensation', 'rr', 'possession'];
  const stageLabels: Record<string, string> = {
    notification: 'Notification', survey: 'Survey', verification: 'Verification',
    objection: 'Objection Handling', award: 'Award', compensation: 'Compensation',
    rr: 'R&R', possession: 'Possession',
  };
  const stageAvg = stageNames.map(s => {
    const vals = projects.map(p => (p.stage_completion?.[s] ?? 0) * 100);
    return { name: s, label: stageLabels[s], avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) };
  });

  const bottleneckChart = {
    tooltip: { trigger: 'axis', formatter: (p: any) => `${p[0].name}<br/>Avg Completion: <b>${p[0].value}%</b>` },
    grid: { left: 130, right: 40, top: 10, bottom: 20 },
    xAxis: {
      type: 'value', max: 100,
      axisLabel: { color: '#64748b', formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'category',
      data: stageAvg.sort((a, b) => a.avg - b.avg).map(s => s.label),
      axisLabel: { color: '#94a3b8', fontSize: 11 },
    },
    series: [{
      type: 'bar', barWidth: 18,
      data: stageAvg.sort((a, b) => a.avg - b.avg).map(s => ({
        value: s.avg,
        itemStyle: {
          color: s.avg < 40 ? '#ef4444' : s.avg < 60 ? '#f97316' : s.avg < 75 ? '#f59e0b' : '#10b981',
          borderRadius: [0, 6, 6, 0],
        },
      })),
      animationDuration: 1000,
    }],
  };

  // Project type distribution
  const typeCount: Record<string, number> = {};
  projects.forEach(p => { typeCount[p.project_type] = (typeCount[p.project_type] || 0) + 1; });
  const typeChart = {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: ['45%', '70%'], center: ['50%', '50%'],
      label: { show: true, color: '#94a3b8', fontSize: 11, formatter: '{b}\n{d}%' },
      data: Object.entries(typeCount).map(([k, v], i) => ({
        value: v, name: k,
        itemStyle: { color: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#f97316', '#ec4899'][i % 8] },
      })),
      animationDuration: 1200,
    }],
  };

  // Delay vs Risk scatter
  const scatterData = projects.slice(0, 200).map(p => [p.risk_score, p.expected_delay_days, p.project_id, p.project_type]);
  const scatterChart = {
    tooltip: {
      formatter: (p: any) => `<b>${p.data[2]}</b><br/>Type: ${p.data[3]}<br/>Risk: ${p.data[0]}<br/>Delay: ${p.data[1]} days`,
    },
    grid: { left: 60, right: 30, top: 20, bottom: 40 },
    xAxis: {
      name: 'Risk Score', nameTextStyle: { color: '#64748b' },
      axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      name: 'Delay (days)', nameTextStyle: { color: '#64748b' },
      axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [{
      type: 'scatter', symbolSize: 8,
      data: scatterData,
      itemStyle: { color: (p: any) => getRiskColor(p.data[0]), opacity: 0.7 },
      animationDuration: 800,
    }],
  };

  // State performance heatmap data
  const stateEntries = Object.entries(national.states || {}) as [string, any][];
  const statePerformance = stateEntries
    .sort((a, b) => b[1].avg_risk - a[1].avg_risk)
    .slice(0, 12)
    .map(([state, info]) => ({
      state,
      total: info.total,
      critical: info.critical,
      delayed: info.delayed,
      avgRisk: info.avg_risk,
      efficiency: Math.round(100 - info.avg_risk),
    }));

  // Velocity analysis
  const velocityDistribution = { positive: 0, flat: 0, negative: 0, critical: 0 };
  projects.forEach(p => {
    if (p.velocity_change_pct > 5) velocityDistribution.positive++;
    else if (p.velocity_change_pct >= -10) velocityDistribution.flat++;
    else if (p.velocity_change_pct >= -40) velocityDistribution.negative++;
    else velocityDistribution.critical++;
  });

  const velocityChart = {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: ['55%', '75%'], center: ['50%', '50%'],
      label: { show: true, color: '#94a3b8', fontSize: 11, formatter: '{b}\n{c}' },
      data: [
        { value: velocityDistribution.positive, name: 'Accelerating', itemStyle: { color: '#10b981' } },
        { value: velocityDistribution.flat, name: 'Stable', itemStyle: { color: '#3b82f6' } },
        { value: velocityDistribution.negative, name: 'Slowing', itemStyle: { color: '#f97316' } },
        { value: velocityDistribution.critical, name: 'Critical Drop', itemStyle: { color: '#ef4444' } },
      ],
      animationDuration: 1000,
    }],
  };

  // Key KPIs
  const avgCompletion = Math.round(projects.reduce((a, p) => a + (p.overall_completion_pct || 0), 0) / projects.length * 100);
  const onTrack = projects.filter(p => p.status !== 'delayed').length;
  const criticalVelocity = projects.filter(p => p.velocity_change_pct < -40).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"><BarChart3 size={24} style={{ verticalAlign: 'middle', marginRight: '8px' }} />Advanced Analytics</h1>
          <div className="page-subtitle">National Performance Intelligence — {projects.length} projects analyzed</div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '24px' }}>
        <div className="stat-card info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Target size={16} color="var(--accent)" />
            <span className="stat-label">Avg Completion</span>
          </div>
          <div className="stat-value">{avgCompletion}%</div>
        </div>
        <div className="stat-card low">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <TrendingUp size={16} color="var(--green)" />
            <span className="stat-label">On Track</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{onTrack}</div>
        </div>
        <div className="stat-card critical">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Gauge size={16} color="var(--red)" />
            <span className="stat-label">Critical Velocity</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--red)' }}>{criticalVelocity}</div>
        </div>
        <div className="stat-card moderate">
          <div className="stat-label" style={{ marginBottom: '6px' }}>Avg Risk Score</div>
          <div className="stat-value" style={{ color: 'var(--yellow)' }}>{national.avg_risk}</div>
        </div>
        <div className="stat-card info">
          <div className="stat-label" style={{ marginBottom: '6px' }}>Avg Delay (days)</div>
          <div className="stat-value">{national.avg_delay_days}</div>
        </div>
      </div>

      {/* Row 1: Risk Histogram + Stage Bottleneck */}
      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Risk Score Distribution</span>
            <span className="card-subtitle">Across all projects</span>
          </div>
          <ReactECharts option={riskHistogram} style={{ height: '300px' }} />
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title"><Layers size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Stage Bottleneck Analysis</span>
            <span className="card-subtitle">Lowest avg completion = bottleneck</span>
          </div>
          <ReactECharts option={bottleneckChart} style={{ height: '300px' }} />
        </div>
      </div>

      {/* Row 2: Scatter + Velocity */}
      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Risk vs Delay Correlation</span>
            <span className="card-subtitle">Each dot = 1 project</span>
          </div>
          <ReactECharts option={scatterChart} style={{ height: '340px' }} />
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Acquisition Velocity Trend</span>
            <span className="card-subtitle">Week-over-week velocity change</span>
          </div>
          <ReactECharts option={velocityChart} style={{ height: '340px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '16px' }}>
            {[
              { label: 'Accelerating', value: velocityDistribution.positive, color: 'var(--green)' },
              { label: 'Stable', value: velocityDistribution.flat, color: 'var(--accent)' },
              { label: 'Slowing', value: velocityDistribution.negative, color: 'var(--orange)' },
              { label: 'Critical', value: velocityDistribution.critical, color: 'var(--red)' },
            ].map(v => (
              <div key={v.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: v.color }}>{v.value}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{v.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Project Type + State Performance */}
      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Project Type Distribution</span>
          </div>
          <ReactECharts option={typeChart} style={{ height: '320px' }} />
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Top States — Performance Matrix</span>
            <span className="card-subtitle">Efficiency = 100 − avg risk</span>
          </div>
          <table className="data-table">
            <thead><tr>
              <th>State</th><th>Projects</th><th>Critical</th><th>Avg Risk</th><th>Efficiency</th>
            </tr></thead>
            <tbody>
              {statePerformance.map(s => (
                <tr key={s.state}>
                  <td style={{ fontWeight: 600 }}>{s.state}</td>
                  <td>{s.total}</td>
                  <td style={{ color: s.critical > 0 ? 'var(--red)' : 'inherit' }}>{s.critical}</td>
                  <td><span className={`risk-badge ${s.avgRisk >= 76 ? 'critical' : s.avgRisk >= 51 ? 'high' : s.avgRisk >= 26 ? 'moderate' : 'low'}`}>{s.avgRisk}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="progress-bar" style={{ width: '80px' }}>
                        <div className={`progress-fill ${s.efficiency > 60 ? 'green' : s.efficiency > 40 ? 'yellow' : 'red'}`}
                          style={{ width: `${s.efficiency}%` }} />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '12px' }}>{s.efficiency}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delay Cascade Summary */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Delay Cascade — Systemic Bottleneck Flow</span>
          <span className="card-subtitle">How delays propagate through acquisition stages</span>
        </div>
        <div className="cascade-flow">
          {stageAvg.map((s, i) => (
            <div className="cascade-node" key={s.name}>
              <div className={`cascade-box ${s.avg < 40 ? 'critical' : s.avg < 60 ? 'high' : s.avg < 75 ? 'moderate' : 'low'}`}>
                <div className="cascade-label">{s.label}</div>
                <div className="cascade-pct">{s.avg}%</div>
              </div>
              {i < stageAvg.length - 1 && <div className="cascade-arrow">→</div>}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '16px', padding: '12px', background: 'var(--orange-dim)', borderRadius: 'var(--radius)', fontSize: '12px', color: 'var(--orange)' }}>
          Primary bottleneck identified at <strong>{stageAvg.sort((a, b) => a.avg - b.avg)[0].label}</strong> stage ({stageAvg.sort((a, b) => a.avg - b.avg)[0].avg}% avg completion).
          This stage creates maximum downstream cascading delay across the national portfolio.
        </div>
      </div>
    </div>
  );
}
