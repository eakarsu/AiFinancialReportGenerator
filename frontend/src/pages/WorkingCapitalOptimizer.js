import React, { useState, useEffect } from 'react';
import { Wallet, RefreshCw, Brain, TrendingUp, DollarSign, Clock, ArrowRight, Activity } from 'lucide-react';
import * as api from '../services/api';

function WorkingCapitalOptimizer() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [result, setResult] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [inputs, setInputs] = useState({
    analysis_name: 'Working Capital Analysis',
    accounts_receivable: 500000,
    inventory: 300000,
    accounts_payable: 200000,
    revenue: 2000000,
    cogs: 1200000,
    industry: 'technology',
    forecast_months: 6
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await api.getCompanies();
      setCompanies(response.data);
      if (response.data.length > 0) setSelectedCompany(response.data[0].id);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const analyzeWorkingCapital = async () => {
    setLoading(true);
    try {
      const response = await api.analyzeWorkingCapital({
        company_id: selectedCompany,
        ...inputs
      });
      setResult(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAIRecommendations = async () => {
    if (!result) return;
    setAnalyzing(true);
    try {
      const response = await api.getWorkingCapitalRecommendations({
        company_id: selectedCompany,
        analysis: result,
        inputs
      });
      setRecommendations(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'N/A';
    if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (Math.abs(num) >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(0)}`;
  };

  const formatDays = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'N/A';
    return `${num.toFixed(1)} days`;
  };

  const safeToFixed = (value, decimals = 2) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'N/A';
    return num.toFixed(decimals);
  };

  const industries = [
    { value: 'technology', label: 'Technology' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'retail', label: 'Retail' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'services', label: 'Services' },
    { value: 'financial', label: 'Financial Services' }
  ];

  return (
    <div className="working-capital-page">
      <div className="page-header">
        <div className="header-content">
          <h1><Wallet size={28} /> Working Capital Optimizer</h1>
          <p>Analyze cash conversion cycle and optimize working capital efficiency</p>
        </div>
        <div className="header-actions">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="company-select">
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={analyzeWorkingCapital} disabled={loading}>
            {loading ? <RefreshCw size={16} className="spinning" /> : <Activity size={16} />} Analyze
          </button>
        </div>
      </div>

      <div className="wc-layout">
        <div className="inputs-panel">
          <h3><DollarSign size={20} /> Working Capital Inputs</h3>

          <div className="input-section">
            <label>Industry
              <select value={inputs.industry} onChange={(e) => setInputs({...inputs, industry: e.target.value})}>
                {industries.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </label>
          </div>

          <div className="input-section">
            <h4>Balance Sheet Items</h4>
            <label>Accounts Receivable ($)
              <input type="number" value={inputs.accounts_receivable} onChange={(e) => setInputs({...inputs, accounts_receivable: parseFloat(e.target.value) || 0})} />
            </label>
            <label>Inventory ($)
              <input type="number" value={inputs.inventory} onChange={(e) => setInputs({...inputs, inventory: parseFloat(e.target.value) || 0})} />
            </label>
            <label>Accounts Payable ($)
              <input type="number" value={inputs.accounts_payable} onChange={(e) => setInputs({...inputs, accounts_payable: parseFloat(e.target.value) || 0})} />
            </label>
          </div>

          <div className="input-section">
            <h4>Income Statement Items</h4>
            <label>Annual Revenue ($)
              <input type="number" value={inputs.revenue} onChange={(e) => setInputs({...inputs, revenue: parseFloat(e.target.value) || 0})} />
            </label>
            <label>Cost of Goods Sold ($)
              <input type="number" value={inputs.cogs} onChange={(e) => setInputs({...inputs, cogs: parseFloat(e.target.value) || 0})} />
            </label>
          </div>

          <div className="quick-metrics">
            <h4>Current Working Capital</h4>
            <div className="metric-row">
              <span>Net Working Capital:</span>
              <span className="value">{formatCurrency(inputs.accounts_receivable + inputs.inventory - inputs.accounts_payable)}</span>
            </div>
          </div>
        </div>

        <div className="results-panel">
          {result ? (
            <>
              <div className="cycle-visualization">
                <h3><Clock size={20} /> Cash Conversion Cycle</h3>
                <div className="cycle-diagram">
                  <div className="cycle-item dso">
                    <span className="label">DSO</span>
                    <span className="value">{formatDays(result.metrics?.dso)}</span>
                    <span className="sub">Days Sales Outstanding</span>
                  </div>
                  <ArrowRight size={24} className="arrow" />
                  <div className="cycle-item dio">
                    <span className="label">DIO</span>
                    <span className="value">{formatDays(result.metrics?.dio)}</span>
                    <span className="sub">Days Inventory Outstanding</span>
                  </div>
                  <ArrowRight size={24} className="arrow" />
                  <div className="cycle-item dpo">
                    <span className="label">DPO</span>
                    <span className="value">{formatDays(result.metrics?.dpo)}</span>
                    <span className="sub">Days Payable Outstanding</span>
                  </div>
                </div>
                <div className="ccc-result">
                  <span className="label">Cash Conversion Cycle (DSO + DIO - DPO)</span>
                  <span className={`value ${result.metrics?.cashConversionCycle < 0 ? 'positive' : ''}`}>
                    {formatDays(result.metrics?.cashConversionCycle)}
                  </span>
                </div>
              </div>

              <div className="metrics-grid">
                <div className="metric-card">
                  <span className="label">Working Capital</span>
                  <span className="value">{formatCurrency(result.metrics?.workingCapital)}</span>
                </div>
                <div className="metric-card">
                  <span className="label">Working Capital Turnover</span>
                  <span className="value">{safeToFixed(result.metrics?.workingCapitalTurnover)}x</span>
                </div>
                <div className="metric-card">
                  <span className="label">Current Ratio</span>
                  <span className="value">{safeToFixed(result.metrics?.currentRatio)}</span>
                </div>
                <div className="metric-card highlight">
                  <span className="label">Optimization Potential</span>
                  <span className="value">{formatCurrency(result.optimization?.potential)}</span>
                </div>
              </div>

              {result.benchmarks && (
                <div className="benchmarks-section">
                  <h4>Industry Benchmarks ({inputs.industry})</h4>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Your Value</th>
                        <th>Industry Avg</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>DSO</td>
                        <td>{formatDays(result.metrics?.dso)}</td>
                        <td>{formatDays(result.benchmarks?.dso)}</td>
                        <td>
                          <span className={`status ${result.metrics?.dso <= result.benchmarks?.dso ? 'good' : 'warning'}`}>
                            {result.metrics?.dso <= result.benchmarks?.dso ? 'Good' : 'Above Avg'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>DIO</td>
                        <td>{formatDays(result.metrics?.dio)}</td>
                        <td>{formatDays(result.benchmarks?.dio)}</td>
                        <td>
                          <span className={`status ${result.metrics?.dio <= result.benchmarks?.dio ? 'good' : 'warning'}`}>
                            {result.metrics?.dio <= result.benchmarks?.dio ? 'Good' : 'Above Avg'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>DPO</td>
                        <td>{formatDays(result.metrics?.dpo)}</td>
                        <td>{formatDays(result.benchmarks?.dpo)}</td>
                        <td>
                          <span className={`status ${result.metrics?.dpo >= result.benchmarks?.dpo ? 'good' : 'warning'}`}>
                            {result.metrics?.dpo >= result.benchmarks?.dpo ? 'Good' : 'Below Avg'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>CCC</td>
                        <td>{formatDays(result.metrics?.cashConversionCycle)}</td>
                        <td>{formatDays(result.benchmarks?.ccc)}</td>
                        <td>
                          <span className={`status ${result.metrics?.cashConversionCycle <= result.benchmarks?.ccc ? 'good' : 'warning'}`}>
                            {result.metrics?.cashConversionCycle <= result.benchmarks?.ccc ? 'Good' : 'Above Avg'}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <div className="actions">
                <button className="btn btn-secondary" onClick={getAIRecommendations} disabled={analyzing}>
                  {analyzing ? <RefreshCw size={16} className="spinning" /> : <Brain size={16} />} AI Recommendations
                </button>
              </div>

              {recommendations && (
                <div className="ai-recommendations">
                  <h4><Brain size={18} /> AI Working Capital Recommendations</h4>
                  {recommendations.summary && <p className="summary">{recommendations.summary}</p>}

                  {recommendations.arRecommendations && (
                    <div className="rec-section">
                      <h5>Accounts Receivable Optimization</h5>
                      <ul>{recommendations.arRecommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
                    </div>
                  )}

                  {recommendations.inventoryRecommendations && (
                    <div className="rec-section">
                      <h5>Inventory Management</h5>
                      <ul>{recommendations.inventoryRecommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
                    </div>
                  )}

                  {recommendations.apRecommendations && (
                    <div className="rec-section">
                      <h5>Accounts Payable Strategy</h5>
                      <ul>{recommendations.apRecommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
                    </div>
                  )}

                  {recommendations.potentialSavings && (
                    <div className="savings-summary">
                      <span>Potential Annual Savings:</span>
                      <span className="amount">{formatCurrency(recommendations.potentialSavings)}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <Wallet size={60} />
              <h3>Working Capital Analysis</h3>
              <p>Enter your financial data to analyze cash conversion cycle and get optimization recommendations</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .working-capital-page { padding: 0; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
        .header-content h1 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 0.5rem 0; color: #f1f5f9; }
        .header-content p { color: #94a3b8; margin: 0; }
        .header-actions { display: flex; gap: 0.75rem; align-items: center; }
        .company-select { padding: 0.5rem 1rem; background: #1e293b; border: 1px solid #334155; border-radius: 0.5rem; color: #f1f5f9; min-width: 200px; }
        .btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 0.5rem; border: none; cursor: pointer; font-weight: 500; }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-secondary { background: #334155; color: #f1f5f9; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .wc-layout { display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; }
        .inputs-panel { background: #1e293b; border: 1px solid #334155; border-radius: 0.75rem; padding: 1.5rem; height: fit-content; }
        .inputs-panel h3 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 1.5rem; color: #f1f5f9; }

        .input-section { margin-bottom: 1.5rem; }
        .input-section h4 { color: #94a3b8; font-size: 0.9rem; margin: 0 0 0.75rem; }
        .input-section label { display: flex; flex-direction: column; gap: 0.25rem; color: #94a3b8; font-size: 0.85rem; margin-bottom: 0.75rem; }
        .input-section input, .input-section select { padding: 0.5rem; background: #0f172a; border: 1px solid #334155; border-radius: 0.375rem; color: #f1f5f9; }

        .quick-metrics { padding-top: 1rem; border-top: 1px solid #334155; }
        .quick-metrics h4 { color: #94a3b8; font-size: 0.85rem; margin: 0 0 0.75rem; }
        .metric-row { display: flex; justify-content: space-between; color: #94a3b8; font-size: 0.85rem; }
        .metric-row .value { color: #3b82f6; font-weight: 600; }

        .results-panel { background: #1e293b; border: 1px solid #334155; border-radius: 0.75rem; padding: 1.5rem; }

        .cycle-visualization { margin-bottom: 1.5rem; }
        .cycle-visualization h3 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 1.5rem; color: #f1f5f9; }
        .cycle-diagram { display: flex; align-items: center; justify-content: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
        .cycle-item { background: #0f172a; padding: 1.25rem; border-radius: 0.5rem; text-align: center; min-width: 140px; }
        .cycle-item.dso { border: 2px solid #3b82f6; }
        .cycle-item.dio { border: 2px solid #f59e0b; }
        .cycle-item.dpo { border: 2px solid #22c55e; }
        .cycle-item .label { display: block; color: #94a3b8; font-size: 0.8rem; font-weight: 600; }
        .cycle-item .value { display: block; color: #f1f5f9; font-size: 1.25rem; font-weight: 700; margin: 0.25rem 0; }
        .cycle-item .sub { display: block; color: #64748b; font-size: 0.7rem; }
        .arrow { color: #475569; }

        .ccc-result { background: #0f172a; padding: 1rem; border-radius: 0.5rem; text-align: center; border: 2px solid #8b5cf6; }
        .ccc-result .label { display: block; color: #94a3b8; font-size: 0.85rem; margin-bottom: 0.5rem; }
        .ccc-result .value { display: block; color: #8b5cf6; font-size: 1.5rem; font-weight: 700; }
        .ccc-result .value.positive { color: #22c55e; }

        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .metric-card { background: #0f172a; padding: 1rem; border-radius: 0.5rem; text-align: center; }
        .metric-card.highlight { border: 2px solid #22c55e; }
        .metric-card .label { display: block; color: #94a3b8; font-size: 0.8rem; margin-bottom: 0.5rem; }
        .metric-card .value { display: block; color: #f1f5f9; font-size: 1.1rem; font-weight: 700; }
        .metric-card.highlight .value { color: #22c55e; }

        .benchmarks-section { margin-bottom: 1.5rem; }
        .benchmarks-section h4 { color: #f1f5f9; margin: 0 0 1rem; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #334155; }
        .data-table th { color: #94a3b8; font-weight: 600; }
        .data-table td { color: #f1f5f9; }
        .status { padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600; }
        .status.good { background: #22c55e20; color: #22c55e; }
        .status.warning { background: #f59e0b20; color: #f59e0b; }

        .actions { margin-top: 1.5rem; }
        .ai-recommendations { margin-top: 1.5rem; background: #0f172a; padding: 1.5rem; border-radius: 0.5rem; }
        .ai-recommendations h4 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 1rem; color: #f1f5f9; }
        .ai-recommendations .summary { color: #e2e8f0; line-height: 1.6; margin-bottom: 1rem; }
        .rec-section { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #334155; }
        .rec-section h5 { color: #94a3b8; font-size: 0.9rem; margin: 0 0 0.5rem; }
        .rec-section ul { margin: 0; padding-left: 1.25rem; }
        .rec-section li { color: #e2e8f0; font-size: 0.9rem; margin-bottom: 0.5rem; }
        .savings-summary { margin-top: 1.5rem; padding: 1rem; background: #1e293b; border-radius: 0.375rem; display: flex; justify-content: space-between; align-items: center; }
        .savings-summary span { color: #94a3b8; }
        .savings-summary .amount { color: #22c55e; font-size: 1.25rem; font-weight: 700; }

        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; color: #94a3b8; text-align: center; }
        .empty-state h3 { margin: 1rem 0 0.5rem; color: #f1f5f9; }

        @media (max-width: 900px) { .wc-layout { grid-template-columns: 1fr; } .cycle-diagram { flex-direction: column; } .arrow { transform: rotate(90deg); } }
      `}</style>
    </div>
  );
}

export default WorkingCapitalOptimizer;
