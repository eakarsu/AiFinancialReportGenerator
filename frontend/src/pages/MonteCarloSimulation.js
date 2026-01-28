import React, { useState, useEffect } from 'react';
import { Dice6, Play, RefreshCw, Brain, Settings, BarChart3, AlertTriangle } from 'lucide-react';
import * as api from '../services/api';

function MonteCarloSimulation() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [result, setResult] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [inputs, setInputs] = useState({
    simulation_name: 'Monte Carlo Simulation',
    simulation_type: 'profit',
    num_simulations: 10000,
    projection_years: 5,
    variables: {
      revenue_growth: { mean: 10, std: 5, min: -10, max: 30 },
      cost_ratio: { mean: 65, std: 5, min: 50, max: 80 },
      operating_expense_growth: { mean: 5, std: 3, min: -5, max: 15 },
      discount_rate: { mean: 10, std: 2, min: 6, max: 15 }
    }
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

  const runSimulation = async () => {
    setLoading(true);
    try {
      const response = await api.runMonteCarloSimulation({
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

  const runAIAnalysis = async () => {
    if (!result) return;
    setAnalyzing(true);
    try {
      const response = await api.analyzeMonteCarloSimulation({
        simulation_id: result.simulation?.id,
        company_id: selectedCompany
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

  const formatPercent = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'N/A';
    return `${num.toFixed(1)}%`;
  };

  const updateVariable = (varName, field, value) => {
    setInputs({
      ...inputs,
      variables: {
        ...inputs.variables,
        [varName]: { ...inputs.variables[varName], [field]: parseFloat(value) || 0 }
      }
    });
  };

  return (
    <div className="monte-carlo-page">
      <div className="page-header">
        <div className="header-content">
          <h1><Dice6 size={28} /> Monte Carlo Simulation</h1>
          <p>Run probabilistic risk analysis with thousands of simulations</p>
        </div>
        <div className="header-actions">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="company-select">
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={runSimulation} disabled={loading}>
            {loading ? <RefreshCw size={16} className="spinning" /> : <Play size={16} />}
            Run {inputs.num_simulations.toLocaleString()} Simulations
          </button>
        </div>
      </div>

      <div className="mc-layout">
        <div className="inputs-panel">
          <h3><Settings size={20} /> Simulation Parameters</h3>

          <div className="input-group">
            <label>Number of Simulations
              <input type="number" value={inputs.num_simulations} onChange={(e) => setInputs({...inputs, num_simulations: parseInt(e.target.value) || 1000})} step="1000" min="1000" max="100000" />
            </label>
            <label>Projection Years
              <input type="number" value={inputs.projection_years} onChange={(e) => setInputs({...inputs, projection_years: parseInt(e.target.value) || 5})} min="1" max="10" />
            </label>
          </div>

          <h4>Variable Distributions</h4>
          {Object.entries(inputs.variables).map(([varName, varData]) => (
            <div key={varName} className="variable-config">
              <h5>{varName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h5>
              <div className="var-inputs">
                <label>Mean: <input type="number" value={varData.mean} onChange={(e) => updateVariable(varName, 'mean', e.target.value)} /></label>
                <label>Std: <input type="number" value={varData.std} onChange={(e) => updateVariable(varName, 'std', e.target.value)} /></label>
                <label>Min: <input type="number" value={varData.min} onChange={(e) => updateVariable(varName, 'min', e.target.value)} /></label>
                <label>Max: <input type="number" value={varData.max} onChange={(e) => updateVariable(varName, 'max', e.target.value)} /></label>
              </div>
            </div>
          ))}
        </div>

        <div className="results-panel">
          {result ? (
            <>
              <div className="summary-cards">
                <div className="summary-card">
                  <span className="label">Mean Net Income</span>
                  <span className="value">{formatCurrency(result.summary?.statistics?.netIncome?.mean)}</span>
                </div>
                <div className="summary-card">
                  <span className="label">Median</span>
                  <span className="value">{formatCurrency(result.summary?.statistics?.netIncome?.median)}</span>
                </div>
                <div className="summary-card">
                  <span className="label">Std Deviation</span>
                  <span className="value">{formatCurrency(result.summary?.statistics?.netIncome?.stdDev)}</span>
                </div>
                <div className="summary-card warning">
                  <span className="label">VaR (95%)</span>
                  <span className="value">{formatCurrency(result.summary?.riskMetrics?.var95)}</span>
                </div>
              </div>

              <div className="probabilities">
                <h4>Probability Analysis</h4>
                <div className="prob-grid">
                  <div className="prob-item">
                    <div className="prob-bar" style={{width: `${result.summary?.probabilities?.profitProbability || 0}%`, background: '#22c55e'}}></div>
                    <span>{formatPercent(result.summary?.probabilities?.profitProbability)} Probability of Profit</span>
                  </div>
                  <div className="prob-item">
                    <div className="prob-bar" style={{width: `${result.summary?.probabilities?.positiveNPVProbability || 0}%`, background: '#3b82f6'}}></div>
                    <span>{formatPercent(result.summary?.probabilities?.positiveNPVProbability)} Positive NPV Probability</span>
                  </div>
                </div>
              </div>

              <div className="percentiles">
                <h4>Percentile Distribution</h4>
                <table className="data-table">
                  <thead><tr><th>Percentile</th><th>Net Income</th><th>NPV</th></tr></thead>
                  <tbody>
                    {['p5', 'p10', 'p25', 'p50', 'p75', 'p90', 'p95'].map(p => (
                      <tr key={p}>
                        <td>{p.replace('p', '')}th</td>
                        <td>{formatCurrency(result.summary?.percentiles?.netIncome?.[p])}</td>
                        <td>{formatCurrency(result.summary?.percentiles?.npv?.[p])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="actions">
                <button className="btn btn-secondary" onClick={runAIAnalysis} disabled={analyzing}>
                  {analyzing ? <RefreshCw size={16} className="spinning" /> : <Brain size={16} />} AI Risk Analysis
                </button>
              </div>

              {analysis && (
                <div className="ai-analysis">
                  <h4><Brain size={18} /> AI Risk Assessment</h4>
                  {analysis.riskAssessment && (
                    <div className={`risk-badge ${analysis.riskAssessment}`}>
                      <AlertTriangle size={16} /> Risk Level: {analysis.riskAssessment.toUpperCase()}
                    </div>
                  )}
                  {analysis.keyFindings && (
                    <div className="findings">
                      <h5>Key Findings</h5>
                      <ul>{analysis.keyFindings.map((f, i) => <li key={i}>{f}</li>)}</ul>
                    </div>
                  )}
                  {analysis.recommendations && (
                    <div className="recs">
                      <h5>Recommendations</h5>
                      <ul>{analysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <Dice6 size={60} />
              <h3>Configure & Run Simulation</h3>
              <p>Set your parameters and run thousands of simulations to analyze risk</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .monte-carlo-page { padding: 0; }
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

        .mc-layout { display: grid; grid-template-columns: 350px 1fr; gap: 1.5rem; }
        .inputs-panel { background: #1e293b; border: 1px solid #334155; border-radius: 0.75rem; padding: 1.5rem; height: fit-content; }
        .inputs-panel h3 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 1.5rem; color: #f1f5f9; }
        .inputs-panel h4 { color: #94a3b8; font-size: 0.9rem; margin: 1.5rem 0 1rem; }
        .input-group { display: flex; flex-direction: column; gap: 0.75rem; }
        .input-group label { display: flex; flex-direction: column; gap: 0.25rem; color: #94a3b8; font-size: 0.85rem; }
        .input-group input { padding: 0.5rem; background: #0f172a; border: 1px solid #334155; border-radius: 0.375rem; color: #f1f5f9; }

        .variable-config { background: #0f172a; padding: 1rem; border-radius: 0.5rem; margin-bottom: 0.75rem; }
        .variable-config h5 { margin: 0 0 0.75rem; color: #f1f5f9; font-size: 0.85rem; }
        .var-inputs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
        .var-inputs label { display: flex; flex-direction: column; gap: 0.25rem; color: #64748b; font-size: 0.75rem; }
        .var-inputs input { padding: 0.35rem; font-size: 0.85rem; background: #1e293b; border: 1px solid #334155; border-radius: 0.25rem; color: #f1f5f9; }

        .results-panel { background: #1e293b; border: 1px solid #334155; border-radius: 0.75rem; padding: 1.5rem; }
        .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .summary-card { background: #0f172a; padding: 1rem; border-radius: 0.5rem; text-align: center; }
        .summary-card.warning { border: 2px solid #f59e0b; }
        .summary-card .label { display: block; color: #94a3b8; font-size: 0.85rem; margin-bottom: 0.5rem; }
        .summary-card .value { display: block; color: #f1f5f9; font-size: 1.25rem; font-weight: 700; }
        .summary-card.warning .value { color: #f59e0b; }

        .probabilities { margin-bottom: 1.5rem; }
        .probabilities h4 { color: #f1f5f9; margin: 0 0 1rem; }
        .prob-grid { display: flex; flex-direction: column; gap: 0.75rem; }
        .prob-item { position: relative; background: #0f172a; border-radius: 0.375rem; padding: 0.75rem; overflow: hidden; }
        .prob-bar { position: absolute; left: 0; top: 0; bottom: 0; opacity: 0.3; }
        .prob-item span { position: relative; color: #f1f5f9; font-size: 0.9rem; }

        .percentiles h4 { color: #f1f5f9; margin: 0 0 1rem; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #334155; }
        .data-table th { color: #94a3b8; font-weight: 600; }
        .data-table td { color: #f1f5f9; }

        .actions { margin-top: 1.5rem; }
        .ai-analysis { margin-top: 1.5rem; background: #0f172a; padding: 1.5rem; border-radius: 0.5rem; }
        .ai-analysis h4 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 1rem; color: #f1f5f9; }
        .risk-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 0.375rem; font-weight: 600; margin-bottom: 1rem; }
        .risk-badge.low { background: #22c55e20; color: #22c55e; }
        .risk-badge.medium { background: #f59e0b20; color: #f59e0b; }
        .risk-badge.high { background: #ef444420; color: #ef4444; }
        .risk-badge.very_high { background: #dc262620; color: #dc2626; }
        .findings, .recs { margin-top: 1rem; }
        .findings h5, .recs h5 { color: #94a3b8; font-size: 0.9rem; margin: 0 0 0.5rem; }
        .findings ul, .recs ul { margin: 0; padding-left: 1.25rem; }
        .findings li, .recs li { color: #e2e8f0; font-size: 0.9rem; margin-bottom: 0.5rem; }

        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; color: #94a3b8; text-align: center; }
        .empty-state h3 { margin: 1rem 0 0.5rem; color: #f1f5f9; }

        @media (max-width: 900px) { .mc-layout { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

export default MonteCarloSimulation;
