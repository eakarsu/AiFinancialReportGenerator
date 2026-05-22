import React, { useEffect, useState } from 'react';
import { getExpenseCategoryHeatmap } from '../services/api';

function cellColor(v, max) {
  if (!v || !max) return '#f3f4f6';
  const r = Math.min(1, v / max);
  // From light yellow to deep red
  const hue = 50 - r * 50; // 50 (yellow) to 0 (red)
  const sat = 70 + r * 20;
  const light = 90 - r * 50;
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

export default function ExpenseCategoryHeatmap({ year: yearProp }) {
  const [year, setYear] = useState(yearProp || new Date().getFullYear());
  const [data, setData] = useState({ months: [], categories: [], matrix: {}, max: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getExpenseCategoryHeatmap(year)
      .then((r) => {
        if (!alive) return;
        setData(r.data || { months: [], categories: [], matrix: {}, max: 0 });
        setError(null);
      })
      .catch((e) => alive && setError(e.message || 'Failed to load heatmap'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [year]);

  const { months, categories, matrix, max } = data;

  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 24,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: '#1a3a5c' }}>Expense Category Heatmap</h3>
        <label style={{ fontSize: 13, color: '#555' }}>
          Year:
          <input
            type="number" value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10) || year)}
            style={{ marginLeft: 6, width: 90, padding: '4px 6px' }}
          />
        </label>
      </div>
      {loading && <div style={{ color: '#888' }}>Loading...</div>}
      {error && <div style={{ color: '#c00' }}>Error: {error}</div>}
      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          {categories.length === 0 ? (
            <div style={{ color: '#888', padding: 12 }}>No expense data for {year}.</div>
          ) : (
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ddd' }}>Category</th>
                  {months.map((m) => (
                    <th key={m} style={{ padding: '6px 4px', borderBottom: '1px solid #ddd', textAlign: 'center' }}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat}>
                    <td style={{ padding: '6px 8px', fontWeight: 600, color: '#333' }}>{cat}</td>
                    {(matrix[cat] || []).map((v, i) => (
                      <td
                        key={i}
                        title={`${cat} - ${months[i]}: $${Number(v).toLocaleString()}`}
                        style={{
                          padding: '8px 6px',
                          textAlign: 'center',
                          background: cellColor(v, max),
                          color: v > max * 0.6 ? 'white' : '#333',
                          border: '1px solid #fff',
                          minWidth: 50,
                        }}
                      >
                        {v ? Math.round(v).toLocaleString() : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
            Max cell value: ${Number(max).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
