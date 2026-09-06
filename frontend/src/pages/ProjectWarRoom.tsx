import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import ReactECharts from 'echarts-for-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { ArrowLeft, Zap, AlertTriangle, Users, MapPin, Brain } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

function getRiskClass(s: number) { return s >= 76 ? 'critical' : s >= 51 ? 'high' : s >= 26 ? 'moderate' : 'low'; }
function getRiskColor(s: number) { return s >= 76 ? '#ef4444' : s >= 51 ? '#f97316' : s >= 26 ? '#f59e0b' : '#10b981'; }

const TABS = ['Overview','Timeline','Risk & Explainability','Map & Villages','Interventions','What-if Simulator','Stakeholders','Activity'];

export default function ProjectWarRoom() {
  const { id } = useParams();
  const nav = useNavigate();
  const [tab, setTab] = useState('Overview');
  const [project, setProject] = useState<any>(null);
  const [risk, setRisk] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [explain, setExplain] = useState<any>(null);
  const [interventions, setInterventions] = useState<any>(null);
  const [simResult, setSimResult] = useState<any>(null);
  const [selectedInt, setSelectedInt] = useState('');
  const [audit, setAudit] = useState<any[]>([]);
  const [simMode, setSimMode] = useState<'intervention' | 'custom'>('intervention');
  const [customParams, setCustomParams] = useState({ legal_disputes_resolved: 0, verification_boost: 0, compensation_boost: 0 });
  const [mapData, setMapData] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.getProject(id), api.getProjectRisk(id), api.getProjectTimeline(id),
      api.getExplainability(id), api.getInterventions(id), api.getAudit(),
      api.getMapData(id),
    ]).then(([p, r, t, e, i, a, m]) => {
      setProject(p); setRisk(r); setTimeline(t); setExplain(e); setInterventions(i);
      setAudit((a.entries || []).filter((x: any) => x.project_id === id));
      setMapData(m);
    });
  }, [id]);

  if (!project || !risk) return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading War Room...</div>;

  const handleSimulate = async () => {
    if (!id) return;
    if (simMode === 'intervention') {
      if (!selectedInt) return;
      const res = await api.simulate(id, { intervention_id: selectedInt });
      setSimResult(res);
    } else {
      const body: any = {};
      if (customParams.legal_disputes_resolved > 0) body.legal_disputes_resolved = customParams.legal_disputes_resolved;
      if (customParams.verification_boost > 0) body.verification_boost = customParams.verification_boost / 100;
      if (customParams.compensation_boost > 0) body.compensation_boost = customParams.compensation_boost / 100;
      if (Object.keys(body).length === 0) return;
      const res = await api.simulate(id, body);
      setSimResult(res);
    }
  };

  const handleCreateIntervention = async () => {
    if (!selectedInt || !id) return;
    const res = await api.createIntervention(id, { intervention_id: selectedInt, assigned_to: 'District LAO', notes: 'Created from War Room' });
    setAudit(prev => [...prev, res.audit_entry]);
    setTab('Activity');
  };

  const stageHealthChart = {
    tooltip: { trigger: 'axis' },
    radar: {
      indicator: Object.keys(risk.stage_health || {}).map(k => ({ name: k.charAt(0).toUpperCase() + k.slice(1), max: 100 })),
      axisLine: { lineStyle: { color: '#2a3650' } }, splitLine: { lineStyle: { color: '#2a3650' } },
      splitArea: { areaStyle: { color: ['transparent'] } }, axisName: { color: '#94a3b8', fontSize: 10 },
    },
    series: [{ type: 'radar', data: [{ value: Object.values(risk.stage_health || {}), name: 'Health', areaStyle: { color: 'rgba(59,130,246,0.2)' }, lineStyle: { color: '#3b82f6' }, itemStyle: { color: '#3b82f6' } }] }],
  };

  const riskContribChart = {
    tooltip: { trigger: 'axis' },
    grid: { left: 150, right: 30, top: 10, bottom: 20 },
    xAxis: { type: 'value', axisLabel: { color: '#64748b', formatter: '{value}%' }, splitLine: { lineStyle: { color: '#1e293b' } } },
    yAxis: { type: 'category', data: Object.keys(risk.risk_contribution || {}).map(k => k.replace(/_/g, ' ')), axisLabel: { color: '#94a3b8', fontSize: 11 } },
    series: [{ type: 'bar', barWidth: 16, data: Object.values(risk.risk_contribution || {}).map((v: any) => ({ value: v, itemStyle: { color: v > 20 ? '#ef4444' : v > 15 ? '#f97316' : '#3b82f6', borderRadius: [0,4,4,0] } })) }],
  };

  const cascadeData = [
    { from: 'Verification Delay', to: 'Compensation Delay', days: Math.round(project.expected_delay_days * 0.3) },
    { from: 'Compensation Delay', to: 'R&R Delay', days: Math.round(project.expected_delay_days * 0.5) },
    { from: 'R&R Delay', to: 'Possession Delay', days: Math.round(project.expected_delay_days * 0.7) },
    { from: 'Possession Delay', to: 'Project Handover Delay', days: project.expected_delay_days },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" onClick={() => nav(-1)} style={{ marginBottom: '8px' }}><ArrowLeft size={14} /> Back</button>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {project.project_id} <span className={`risk-badge ${getRiskClass(risk.risk_score)}`}>{risk.category}</span>
          </h1>
          <div className="page-subtitle">{project.project_name} — {project.state}, {project.district}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '42px', fontWeight: 800, color: getRiskColor(risk.risk_score), lineHeight: 1 }}>{risk.risk_score}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Risk Score / 100</div>
        </div>
      </div>

      {/* Key metrics strip */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', marginBottom: '16px' }}>
        <div className="stat-card critical"><div className="stat-label">Delay Probability</div><div className="stat-value" style={{ color: 'var(--red)' }}>{(risk.delay_probability*100).toFixed(0)}%</div></div>
        <div className="stat-card high"><div className="stat-label">Expected Delay</div><div className="stat-value">{project.expected_delay_days}d</div></div>
        <div className="stat-card info"><div className="stat-label">Completion</div><div className="stat-value">{(project.overall_completion_pct*100).toFixed(0)}%</div></div>
        <div className="stat-card moderate"><div className="stat-label">Data Confidence</div><div className="stat-value">{risk.data_confidence}%</div></div>
        <div className="stat-card info"><div className="stat-label">Legal Disputes</div><div className="stat-value">{project.legal_disputes}</div></div>
        <div className="stat-card info"><div className="stat-label">Docs Pending</div><div className="stat-value">{project.documents_pending}</div></div>
      </div>

      {/* War Room Tabs */}
      <div className="war-tabs">
        {TABS.map(t => <div key={t} className={`war-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</div>)}
      </div>

      {/* ── Overview Tab ── */}
      {tab === 'Overview' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>Project Details</div>
            {[['Type', project.project_type], ['State / District', `${project.state} / ${project.district}`],
              ['Villages', project.num_villages], ['Parcels', project.total_parcels], ['Affected Families', project.affected_families],
              ['Land Area', `${project.land_area_hectares} ha`], ['Project Value', `₹${project.project_value_crore} Cr`],
              ['Strategic Importance', project.strategic_importance?.toUpperCase()],
              ['Start Date', project.start_date], ['Planned Completion', project.planned_completion],
              ['Predicted Completion', project.predicted_completion],
              ['Expected Slippage', `${project.expected_delay_days} days`],
            ].map(([l, v]) => (
              <div key={String(l)} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                <span style={{ fontWeight: 600 }}>{String(v)}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>Stage Health</div>
            <ReactECharts option={stageHealthChart} style={{ height: '300px' }} />
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>Acquisition Velocity</div>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '12px' }}>
              <div><div className="stat-label">Previous Week</div><div style={{ fontSize: '24px', fontWeight: 700 }}>{project.velocity_prev_week}</div></div>
              <div><div className="stat-label">Current Week</div><div style={{ fontSize: '24px', fontWeight: 700 }}>{project.velocity_curr_week}</div></div>
              <div><div className="stat-label">Change</div><div style={{ fontSize: '24px', fontWeight: 700, color: project.velocity_change_pct < 0 ? 'var(--red)' : 'var(--green)' }}>{project.velocity_change_pct}%</div></div>
            </div>
            {project.velocity_change_pct < -20 && (
              <div style={{ padding: '10px', background: 'var(--red-dim)', borderRadius: 'var(--radius)', fontSize: '12px', color: 'var(--red)' }}>
                <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                Acquisition velocity has deteriorated significantly. If present trend continues, compensation completion is projected to cross the planned milestone.
              </div>
            )}
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>Predicted Completion</div>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Original Planned</div>
              <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>{project.planned_completion}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Predicted Completion</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--red)', marginBottom: '16px' }}>{project.predicted_completion}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Expected Slippage</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--orange)' }}>{project.expected_delay_days} days</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>
                Main contributor: {Object.entries(risk.risk_contribution || {}).sort((a: any, b: any) => b[1] - a[1])[0]?.[0]?.replace(/_/g, ' ')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Timeline Tab ── */}
      {tab === 'Timeline' && timeline && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: '20px' }}>Acquisition Lifecycle</div>
          <div className="stage-timeline">
            {(timeline.stages || []).map((s: any) => (
              <div className="stage-node" key={s.stage}>
                <div className={`stage-dot ${s.status}${s.risk ? ' at_risk' : ''}`} />
                <div className="stage-name">{s.label}</div>
                <div className="stage-pct" style={{ color: s.health < 50 ? 'var(--red)' : 'var(--text-primary)' }}>{(s.completion_pct * 100).toFixed(0)}%</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Health: {s.health}%</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '24px' }}>
            <div className="card-title" style={{ marginBottom: '12px' }}>Delay Cascade</div>
            {cascadeData.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--red)', fontSize: '13px', fontWeight: 600, minWidth: '180px' }}>{c.from}</span>
                <span style={{ color: 'var(--text-muted)' }}>→</span>
                <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '180px' }}>{c.to}</span>
                <span style={{ fontSize: '13px', color: 'var(--orange)', fontWeight: 700 }}>+{c.days} days</span>
              </div>
            ))}
            <div style={{ marginTop: '12px', padding: '10px', background: 'var(--orange-dim)', borderRadius: 'var(--radius)', fontSize: '12px', color: 'var(--orange)' }}>
              A {cascadeData[0].days}-day verification delay may propagate into a {project.expected_delay_days}-day downstream project delay.
            </div>
          </div>
        </div>
      )}

      {/* ── Risk & Explainability Tab ── */}
      {tab === 'Risk & Explainability' && explain && (
        <div className="grid-2">
          <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>
              <Brain size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Why is this project high risk?
            </div>
            {(explain.reasons || []).map((r: string, i: number) => (
              <div className="explanation-item" key={i}><div className="explanation-num">{i + 1}</div><div>{r}</div></div>
            ))}
            <div style={{ marginTop: '16px', padding: '10px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', fontSize: '11px', color: 'var(--text-muted)' }}>
              {explain.disclaimer}
            </div>
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>Risk Contribution Breakdown</div>
            <ReactECharts option={riskContribChart} style={{ height: '280px' }} />
            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              The prediction is primarily influenced by {Object.entries(risk.risk_contribution || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 2).map(([k]) => k.replace(/_/g, ' ')).join(' and ')}.
            </div>
          </div>
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-title" style={{ marginBottom: '12px' }}>AI Transparency</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', fontSize: '12px' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Model Version</span><div style={{ fontWeight: 600 }}>1.0.0</div></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Prediction Timestamp</span><div style={{ fontWeight: 600 }}>{new Date().toISOString().slice(0, 19)}</div></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Data Confidence</span><div style={{ fontWeight: 600 }}>{risk.data_confidence}%</div></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Confidence Level</span><div style={{ fontWeight: 600 }}>{risk.confidence}</div></div>
            </div>
          </div>
        </div>
      )}

      {/* ── Map & Villages Tab ── */}
      {tab === 'Map & Villages' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-title" style={{ marginBottom: '12px' }}>Project Map — Critical Villages</div>
            <div style={{ height: '400px', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              {mapData ? (
                <MapContainer center={mapData.center} zoom={11} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                  {(mapData.villages || []).map((v: any) => {
                    const vRisk = Math.round(100 - v.verification_pct * 30 - v.compensation_pct * 30 - v.rr_progress_pct * 20 + v.disputes * 2);
                    return (
                      <CircleMarker key={v.village_id} center={[v.latitude, v.longitude]} radius={Math.max(6, v.disputes + 4)}
                        pathOptions={{ fillColor: getRiskColor(vRisk), fillOpacity: 0.7, color: getRiskColor(vRisk), weight: 2 }}>
                        <Popup><div style={{ fontFamily: 'Inter', fontSize: '12px' }}>
                          <strong>{v.name}</strong><br />Risk: {vRisk}%<br />Parcels: {v.total_parcels}<br />Disputes: {v.disputes}<br />Verification: {(v.verification_pct * 100).toFixed(0)}%
                        </div></Popup>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                  Loading map data...
                </div>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: '12px' }}>
              <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Critical Villages
            </div>
            <table className="data-table">
              <thead><tr><th>Village</th><th>Parcels</th><th>Disputes</th><th>Verify</th><th>Comp</th><th>Risk</th></tr></thead>
              <tbody>
                {(mapData?.villages || project.villages || []).sort((a: any, b: any) => b.disputes - a.disputes).slice(0, 12).map((v: any) => {
                  const vRisk = Math.round(100 - v.verification_pct * 30 - v.compensation_pct * 30 - v.rr_progress_pct * 20 + v.disputes * 2);
                  return (
                    <tr key={v.village_id}>
                      <td style={{ fontWeight: 600 }}>{v.name}</td><td>{v.total_parcels}</td>
                      <td style={{ color: v.disputes > 5 ? 'var(--red)' : 'inherit' }}>{v.disputes}</td>
                      <td>{(v.verification_pct * 100).toFixed(0)}%</td><td>{(v.compensation_pct * 100).toFixed(0)}%</td>
                      <td><span className={`risk-badge ${getRiskClass(vRisk)}`}>{vRisk}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Interventions Tab ── */}
      {tab === 'Interventions' && interventions && (
        <div>
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-title">Recommended Interventions</div>
            <div className="card-subtitle" style={{ marginBottom: '16px' }}>Current expected delay: {interventions.current_delay} days</div>
            {(interventions.interventions || []).map((int: any) => (
              <div className="intervention-card" key={int.id} onClick={() => { setSelectedInt(int.id); setTab('What-if Simulator'); }}>
                <div className="intervention-title">{int.title}</div>
                <div className="intervention-desc">{int.description}</div>
                <div className="intervention-metrics">
                  <div className="intervention-metric"><span className="label">Delay Reduction: </span><span className="value green">-{int.delay_reduction_days} days</span></div>
                  <div className="intervention-metric"><span className="label">After: </span><span className="value">{int.after_delay} days</span></div>
                  <div className="intervention-metric"><span className="label">Effort: </span><span className="value">{int.effort}</span></div>
                  <div className="intervention-metric"><span className="label">Responsible: </span><span className="value">{int.responsible}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── What-if Simulator Tab ── */}
      {tab === 'What-if Simulator' && interventions && (
        <div>
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-title" style={{ marginBottom: '16px' }}>What-if Counterfactual Simulator</div>
            <div className="page-subtitle" style={{ marginBottom: '16px' }}>
              Test hypothetical scenarios to estimate potential delay reduction and risk impact.
            </div>

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button className={`btn ${simMode === 'intervention' ? 'btn-primary' : 'btn-outline'} btn-sm`}
                onClick={() => setSimMode('intervention')}>Intervention Preset</button>
              <button className={`btn ${simMode === 'custom' ? 'btn-primary' : 'btn-outline'} btn-sm`}
                onClick={() => setSimMode('custom')}>Custom Parameters</button>
            </div>

            {simMode === 'intervention' ? (
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Select Intervention</label>
                <select className="form-input" value={selectedInt} onChange={e => setSelectedInt(e.target.value)} style={{ maxWidth: '400px' }}>
                  <option value="">Choose...</option>
                  {(interventions.interventions || []).map((int: any) => (
                    <option key={int.id} value={int.id}>{int.title} (-{int.delay_reduction_days}d)</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '16px' }}>
                <div>
                  <label className="form-label">Legal Disputes to Resolve</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="range" min="0" max={project.legal_disputes} value={customParams.legal_disputes_resolved}
                      onChange={e => setCustomParams(p => ({ ...p, legal_disputes_resolved: +e.target.value }))}
                      style={{ flex: 1, accentColor: 'var(--accent)' }} />
                    <span style={{ fontWeight: 700, minWidth: '30px', textAlign: 'right' }}>{customParams.legal_disputes_resolved}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Current: {project.legal_disputes} disputes
                  </div>
                </div>
                <div>
                  <label className="form-label">Verification Boost (%)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="range" min="0" max={Math.round((1 - (project.stage_completion?.verification || 0)) * 100)}
                      value={customParams.verification_boost}
                      onChange={e => setCustomParams(p => ({ ...p, verification_boost: +e.target.value }))}
                      style={{ flex: 1, accentColor: 'var(--accent)' }} />
                    <span style={{ fontWeight: 700, minWidth: '30px', textAlign: 'right' }}>+{customParams.verification_boost}%</span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Current: {((project.stage_completion?.verification || 0) * 100).toFixed(0)}% complete
                  </div>
                </div>
                <div>
                  <label className="form-label">Compensation Boost (%)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="range" min="0" max={Math.round((1 - (project.stage_completion?.compensation || 0)) * 100)}
                      value={customParams.compensation_boost}
                      onChange={e => setCustomParams(p => ({ ...p, compensation_boost: +e.target.value }))}
                      style={{ flex: 1, accentColor: 'var(--accent)' }} />
                    <span style={{ fontWeight: 700, minWidth: '30px', textAlign: 'right' }}>+{customParams.compensation_boost}%</span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Current: {((project.stage_completion?.compensation || 0) * 100).toFixed(0)}% complete
                  </div>
                </div>
              </div>
            )}

            <button className="btn btn-primary" onClick={handleSimulate}
              disabled={simMode === 'intervention' ? !selectedInt : (!customParams.legal_disputes_resolved && !customParams.verification_boost && !customParams.compensation_boost)}>
              <Zap size={14} /> Run Simulation
            </button>
          </div>
          {simResult && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: '20px' }}>Simulation Results</div>
              <div className="before-after">
                <div className="ba-box before">
                  <div className="ba-label">Before Intervention</div>
                  <div className="ba-value">{simResult.original_delay}</div>
                  <div className="ba-unit">expected delay (days)</div>
                  <div style={{ marginTop: '8px', fontSize: '13px' }}>Risk: {simResult.original_risk}%</div>
                </div>
                <div className="arrow">→</div>
                <div className="ba-box after">
                  <div className="ba-label">After Simulation</div>
                  <div className="ba-value">{simResult.simulated_delay}</div>
                  <div className="ba-unit">expected delay (days)</div>
                  <div style={{ marginTop: '8px', fontSize: '13px' }}>Risk: {simResult.simulated_risk}%</div>
                </div>
              </div>
              <div style={{ textAlign: 'center', margin: '20px 0', fontSize: '18px', fontWeight: 700, color: 'var(--green)' }}>
                Potential delay reduction: {simResult.delay_reduction} days
              </div>
              <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>{simResult.disclaimer}</div>
              <div style={{ textAlign: 'center' }}>
                <button className="btn btn-primary" onClick={handleCreateIntervention}>Create Intervention & Assign</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Stakeholders Tab ── */}
      {tab === 'Stakeholders' && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: '16px' }}>
            <Users size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Stakeholder Responsiveness
          </div>
          <table className="data-table">
            <thead><tr><th>Department</th><th>Avg Response (days)</th><th>Overdue Actions</th><th>Pending Approvals</th><th>Responsiveness Index</th></tr></thead>
            <tbody>
              {Object.entries(project.stakeholders || {}).sort((a: any, b: any) => a[1].responsiveness_index - b[1].responsiveness_index).map(([dept, info]: any) => (
                <tr key={dept}>
                  <td style={{ fontWeight: 600 }}>{dept}</td>
                  <td style={{ color: info.avg_response_days > 10 ? 'var(--red)' : 'inherit' }}>{info.avg_response_days}</td>
                  <td>{info.overdue_actions}</td><td>{info.pending_approvals}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="progress-bar" style={{ width: '80px' }}>
                        <div className={`progress-fill ${info.responsiveness_index > 70 ? 'green' : info.responsiveness_index > 40 ? 'yellow' : 'red'}`}
                          style={{ width: `${info.responsiveness_index}%` }} />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '12px' }}>{info.responsiveness_index}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {Object.entries(project.stakeholders || {}).some(([, v]: any) => v.responsiveness_index < 50) && (
            <div style={{ marginTop: '12px', padding: '10px', background: 'var(--yellow-dim)', borderRadius: 'var(--radius)', fontSize: '12px', color: 'var(--yellow)' }}>
              Process response-time bottleneck detected. {Object.entries(project.stakeholders || {}).filter(([, v]: any) => v.responsiveness_index < 50).map(([k]) => k).join(', ')} currently contribute highest administrative delay risk.
            </div>
          )}
        </div>
      )}

      {/* ── Activity Tab ── */}
      {tab === 'Activity' && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: '16px' }}>Audit Trail</div>
          {audit.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No audit entries yet. Create an intervention to see entries.</div>
          ) : (
            <table className="data-table">
              <thead><tr><th>ID</th><th>Action</th><th>Intervention</th><th>Assigned To</th><th>Timestamp</th><th>Status</th></tr></thead>
              <tbody>
                {audit.map((a: any) => (
                  <tr key={a.id}><td>{a.id}</td><td>{a.action}</td><td>{a.intervention}</td><td>{a.assigned_to}</td>
                    <td>{new Date(a.timestamp).toLocaleString()}</td><td><span className="risk-badge moderate">{a.status}</span></td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
