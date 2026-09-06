import { useState } from 'react';
import { api } from '../api';
import { Brain, TrendingUp, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

interface PredictionResult {
  delay_probability: number;
  predicted_delay_days: number;
  risk_score: number;
  risk_category: string;
  model_version: string;
}

export default function Prediction() {
  const [features, setFeatures] = useState({
    land_area: 500,
    affected_families: 100,
    num_parcels: 150,
    num_villages: 5,
    notification_pct: 0.5,
    survey_pct: 0.4,
    verification_pct: 0.3,
    objection_pct: 0.2,
    award_pct: 0.15,
    compensation_pct: 0.1,
    rr_pct: 0.05,
    possession_pct: 0.02,
    overall_completion: 0.2,
    legal_disputes: 5,
    comp_total: 1000,
    comp_paid: 200,
    comp_pending: 800,
    avg_response_days: 15,
    approval_delay: 30,
    docs_total: 50,
    docs_pending: 20,
    doc_anomalies: 3,
    velocity_change: -5,
    project_value: 5000,
  });

  const featureLabels: Record<string, string> = {
    land_area: "Land Area (Hectares)",
    affected_families: "Affected Families",
    num_parcels: "Number of Parcels",
    num_villages: "Number of Villages",
    notification_pct: "Notification Completion (%)",
    survey_pct: "Survey Completion (%)",
    verification_pct: "Verification Completion (%)",
    objection_pct: "Objection Completion (%)",
    award_pct: "Award Completion (%)",
    compensation_pct: "Compensation Completion (%)",
    rr_pct: "R&R Completion (%)",
    possession_pct: "Possession Completion (%)",
    overall_completion: "Overall Completion (%)",
    legal_disputes: "Legal Disputes",
    comp_total: "Total Compensation (Lakhs)",
    comp_paid: "Compensation Paid (Lakhs)",
    comp_pending: "Compensation Pending (Lakhs)",
    avg_response_days: "Avg Response Days",
    approval_delay: "Approval Delay (Days)",
    docs_total: "Total Documents",
    docs_pending: "Documents Pending",
    doc_anomalies: "Document Anomalies",
    velocity_change: "Velocity Change",
    project_value: "Project Value (Crores)",
  };
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(features),
      });
      if (!response.ok) throw new Error('Prediction failed');
      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (category: string) => {
    switch (category) {
      case 'critical': return 'var(--red)';
      case 'high': return 'var(--orange)';
      case 'moderate': return 'var(--yellow)';
      default: return 'var(--green)';
    }
  };

  const getRiskIcon = (category: string) => {
    switch (category) {
      case 'critical': return <AlertTriangle size={24} />;
      case 'high': return <AlertTriangle size={24} />;
      case 'moderate': return <TrendingUp size={24} />;
      default: return <CheckCircle2 size={24} />;
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Brain size={24} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            New Project Prediction
          </h1>
          <div className="page-subtitle">AI-powered risk and delay prediction for new land acquisition projects</div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: '24px' }}>
        {/* Input Form */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Project Features</span>
          </div>
          <div style={{ padding: '20px', maxHeight: '600px', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {Object.entries(features).map(([key, value]) => (
                <div key={key}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                    {featureLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={value}
                    onChange={(e) => setFeatures({ ...features, [key]: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%' }}
                  />
                </div>
              ))}
            </div>
            <button
              className="btn btn-primary"
              onClick={handlePredict}
              disabled={loading}
              style={{ width: '100%', marginTop: '20px', justifyContent: 'center' }}
            >
              {loading ? <Loader2 size={16} className="spin" /> : <Brain size={16} />}
              {loading ? ' Predicting...' : ' Predict Risk & Delay'}
            </button>
            {error && (
              <div style={{ marginTop: '12px', padding: '12px', background: 'var(--red-dim)', borderRadius: 'var(--radius)', color: 'var(--red)', fontSize: '13px' }}>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Prediction Results</span>
          </div>
          <div style={{ padding: '20px' }}>
            {result ? (
              <div>
                {/* Risk Score */}
                <div style={{ textAlign: 'center', padding: '24px', marginBottom: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                  <div style={{ color: getRiskColor(result.risk_category), marginBottom: '8px' }}>
                    {getRiskIcon(result.risk_category)}
                  </div>
                  <div style={{ fontSize: '48px', fontWeight: 800, color: getRiskColor(result.risk_category) }}>
                    {result.risk_score}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {result.risk_category} Risk
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '20px' }}>
                  <div className="stat-card info">
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Delay Probability</div>
                    <div className="stat-value">{(result.delay_probability * 100).toFixed(1)}%</div>
                  </div>
                  <div className="stat-card high">
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Expected Delay</div>
                    <div className="stat-value">{result.predicted_delay_days.toFixed(0)} days</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Brain size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <div style={{ fontSize: '13px' }}>Enter project features and click Predict to see results</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
