import React, { useEffect, useState } from 'react';

function RevenueRecognitionDrift() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/revenue-recognition-drift', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    })
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ error: 'Unable to load revenue recognition drift.' }));
  }, []);

  if (!data) return <div className="loading-spinner" />;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Revenue Recognition Drift</h1>
        <p>Close-readiness checks for recognized revenue, billing evidence, and deferred revenue exposure.</p>
      </div>
      <div className="dashboard-grid">
        <div className="metric-card"><span>Drift Score</span><strong>{data.summary?.driftScore}</strong></div>
        <div className="metric-card"><span>High Risk Contracts</span><strong>{data.summary?.highRiskContracts}</strong></div>
        <div className="metric-card"><span>Deferred Gap</span><strong>${data.summary?.deferredRevenueGap?.toLocaleString()}</strong></div>
        <div className="metric-card"><span>Priority</span><strong>{data.summary?.reviewPriority}</strong></div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Segment</th><th>Recognized</th><th>Billed</th><th>Drift</th><th>Status</th></tr></thead>
          <tbody>{data.cohorts?.map((row) => (
            <tr key={row.segment}>
              <td>{row.segment}</td><td>${row.recognized.toLocaleString()}</td><td>${row.billed.toLocaleString()}</td><td>{row.drift}%</td><td>{row.status}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="card">
        <h2>Control Actions</h2>
        <ul>{data.controls?.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
    </div>
  );
}

export default RevenueRecognitionDrift;
