import React, { useState } from 'react';
import { downloadQuarterlyAnnualReportPdf } from '../services/api';

export default function QuarterlyAnnualReportPdf() {
  const [periodType, setPeriodType] = useState('annual');
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(1);
  const [companyName, setCompanyName] = useState('Acme Corporation');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lastFile, setLastFile] = useState(null);

  const handleGenerate = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = { period_type: periodType, year, company_name: companyName };
      if (periodType === 'quarterly') payload.quarter = quarter;
      const r = await downloadQuarterlyAnnualReportPdf(payload);
      const blob = new Blob([r.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const filename = `${periodType}_report_${year}${periodType === 'quarterly' ? `_Q${quarter}` : ''}.pdf`;
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      setLastFile(filename);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to generate PDF');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 24,
    }}>
      <h3 style={{ margin: 0, marginBottom: 12, color: '#1a3a5c' }}>
        Quarterly / Annual Financial Report (PDF)
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
        <label style={{ fontSize: 13 }}>
          Period Type
          <select
            value={periodType} onChange={(e) => setPeriodType(e.target.value)}
            style={{ display: 'block', marginTop: 4, padding: '6px', width: '100%' }}
          >
            <option value="annual">Annual</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </label>
        <label style={{ fontSize: 13 }}>
          Year
          <input
            type="number" value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10) || year)}
            style={{ display: 'block', marginTop: 4, padding: '6px', width: '100%' }}
          />
        </label>
        {periodType === 'quarterly' && (
          <label style={{ fontSize: 13 }}>
            Quarter
            <select
              value={quarter} onChange={(e) => setQuarter(parseInt(e.target.value, 10))}
              style={{ display: 'block', marginTop: 4, padding: '6px', width: '100%' }}
            >
              <option value={1}>Q1</option>
              <option value={2}>Q2</option>
              <option value={3}>Q3</option>
              <option value={4}>Q4</option>
            </select>
          </label>
        )}
        <label style={{ fontSize: 13 }}>
          Company Name
          <input
            type="text" value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            style={{ display: 'block', marginTop: 4, padding: '6px', width: '100%' }}
          />
        </label>
      </div>
      <button
        onClick={handleGenerate} disabled={busy}
        style={{
          background: busy ? '#9ca3af' : '#1a3a5c', color: 'white',
          border: 'none', padding: '10px 18px', borderRadius: 8,
          cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 600,
        }}
      >
        {busy ? 'Generating...' : 'Generate & Download PDF'}
      </button>
      {error && <div style={{ color: '#c00', marginTop: 8 }}>Error: {error}</div>}
      {lastFile && !error && (
        <div style={{ color: '#16a34a', marginTop: 8 }}>Downloaded: {lastFile}</div>
      )}
    </div>
  );
}
