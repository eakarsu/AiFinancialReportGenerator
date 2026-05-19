import React, { useState } from 'react';
import { ClipboardList, Sparkles, Plus, Trash2, X, AlertTriangle } from 'lucide-react';
import { aiCovenantTracking } from '../services/api';

function AiCovenantTracking() {
  const [covenants, setCovenants] = useState([
    { name: 'Debt Service Coverage', threshold: 1.25, type: 'min' },
    { name: 'Debt-to-Equity', threshold: 2.0, type: 'max' }
  ]);
  const [financials, setFinancials] = useState({
    debt: 5000000,
    equity: 3000000,
    ebitda: 1200000,
    interestExpense: 400000,
    cashFlow: 800000,
    currentAssets: 2000000,
    currentLiabilities: 1000000
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateCovenant = (i, field, value) => {
    const next = [...covenants];
    next[i] = { ...next[i], [field]: field === 'threshold' ? Number(value) : value };
    setCovenants(next);
  };
  const addCovenant = () => setCovenants([...covenants, { name: '', threshold: 0, type: 'min' }]);
  const removeCovenant = (i) => setCovenants(covenants.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await aiCovenantTracking({ covenants, financials });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const data = result?.data || result || {};
  const evaluations = data.evaluations || data.results || [];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>AI Covenant Tracking</h2>
        <p style={{ color: '#64748b', margin: '4px 0 0' }}>Monitor debt covenant compliance and breach risk</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
          <h3>Covenants</h3>
          {covenants.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '8px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 2 }}>
                <label>Name</label>
                <input value={c.name} onChange={(e) => updateCovenant(i, 'name', e.target.value)} required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Threshold</label>
                <input type="number" step="0.01" value={c.threshold} onChange={(e) => updateCovenant(i, 'threshold', e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Type</label>
                <select value={c.type} onChange={(e) => updateCovenant(i, 'type', e.target.value)}>
                  <option value="min">Minimum</option>
                  <option value="max">Maximum</option>
                </select>
              </div>
              <button type="button" onClick={() => removeCovenant(i)} className="btn-secondary"><Trash2 size={14} /></button>
            </div>
          ))}
          <button type="button" onClick={addCovenant} className="btn-secondary"><Plus size={14} /> Add Covenant</button>
        </div>

        <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
          <h3>Financial Inputs</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {Object.keys(financials).map((k) => (
              <div key={k} className="form-group">
                <label>{k}</label>
                <input type="number" value={financials[k]}
                  onChange={(e) => setFinancials({ ...financials, [k]: Number(e.target.value) })} />
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
          <Sparkles size={16} /> {loading ? 'Evaluating...' : 'Evaluate Covenants'}
        </button>
      </form>

      {error && (
        <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <X size={18} /> {error}
        </div>
      )}

      {loading && <div className="loading" style={{ marginTop: 16 }}><div className="loading-spinner"></div></div>}

      {result && !loading && (
        <div className="card" style={{ padding: 24, marginTop: 16 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={20} /> Compliance Results
          </h3>
          {Array.isArray(evaluations) && evaluations.length > 0 ? (
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Covenant</th>
                  <th>Threshold</th>
                  <th>Computed</th>
                  <th>Status</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((e, i) => (
                  <tr key={i}>
                    <td>{e.name || e.covenant}</td>
                    <td>{e.threshold}</td>
                    <td>{e.computed || e.actual || e.value}</td>
                    <td style={{ color: e.status === 'breach' || e.compliant === false ? '#dc2626' : '#10b981', fontWeight: 600 }}>
                      {e.status || (e.compliant ? 'Compliant' : 'Breach')}
                    </td>
                    <td>{e.risk || e.breachRisk || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{JSON.stringify(result, null, 2)}</pre>
          )}
          {data.summary && (
            <div style={{ marginTop: 16, padding: 16, background: '#fffbeb', borderLeft: '4px solid #f59e0b', borderRadius: 4 }}>
              <strong style={{ display: 'flex', gap: 6, alignItems: 'center' }}><AlertTriangle size={16} /> Summary</strong>
              <p style={{ margin: '4px 0 0' }}>{data.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AiCovenantTracking;
