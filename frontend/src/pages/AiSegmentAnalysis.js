import React, { useState } from 'react';
import { PieChart, Sparkles, Plus, Trash2, X } from 'lucide-react';
import { aiSegmentAnalysis } from '../services/api';

function AiSegmentAnalysis() {
  const [segments, setSegments] = useState([
    { name: 'Software', revenue: 5000000, opex: 3000000, capital: 2000000 },
    { name: 'Services', revenue: 2000000, opex: 1700000, capital: 500000 },
    { name: 'Hardware', revenue: 3000000, opex: 2800000, capital: 1500000 }
  ]);
  const [period, setPeriod] = useState('FY 2024');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateSegment = (i, field, value) => {
    const next = [...segments];
    next[i] = { ...next[i], [field]: field === 'name' ? value : Number(value) };
    setSegments(next);
  };
  const addSegment = () => setSegments([...segments, { name: '', revenue: 0, opex: 0, capital: 0 }]);
  const removeSegment = (i) => setSegments(segments.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await aiSegmentAnalysis({ segments, period });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const data = result?.data || result || {};
  const scoredSegments = data.segments || data.scored || [];
  const outperformers = data.outperformers || [];
  const underperformers = data.underperformers || [];
  const reallocations = data.reallocations || data.capital_reallocation || [];
  const strategicOptions = data.strategic_options || data.options || [];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>AI Segment Analysis</h2>
        <p style={{ color: '#64748b', margin: '4px 0 0' }}>Score business segments, identify outperformers, propose capital reallocation</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <div className="form-group">
            <label>Period</label>
            <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="FY 2024" />
          </div>
          <h3 style={{ marginTop: 16 }}>Segments</h3>
          {segments.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 2 }}>
                <label>Name</label>
                <input value={s.name} onChange={(e) => updateSegment(i, 'name', e.target.value)} required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Revenue</label>
                <input type="number" value={s.revenue} onChange={(e) => updateSegment(i, 'revenue', e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>OpEx</label>
                <input type="number" value={s.opex} onChange={(e) => updateSegment(i, 'opex', e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Capital</label>
                <input type="number" value={s.capital} onChange={(e) => updateSegment(i, 'capital', e.target.value)} />
              </div>
              <button type="button" onClick={() => removeSegment(i)} className="btn-secondary"><Trash2 size={14} /></button>
            </div>
          ))}
          <button type="button" onClick={addSegment} className="btn-secondary"><Plus size={14} /> Add Segment</button>
        </div>

        <button type="submit" disabled={loading} className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
          <Sparkles size={16} /> {loading ? 'Analyzing...' : 'Run Segment Analysis'}
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
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><PieChart size={20} /> Analysis Results</h3>

          {Array.isArray(scoredSegments) && scoredSegments.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4>Segment Scoring</h4>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr><th>Segment</th><th>Score</th><th>Margin</th><th>ROI</th><th>Comment</th></tr>
                </thead>
                <tbody>
                  {scoredSegments.map((s, i) => (
                    <tr key={i}>
                      <td>{s.name || s.segment}</td>
                      <td>{s.score || '-'}</td>
                      <td>{s.margin || '-'}</td>
                      <td>{s.roi || s.return || '-'}</td>
                      <td>{s.comment || s.assessment || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(outperformers) && outperformers.length > 0 && (
            <div style={{ marginBottom: 16, padding: 12, background: '#ecfdf5', borderLeft: '4px solid #10b981', borderRadius: 4 }}>
              <strong>Outperformers</strong>
              <ul style={{ margin: '4px 0 0' }}>{outperformers.map((o, i) => <li key={i}>{typeof o === 'string' ? o : (o.name || o.segment)}</li>)}</ul>
            </div>
          )}

          {Array.isArray(underperformers) && underperformers.length > 0 && (
            <div style={{ marginBottom: 16, padding: 12, background: '#fef2f2', borderLeft: '4px solid #ef4444', borderRadius: 4 }}>
              <strong>Underperformers</strong>
              <ul style={{ margin: '4px 0 0' }}>{underperformers.map((o, i) => <li key={i}>{typeof o === 'string' ? o : (o.name || o.segment)}</li>)}</ul>
            </div>
          )}

          {Array.isArray(reallocations) && reallocations.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4>Capital Reallocation</h4>
              <ul>{reallocations.map((r, i) => <li key={i}>{typeof r === 'string' ? r : (r.action || `${r.from} -> ${r.to}: ${r.amount}`)}</li>)}</ul>
            </div>
          )}

          {Array.isArray(strategicOptions) && strategicOptions.length > 0 && (
            <div>
              <h4>Strategic Options</h4>
              <ul>{strategicOptions.map((o, i) => <li key={i}>{typeof o === 'string' ? o : (o.option || o.recommendation)}</li>)}</ul>
            </div>
          )}

          {!scoredSegments.length && !outperformers.length && !reallocations.length && (
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{JSON.stringify(result, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}

export default AiSegmentAnalysis;
