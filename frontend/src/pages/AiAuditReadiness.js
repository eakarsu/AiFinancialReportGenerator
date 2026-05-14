import React, { useState } from 'react';
import { Shield, Sparkles, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { aiAuditReadiness } from '../services/api';

function AiAuditReadiness() {
  const [form, setForm] = useState({
    company_name: '',
    audit_type: 'financial',
    period: 'FY 2024',
    documents_available: 'Trial balance, GL, AR aging, AP aging',
    known_issues: '',
    last_audit_findings: ''
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await aiAuditReadiness(form);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const data = result?.data || result || {};
  const findings = data.findings || data.issues || [];
  const docGaps = data.document_gaps || data.documentGaps || [];
  const controlWeaknesses = data.control_weaknesses || data.controlWeaknesses || [];
  const remediation = data.remediation || data.actions || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>AI Audit Readiness</h2>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>Pre-audit findings preview with severity & remediation actions</p>
        </div>
      </div>

      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Company Name</label>
              <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Acme Corp" required />
            </div>
            <div className="form-group">
              <label>Audit Type</label>
              <select value={form.audit_type} onChange={(e) => setForm({ ...form, audit_type: e.target.value })}>
                <option value="financial">Financial</option>
                <option value="operational">Operational</option>
                <option value="compliance">Compliance</option>
                <option value="tax">Tax</option>
              </select>
            </div>
            <div className="form-group">
              <label>Period</label>
              <input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="FY 2024" required />
            </div>
            <div className="form-group">
              <label>Documents Available</label>
              <input value={form.documents_available} onChange={(e) => setForm({ ...form, documents_available: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Known Issues</label>
            <textarea rows={3} value={form.known_issues} onChange={(e) => setForm({ ...form, known_issues: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Last Audit Findings</label>
            <textarea rows={3} value={form.last_audit_findings} onChange={(e) => setForm({ ...form, last_audit_findings: e.target.value })} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
            <Sparkles size={16} /> {loading ? 'Analyzing...' : 'Generate Readiness Report'}
          </button>
        </form>
      </div>

      {error && (
        <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', marginBottom: '24px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <X size={18} /> {error}
        </div>
      )}

      {loading && (
        <div className="loading"><div className="loading-spinner"></div></div>
      )}

      {result && !loading && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Shield size={24} color="#4f46e5" />
            <h3 style={{ margin: 0 }}>Readiness Report</h3>
            {data.readiness_score !== undefined && (
              <span style={{ marginLeft: 'auto', padding: '6px 16px', background: '#eff6ff', borderRadius: '20px', color: '#1e40af', fontWeight: 700 }}>
                Score: {data.readiness_score}/100
              </span>
            )}
          </div>

          {data.summary && (
            <div style={{ padding: '16px', background: 'linear-gradient(135deg, #eff6ff, #f5f3ff)', borderRadius: '8px', marginBottom: '20px' }}>
              <p style={{ margin: 0, color: '#334155', lineHeight: 1.6 }}>{data.summary}</p>
            </div>
          )}

          {Array.isArray(findings) && findings.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#92400e' }}><AlertTriangle size={18} /> Findings</h4>
              {findings.map((f, i) => (
                <div key={i} style={{ padding: '12px 16px', background: '#fffbeb', borderLeft: '4px solid #f59e0b', borderRadius: '4px', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 600 }}>{typeof f === 'string' ? f : f.title || f.finding}</div>
                  {typeof f === 'object' && f.severity && (
                    <span style={{ fontSize: '12px', color: '#78350f' }}>Severity: {f.severity}</span>
                  )}
                  {typeof f === 'object' && f.description && <div style={{ fontSize: '14px', color: '#475569', marginTop: 4 }}>{f.description}</div>}
                </div>
              ))}
            </div>
          )}

          {Array.isArray(docGaps) && docGaps.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4>Document Gaps</h4>
              <ul>{docGaps.map((d, i) => <li key={i}>{typeof d === 'string' ? d : d.gap || d.document}</li>)}</ul>
            </div>
          )}

          {Array.isArray(controlWeaknesses) && controlWeaknesses.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4>Control Weaknesses</h4>
              <ul>{controlWeaknesses.map((c, i) => <li key={i}>{typeof c === 'string' ? c : c.weakness || c.control}</li>)}</ul>
            </div>
          )}

          {Array.isArray(remediation) && remediation.length > 0 && (
            <div>
              <h4 style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#065f46' }}><CheckCircle size={18} /> Remediation Actions</h4>
              {remediation.map((r, i) => (
                <div key={i} style={{ padding: '12px 16px', background: '#ecfdf5', borderLeft: '4px solid #10b981', borderRadius: '4px', marginBottom: '8px' }}>
                  {typeof r === 'string' ? r : (r.action || r.recommendation)}
                </div>
              ))}
            </div>
          )}

          {!findings.length && !docGaps.length && !controlWeaknesses.length && !remediation.length && (
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '13px' }}>{JSON.stringify(result, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}

export default AiAuditReadiness;
