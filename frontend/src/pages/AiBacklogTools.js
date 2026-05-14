import React, { useState, useEffect } from 'react';
import {
  aiAgenticCFO, aiPredictiveCashFlow, aiESGFinancialLinkage,
  aiRealtimeKPIs, aiConsolidate, aiCreateApproval, aiListApprovals,
  aiDecideApproval, aiQuickBooksStatus, aiNetSuiteStatus, aiFXRates,
} from '../services/api';

const TABS = [
  ['cfo', 'Agentic CFO'],
  ['cash', 'Predictive Cash Flow'],
  ['esg', 'ESG Linkage'],
  ['kpi', 'Real-time KPIs'],
  ['consol', 'Consolidate'],
  ['approve', 'Approvals'],
  ['integrate', 'Integrations'],
];

function Pre({ data }) {
  if (data === null || data === undefined) return null;
  return <pre style={{ background: '#0f172a', color: '#a7f3d0', padding: 14, borderRadius: 8, overflow: 'auto', fontSize: 12 }}>{typeof data === 'string' ? data : JSON.stringify(data, null, 2)}</pre>;
}

function Err({ msg }) {
  if (!msg) return null;
  return <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 10, borderRadius: 6, marginTop: 8 }}>{msg}</div>;
}

function ErrPayload({ payload }) {
  if (!payload) return null;
  return <Pre data={payload} />;
}

function CFOPanel() {
  const [q, setQ] = useState('Should we invest in expanding our European software segment vs. paying down debt?');
  const [companyId, setCompanyId] = useState('');
  const [out, setOut] = useState(null);
  const [err, setErr] = useState(null);
  const [errPayload, setErrPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true); setErr(null); setOut(null); setErrPayload(null);
    try {
      const r = await aiAgenticCFO({ question: q, company_id: companyId ? Number(companyId) : undefined });
      setOut(r.data);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
      setErrPayload(e.response?.data || null);
    }
    setLoading(false);
  };
  return (
    <div className="card" style={{ padding: 24 }}>
      <h3>Agentic CFO</h3>
      <div className="form-group"><label>Question</label><textarea rows={3} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="form-group"><label>Company ID (optional)</label><input value={companyId} onChange={(e) => setCompanyId(e.target.value)} /></div>
      <button onClick={run} disabled={loading} className="btn-primary">{loading ? 'Running...' : 'Run'}</button>
      <Err msg={err} />
      <ErrPayload payload={errPayload} />
      <Pre data={out} />
    </div>
  );
}

function CashPanel() {
  const [body, setBody] = useState({ opening_cash: 250000, monthly_burn: 80000, horizon_days: 90, ar_aging: { '0-30': 50000, '31-60': 30000, '61-90': 10000 }, ap_aging: { '0-30': 25000, '31-60': 15000 } });
  const [text, setText] = useState(JSON.stringify(body, null, 2));
  const [out, setOut] = useState(null); const [err, setErr] = useState(null); const [errPayload, setErrPayload] = useState(null); const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true); setErr(null); setOut(null); setErrPayload(null);
    try {
      const parsed = JSON.parse(text);
      const r = await aiPredictiveCashFlow(parsed);
      setOut(r.data);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
      setErrPayload(e.response?.data || null);
    }
    setLoading(false);
  };
  return (
    <div className="card" style={{ padding: 24 }}>
      <h3>Predictive Cash Flow</h3>
      <div className="form-group"><label>Body (JSON)</label><textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} /></div>
      <button onClick={run} disabled={loading} className="btn-primary">{loading ? 'Predicting...' : 'Predict'}</button>
      <Err msg={err} />
      <ErrPayload payload={errPayload} />
      <Pre data={out} />
    </div>
  );
}

