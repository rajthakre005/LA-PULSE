import { useState, useEffect } from 'react';
import { api } from '../api';
import { Brain } from 'lucide-react';

export default function ModelMetrics() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.getModelMetrics().then(setData); }, []);

  if (!data) return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title"><Brain size={24} style={{ verticalAlign: 'middle', marginRight: '8px' }} />Model Monitoring</h1>
          <div className="page-subtitle">ML Pipeline Performance — {data.disclaimer}</div></div>
      </div>

      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: '16px' }}>Delay Classifier</div>
          {data.classifier_metrics && Object.entries(data.classifier_metrics).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k}</span>
              <span style={{ fontWeight: 700 }}>{String(v)}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: '16px' }}>Delay Regressor</div>
          {data.regressor_metrics && Object.entries(data.regressor_metrics).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase' }}>{k}</span>
              <span style={{ fontWeight: 700 }}>{String(v)}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: '16px' }}>Risk Regressor</div>
          {data.risk_metrics && Object.entries(data.risk_metrics).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase' }}>{k}</span>
              <span style={{ fontWeight: 700 }}>{String(v)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-title" style={{ marginBottom: '16px' }}>Top SHAP Feature Importance (Classifier)</div>
        {data.classifier_shap && Object.entries(data.classifier_shap).slice(0, 10).map(([k, v]: any) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0' }}>
            <span style={{ minWidth: '180px', fontSize: '12px', color: 'var(--text-secondary)' }}>{k.replace(/_/g, ' ')}</span>
            <div className="progress-bar" style={{ flex: 1 }}>
              <div className="progress-fill blue" style={{ width: `${Math.min(100, v * 30)}%` }} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '50px', textAlign: 'right' }}>{v.toFixed(3)}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: '12px' }}>Known Limitations</div>
        {(data.known_limitations || []).map((l: string, i: number) => (
          <div key={i} style={{ padding: '6px 0', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
            <span style={{ color: 'var(--yellow)' }}>⚠</span> {l}
          </div>
        ))}
        <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Model version: {data.model_version} | Trained on: {data.training_samples} samples | {data.trained_at?.slice(0, 19)}
        </div>
      </div>
    </div>
  );
}
