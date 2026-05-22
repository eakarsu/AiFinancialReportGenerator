import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, Legend, CartesianGrid,
} from 'recharts';
import { getRevenueExpenseTrend } from '../services/api';

export default function RevenueExpenseTrendChart({ year: yearProp }) {
  const [year, setYear] = useState(yearProp || new Date().getFullYear());
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({ revenue: 0, expense: 0, net: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getRevenueExpenseTrend(year)
      .then((r) => {
        if (!alive) return;
        setData(r.data?.series || []);
        setTotals(r.data?.totals || { revenue: 0, expense: 0, net: 0 });
        setError(null);
      })
      .catch((e) => alive && setError(e.message || 'Failed to load trend'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [year]);

  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 24,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: '#1a3a5c' }}>Revenue / Expense Trend</h3>
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
        <>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot />
                <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot />
                <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 12, fontSize: 14 }}>
            <span><strong style={{ color: '#22c55e' }}>Revenue:</strong> ${Number(totals.revenue).toLocaleString()}</span>
            <span><strong style={{ color: '#ef4444' }}>Expense:</strong> ${Number(totals.expense).toLocaleString()}</span>
            <span><strong style={{ color: '#3b82f6' }}>Net:</strong> ${Number(totals.net).toLocaleString()}</span>
          </div>
        </>
      )}
    </div>
  );
}