function ESGPanel() {
  const [text, setText] = useState(JSON.stringify({ initiatives: [
    { name: 'Solar rooftop', category: 'E', cost: 500000, expected_benefit: 'reduce energy 30%' },
    { name: 'Apprenticeship program', category: 'S', cost: 120000, expected_benefit: 'workforce pipeline' },
  ] }, null, 2));
  const [out, setOut] = useState(null); const [err, setErr] = useState(null); const [errPayload, setErrPayload] = useState(null); const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true); setErr(null); setOut(null); setErrPayload(null);
    try {
      const r = await aiESGFinancialLinkage(JSON.parse(text));
      setOut(r.data);
    } catch (e) { setErr(e.response?.data?.error || e.message); setErrPayload(e.response?.data || null); }
    setLoading(false);
  };
  return (
    <div className="card" style={{ padding: 24 }}>
      <h3>ESG Financial Linkage</h3>
      <div className="form-group"><label>Body (JSON)</label><textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} /></div>
      <button onClick={run} disabled={loading} className="btn-primary">{loading ? 'Analyzing...' : 'Analyze'}</button>
      <Err msg={err} />
      <ErrPayload payload={errPayload} />
      <Pre data={out} />
    </div>
  );
}

function KPIPanel() {
  const [companyId, setCompanyId] = useState('');
  const [out, setOut] = useState(null); const [err, setErr] = useState(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!polling) return;
    let id;
    const tick = async () => {
      try {
        const r = await aiRealtimeKPIs(companyId || undefined);
        setOut(r.data); setErr(null);
      } catch (e) { setErr(e.response?.data?.error || e.message); }
    };
    tick();
    id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [polling, companyId]);

  return (
    <div className="card" style={{ padding: 24 }}>
      <h3>Real-time KPIs (polling 5s)</h3>
      <div className="form-group"><label>Company ID (optional)</label><input value={companyId} onChange={(e) => setCompanyId(e.target.value)} /></div>
      <button onClick={() => setPolling((p) => !p)} className="btn-primary">{polling ? 'Stop' : 'Start polling'}</button>
      <Err msg={err} />
      <Pre data={out} />
    </div>
  );
}

function ConsolPanel() {
  const [text, setText] = useState(JSON.stringify({ entities: [
    { name: 'Parent Co', statements: { revenue: 5000000, expenses: 3500000 } },
    { name: 'Sub A', statements: { revenue: 2000000, expenses: 1700000 } },
  ], elims: [] , period: 'FY2025' }, null, 2));
  const [out, setOut] = useState(null); const [err, setErr] = useState(null); const [errPayload, setErrPayload] = useState(null); const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true); setErr(null); setOut(null); setErrPayload(null);
    try { const r = await aiConsolidate(JSON.parse(text)); setOut(r.data); }
    catch (e) { setErr(e.response?.data?.error || e.message); setErrPayload(e.response?.data || null); }
    setLoading(false);
  };
  return (
    <div className="card" style={{ padding: 24 }}>
      <h3>Consolidate Entities</h3>
      <div className="form-group"><label>Body (JSON)</label><textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} /></div>
      <button onClick={run} disabled={loading} className="btn-primary">{loading ? 'Consolidating...' : 'Consolidate'}</button>
      <Err msg={err} />
      <ErrPayload payload={errPayload} />
      <Pre data={out} />
    </div>
  );
}

