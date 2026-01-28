import React, { useState, useEffect } from 'react';
import { Target, Calculator, RefreshCw, Brain, TrendingUp, DollarSign, Activity } from 'lucide-react';
import * as api from '../services/api';

function BreakEvenAnalysis() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [result, setResult] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('calculate');

  const [inputs, setInputs] = useState({
    analysis_name: 'Break-Even Analysis',
    fixed_costs: 100000,
    variable_cost_per_unit: 25,
    selling_price_per_unit: 50,
    current_units: 5000,
    target_profit: 50000
  });

  const [whatIfInputs, setWhatIfInputs] = useState({
    price_change_percent: 10,
    variable_cost_change_percent: -5,
    fixed_cost_change_percent: 0
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

  const calculateBreakEven = async () => {
    setLoading(true);
    try {
      const response = await api.calculateBreakEven({
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

  const runWhatIfAnalysis = async () => {
    if (!result) return;
    setLoading(true);
    try {
      const response = await api.breakEvenWhatIf({
        company_id: selectedCompany,
        ...inputs,
        ...whatIfInputs
      });
      setResult(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAIAnalysis = async () => {
    if (!result) return;
    setAnalyzing(true);
    try {
      const response = await api.analyzeBreakEven({
        analysis_id: result.analysis?.id,
        company_id: selectedCompany,
        inputs,
        results: result
      });
      setAnalysis(response.data);
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

  const formatNumber = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'N/A';
    return num.toLocaleString();
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'N/A';
    return `${(num * 100).toFixed(1)}%`;
  };

  const contributionMargin = inputs.selling_price_per_unit - inputs.variable_cost_per_unit;
  const contributionMarginRatio = contributionMargin / inputs.selling_price_per_unit;

  return (
    <div className="break-even-page">
      <div className="page-header">
        <div className="header-content">
          <h1><Target size={28} /> Break-Even Analysis</h1>
          <p>Calculate break-even points and analyze cost-volume-profit relationships</p>
        </div>
        <div className="header-actions">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="company-select">
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={calculateBreakEven} disabled={loading}>
            {loading ? <RefreshCw size={16} className="spinning" /> : <Calculator size={16} />} Calculate
          </button>
        </div>
      </div>

      <div className="be-layout">
        <div className="inputs-panel">
          <div className="tabs">
            <button className={`tab ${activeTab === 'calculate' ? 'active' : ''}`} onClick={() => setActiveTab('calculate')}>
              <Calculator size={16} /> Inputs
            </button>
            <button className={`tab ${activeTab === 'whatif' ? 'active' : ''}`} onClick={() => setActiveTab('whatif')}>
              <TrendingUp size={16} /> What-If
            </button>
          </div>

          {activeTab === 'calculate' ? (
            <div className="input-section">
              <label>Fixed Costs ($)
                <input type="number" value={inputs.fixed_costs} onChange={(e) => setInputs({...inputs, fixed_costs: parseFloat(e.target.value) || 0})} />
              </label>
              <label>Variable Cost per Unit ($)
                <input type="number" value={inputs.variable_cost_per_unit} onChange={(e) => setInputs({...inputs, variable_cost_per_unit: parseFloat(e.target.value) || 0})} step="0.01" />
              </label>
              <label>Selling Price per Unit ($)
                <input type="number" value={inputs.selling_price_per_unit} onChange={(e) => setInputs({...inputs, selling_price_per_unit: parseFloat(e.target.value) || 0})} step="0.01" />
              </label>
              <label>Current Sales Units
                <input type="number" value={inputs.current_units} onChange={(e) => setInputs({...inputs, current_units: parseInt(e.target.value) || 0})} />
              </label>
              <label>Target Profit ($)
                <input type="number" value={inputs.target_profit} onChange={(e) => setInputs({...inputs, target_profit: parseFloat(e.target.value) || 0})} />
              </label>

              <div className="quick-calc">
                <h4>Quick Calculations</h4>
                <div className="calc-row">
                  <span>Contribution Margin:</span>
                  <span className="value">{formatCurrency(contributionMargin)}/unit</span>
                </div>
                <div className="calc-row">
                  <span>CM Ratio:</span>
                  <span className="value">{(contributionMarginRatio * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="input-section">
              <h4>Scenario Changes</h4>
              <label>Price Change (%)
                <input type="number" value={whatIfInputs.price_change_percent} onChange={(e) => setWhatIfInputs({...whatIfInputs, price_change_percent: parseFloat(e.target.value) || 0})} />
              </label>
              <label>Variable Cost Change (%)
                <input type="number" value={whatIfInputs.variable_cost_change_percent} onChange={(e) => setWhatIfInputs({...whatIfInputs, variable_cost_change_percent: parseFloat(e.target.value) || 0})} />
              </label>
              <label>Fixed Cost Change (%)
                <input type="number" value={whatIfInputs.fixed_cost_change_percent} onChange={(e) => setWhatIfInputs({...whatIfInputs, fixed_cost_change_percent: parseFloat(e.target.value) || 0})} />
              </label>
              <button className="btn btn-secondary full-width" onClick={runWhatIfAnalysis} disabled={loading || !result}>
                {loading ? <RefreshCw size={16} className="spinning" /> : <TrendingUp size={16} />} Run What-If
              </button>
            </div>
          )}
        </div>

        <div className="results-panel">
          {result ? (
            <>
              <div className="summary-cards">
                <div className="summary-card primary">
                  <span className="label">Break-Even Units</span>
                  <span className="value">{formatNumber(result.breakEven?.units)}</span>
                  <span className="sub">units to break even</span>
                </div>
                <div className="summary-card success">
                  <span className="label">Break-Even Revenue</span>
                  <span className="value">{formatCurrency(result.breakEven?.revenue)}</span>
                  <span className="sub">sales to break even</span>
                </div>
                <div className="summary-card">
                  <span className="label">Units for Target Profit</span>
                  <span className="value">{formatNumber(result.targetProfit?.units)}</span>
                  <span className="sub">to earn {formatCurrency(inputs.target_profit)}</span>
                </div>
              </div>

              <div className="metrics-section">
                <h4><Activity size={18} /> Key Metrics</h4>
                <div className="metrics-grid">
                  <div className="metric">
                    <span className="label">Contribution Margin</span>
                    <span className="value">{formatCurrency(result.metrics?.contributionMargin)}/unit</span>
                  </div>
                  <div className="metric">
                    <span className="label">CM Ratio</span>
                    <span className="value">{formatPercent(result.metrics?.contributionMarginRatio)}</span>
                  </div>
                  <div className="metric">
                    <span className="label">Margin of Safety</span>
                    <span className="value">{formatPercent(result.metrics?.marginOfSafety)}</span>
                  </div>
                  <div className="metric">
                    <span className="label">Operating Leverage</span>
                    <span className="value">{result.metrics?.operatingLeverage ? parseFloat(result.metrics.operatingLeverage).toFixed(2) : 'N/A'}x</span>
                  </div>
                </div>
              </div>

              {result.currentPerformance && (
                <div className="performance-section">
                  <h4><DollarSign size={18} /> Current Performance</h4>
                  <div className="performance-grid">
                    <div className="perf-item">
                      <span className="label">Current Units</span>
                      <span className="value">{formatNumber(inputs.current_units)}</span>
                    </div>
                    <div className="perf-item">
                      <span className="label">Current Revenue</span>
                      <span className="value">{formatCurrency(result.currentPerformance?.revenue)}</span>
                    </div>
                    <div className="perf-item">
                      <span className="label">Current Profit</span>
                      <span className={`value ${result.currentPerformance?.profit >= 0 ? 'positive' : 'negative'}`}>
                        {formatCurrency(result.currentPerformance?.profit)}
                      </span>
                    </div>
                    <div className="perf-item">
                      <span className="label">Above Break-Even</span>
                      <span className={`value ${result.currentPerformance?.aboveBreakEven >= 0 ? 'positive' : 'negative'}`}>
                        {formatNumber(result.currentPerformance?.aboveBreakEven)} units
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {result.whatIfComparison && (
                <div className="whatif-results">
                  <h4>What-If Comparison</h4>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Current</th>
                        <th>What-If</th>
                        <th>Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Break-Even Units</td>
                        <td>{formatNumber(result.whatIfComparison?.current?.breakEvenUnits)}</td>
                        <td>{formatNumber(result.whatIfComparison?.whatIf?.breakEvenUnits)}</td>
                        <td className={result.whatIfComparison?.change?.breakEvenUnits < 0 ? 'positive' : 'negative'}>
                          {result.whatIfComparison?.change?.breakEvenUnits?.toFixed(1)}%
                        </td>
                      </tr>
                      <tr>
                        <td>Contribution Margin</td>
                        <td>{formatCurrency(result.whatIfComparison?.current?.contributionMargin)}</td>
                        <td>{formatCurrency(result.whatIfComparison?.whatIf?.contributionMargin)}</td>
                        <td className={result.whatIfComparison?.change?.contributionMargin > 0 ? 'positive' : 'negative'}>
                          {result.whatIfComparison?.change?.contributionMargin?.toFixed(1)}%
                        </td>
                      </tr>
                      <tr>
                        <td>Profit at Current Volume</td>
                        <td>{formatCurrency(result.whatIfComparison?.current?.profitAtCurrentVolume)}</td>
                        <td>{formatCurrency(result.whatIfComparison?.whatIf?.profitAtCurrentVolume)}</td>
                        <td className={result.whatIfComparison?.change?.profitAtCurrentVolume > 0 ? 'positive' : 'negative'}>
                          {result.whatIfComparison?.change?.profitAtCurrentVolume?.toFixed(1)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <div className="actions">
                <button className="btn btn-secondary" onClick={runAIAnalysis} disabled={analyzing}>
                  {analyzing ? <RefreshCw size={16} className="spinning" /> : <Brain size={16} />} AI Analysis
                </button>
              </div>

              {analysis && (
                <div className="ai-analysis">
                  <h4><Brain size={18} /> AI Cost-Volume-Profit Analysis</h4>
                  {analysis.summary && <p className="summary">{analysis.summary}</p>}
                  {analysis.insights && (
                    <div className="insights">
                      <h5>Key Insights</h5>
                      <ul>{analysis.insights.map((i, idx) => <li key={idx}>{i}</li>)}</ul>
                    </div>
                  )}
                  {analysis.recommendations && (
                    <div className="recs">
                      <h5>Recommendations</h5>
                      <ul>{analysis.recommendations.map((r, idx) => <li key={idx}>{r}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <Target size={60} />
              <h3>Break-Even Analysis</h3>
              <p>Enter your cost and pricing data to calculate break-even points</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .break-even-page { padding: 0; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
        .header-content h1 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 0.5rem 0; color: #f1f5f9; }
        .header-content p { color: #94a3b8; margin: 0; }
        .header-actions { display: flex; gap: 0.75rem; align-items: center; }
        .company-select { padding: 0.5rem 1rem; background: #1e293b; border: 1px solid #334155; border-radius: 0.5rem; color: #f1f5f9; min-width: 200px; }
        .btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 0.5rem; border: none; cursor: pointer; font-weight: 500; }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-secondary { background: #334155; color: #f1f5f9; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn.full-width { width: 100%; justify-content: center; margin-top: 1rem; }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .be-layout { display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; }
        .inputs-panel { background: #1e293b; border: 1px solid #334155; border-radius: 0.75rem; padding: 1.5rem; height: fit-content; }

        .tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
        .tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.5rem; background: #0f172a; border: 1px solid #334155; border-radius: 0.375rem; color: #94a3b8; cursor: pointer; font-size: 0.85rem; }
        .tab.active { background: #3b82f6; border-color: #3b82f6; color: white; }

        .input-section { display: flex; flex-direction: column; gap: 0.75rem; }
        .input-section h4 { color: #f1f5f9; margin: 0 0 0.5rem; font-size: 0.9rem; }
        .input-section label { display: flex; flex-direction: column; gap: 0.25rem; color: #94a3b8; font-size: 0.85rem; }
        .input-section input { padding: 0.5rem; background: #0f172a; border: 1px solid #334155; border-radius: 0.375rem; color: #f1f5f9; }

        .quick-calc { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #334155; }
        .quick-calc h4 { color: #94a3b8; font-size: 0.85rem; margin: 0 0 0.75rem; }
        .calc-row { display: flex; justify-content: space-between; color: #94a3b8; font-size: 0.85rem; margin-bottom: 0.5rem; }
        .calc-row .value { color: #3b82f6; font-weight: 600; }

        .results-panel { background: #1e293b; border: 1px solid #334155; border-radius: 0.75rem; padding: 1.5rem; }

        .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .summary-card { background: #0f172a; padding: 1.25rem; border-radius: 0.5rem; text-align: center; }
        .summary-card.primary { border: 2px solid #3b82f6; }
        .summary-card.success { border: 2px solid #22c55e; }
        .summary-card .label { display: block; color: #94a3b8; font-size: 0.85rem; margin-bottom: 0.5rem; }
        .summary-card .value { display: block; color: #f1f5f9; font-size: 1.5rem; font-weight: 700; }
        .summary-card.primary .value { color: #3b82f6; }
        .summary-card.success .value { color: #22c55e; }
        .summary-card .sub { display: block; color: #64748b; font-size: 0.75rem; margin-top: 0.25rem; }

        .metrics-section, .performance-section { margin-bottom: 1.5rem; }
        .metrics-section h4, .performance-section h4 { display: flex; align-items: center; gap: 0.5rem; color: #f1f5f9; margin: 0 0 1rem; }
        .metrics-grid, .performance-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; }
        .metric, .perf-item { background: #0f172a; padding: 1rem; border-radius: 0.5rem; }
        .metric .label, .perf-item .label { display: block; color: #94a3b8; font-size: 0.8rem; margin-bottom: 0.25rem; }
        .metric .value, .perf-item .value { display: block; color: #f1f5f9; font-size: 1.1rem; font-weight: 600; }
        .positive { color: #22c55e !important; }
        .negative { color: #ef4444 !important; }

        .whatif-results { margin-bottom: 1.5rem; }
        .whatif-results h4 { color: #f1f5f9; margin: 0 0 1rem; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #334155; }
        .data-table th { color: #94a3b8; font-weight: 600; }
        .data-table td { color: #f1f5f9; }

        .actions { margin-top: 1.5rem; }
        .ai-analysis { margin-top: 1.5rem; background: #0f172a; padding: 1.5rem; border-radius: 0.5rem; }
        .ai-analysis h4 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 1rem; color: #f1f5f9; }
        .ai-analysis .summary { color: #e2e8f0; line-height: 1.6; }
        .insights, .recs { margin-top: 1rem; }
        .insights h5, .recs h5 { color: #94a3b8; font-size: 0.9rem; margin: 0 0 0.5rem; }
        .insights ul, .recs ul { margin: 0; padding-left: 1.25rem; }
        .insights li, .recs li { color: #e2e8f0; font-size: 0.9rem; margin-bottom: 0.5rem; }

        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; color: #94a3b8; text-align: center; }
        .empty-state h3 { margin: 1rem 0 0.5rem; color: #f1f5f9; }

        @media (max-width: 900px) { .be-layout { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

export default BreakEvenAnalysis;