function ApprovePanel() {
  const [list, setList] = useState([]);
  const [resourceType, setResourceType] = useState('expense');
  const [amount, setAmount] = useState('1500');
  const [comment, setComment] = useState('Q4 software license');
  const [err, setErr] = useState(null);
  const refresh = async () => {
    try { const r = await aiListApprovals(); setList(r.data || []); setErr(null); }
    catch (e) { setErr(e.response?.data?.error || e.message); }
  };
  useEffect(() => { refresh(); }, []);
  const create = async () => {
    try { await aiCreateApproval({ resource_type: resourceType, amount: Number(amount), comment }); await refresh(); }
    catch (e) { setErr(e.response?.data?.error || e.message); }
  };
  const decide = async (id, decision) => {
    try { await aiDecideApproval(id, { decision }); await refresh(); }
    catch (e) { setErr(e.response?.data?.error || e.message); }
  };
  return (
    <div className="card" style={{ padding: 24 }}>
      <h3>Approval Workflow</h3>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 12 }}>
        <div className="form-group" style={{ flex: 1 }}><label>Resource Type</label><input value={resourceType} onChange={(e) => setResourceType(e.target.value)} /></div>
        <div className="form-group" style={{ flex: 1 }}><label>Amount</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div className="form-group" style={{ flex: 2 }}><label>Comment</label><input value={comment} onChange={(e) => setComment(e.target.value)} /></div>
        <button onClick={create} className="btn-primary">Submit</button>
      </div>
      <Err msg={err} />
      <table style={{ width: '100%', fontSize: 13 }}>
        <thead><tr><th>ID</th><th>Type</th><th>Amount</th><th>State</th><th>Comment</th><th>Action</th></tr></thead>
        <tbody>
          {list.map((a) => (
            <tr key={a.id}>
              <td>{a.id}</td><td>{a.resource_type}</td><td>{a.amount}</td><td>{a.state}</td><td>{a.comment}</td>
              <td>
                {a.state === 'pending' && <>
                  <button onClick={() => decide(a.id, 'approved')} className="btn-secondary" style={{ marginRight: 4 }}>Approve</button>
                  <button onClick={() => decide(a.id, 'rejected')} className="btn-secondary">Reject</button>
                </>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IntegratePanel() {
  const [qb, setQb] = useState(null); const [ns, setNs] = useState(null); const [fx, setFx] = useState(null);
  const [err, setErr] = useState(null);
  const checkQB = async () => { try { const r = await aiQuickBooksStatus(); setQb(r.data); setErr(null); } catch (e) { setQb(e.response?.data || { error: e.message }); } };
  const checkNS = async () => { try { const r = await aiNetSuiteStatus(); setNs(r.data); setErr(null); } catch (e) { setNs(e.response?.data || { error: e.message }); } };
  const checkFX = async () => { try { const r = await aiFXRates('USD'); setFx(r.data); setErr(null); } catch (e) { setFx(e.response?.data || { error: e.message }); } };
  return (
    <div className="card" style={{ padding: 24 }}>
      <h3>Integrations Status (NEEDS-CREDS gated)</h3>
      <p style={{ color: '#64748b' }}>Each returns 503 with `missing: ENV_NAME` when env is unset.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={checkQB} className="btn-primary">Check QuickBooks</button>
        <button onClick={checkNS} className="btn-primary">Check NetSuite</button>
        <button onClick={checkFX} className="btn-primary">Fetch FX Rates</button>
      </div>
      <Err msg={err} />
      <h4>QuickBooks</h4><Pre data={qb} />
      <h4>NetSuite</h4><Pre data={ns} />
      <h4>FX</h4><Pre data={fx} />
    </div>
  );
}

export default function AiBacklogTools() {
  const [tab, setTab] = useState('cfo');
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>AI Backlog Tools</h2>
        <p style={{ color: '#64748b', margin: '4px 0 0' }}>Apply pass 5 — agentic CFO, cash flow, ESG, real-time KPIs, consolidation, approvals, integrations.</p>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={tab === k ? 'btn-primary' : 'btn-secondary'} style={{ padding: '6px 14px' }}>{l}</button>
        ))}
      </div>
      {tab === 'cfo' && <CFOPanel />}
      {tab === 'cash' && <CashPanel />}
      {tab === 'esg' && <ESGPanel />}
      {tab === 'kpi' && <KPIPanel />}
      {tab === 'consol' && <ConsolPanel />}
      {tab === 'approve' && <ApprovePanel />}
      {tab === 'integrate' && <IntegratePanel />}
    </div>
  );
}
