import React, { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, Calculator, RefreshCw, Brain, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import * as api from '../services/api';

function CapitalBudgeting() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [projects, setProjects] = useState([]);
  const [result, setResult] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [inputs, setInputs] = useState({
    project_name: 'New Project',
    initial_investment: 500000,
    project_life: 5,
    salvage_value: 50000,
    discount_rate: 10,
    cash_flows: [100000, 120000, 140000, 160000, 180000],
    depreciation_method: 'straight_line',
    reinvestment_rate: 8
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

  const calculateProject = async () => {
    setLoading(true);
    try {
      const response = await api.calculateCapitalProject({
        company_id: selectedCompany,
        ...inputs
      });
      setResult(response.data);
      if (!projects.find(p => p.name === inputs.project_name)) {
        setProjects([...projects, { name: inputs.project_name, data: response.data }]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const compareProjects = async () => {
    if (projects.length < 2) return;
    setComparing(true);
    try {
      const response = await api.compareCapitalProjects({
        company_id: selectedCompany,
        projects: projects.map(p => ({
          project_name: p.name,
          initial_investment: p.data.project?.initialInvestment || inputs.initial_investment,
          cash_flows: p.data.project?.cashFlows || inputs.cash_flows,
          discount_rate: p.data.project?.discountRate || inputs.discount_rate,
          project_life: p.data.project?.projectLife || inputs.project_life
        }))
      });
      setComparison(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setComparing(false);
    }
  };

  const updateCashFlow = (index, value) => {
    const newCashFlows = [...inputs.cash_flows];
    newCashFlows[index] = parseFloat(value) || 0;
    setInputs({ ...inputs, cash_flows: newCashFlows });
  };

  const addYear = () => {
    setInputs({
      ...inputs,
      project_life: inputs.project_life + 1,
      cash_flows: [...inputs.cash_flows, 0]
    });
  };

  const removeYear = () => {
    if (inputs.project_life > 1) {
      const newCashFlows = inputs.cash_flows.slice(0, -1);
      setInputs({
        ...inputs,
        project_life: inputs.project_life - 1,
        cash_flows: newCashFlows
      });
    }
  };

  const removeProject = (index) => {
    setProjects(projects.filter((_, i) => i !== index));
    if (comparison) setComparison(null);
  };

  const getAIAnalysis = async () => {
    if (!result) return;
    setAnalyzing(true);
    try {
      const response = await api.analyzeCapitalProject({
        project: result.project,
        metrics: result.metrics,
        inputs
      });
      setAiAnalysis(response.data);
    } catch (error) {
      console.error('Error getting AI analysis:', error);
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
    return `${(num * 100).toFixed(2)}%`;
  };

  const safeToFixed = (value, decimals = 2) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'N/A';
    return num.toFixed(decimals);
  };

  return (
    <div className="capital-budgeting-page">
      <div className="page-header">
        <div className="header-content">
          <h1><Building2 size={28} /> Capital Budgeting Tools</h1>
          <p>Evaluate investment projects with NPV, IRR, MIRR, and payback analysis</p>
        </div>
        <div className="header-actions">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="company-select">
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={calculateProject} disabled={loading}>
            {loading ? <RefreshCw size={16} className="spinning" /> : <Calculator size={16} />} Calculate
          </button>
        </div>
      </div>

      <div className="cb-layout">
        <div className="inputs-panel">
          <h3><Calculator size={20} /> Project Inputs</h3>

          <div className="input-section">
            <label>Project Name
              <input type="text" value={inputs.project_name} onChange={(e) => setInputs({...inputs, project_name: e.target.value})} />
            </label>
            <label>Initial Investment ($)
              <input type="number" value={inputs.initial_investment} onChange={(e) => setInputs({...inputs, initial_investment: parseFloat(e.target.value) || 0})} />
            </label>
            <label>Discount Rate (%)
              <input type="number" value={inputs.discount_rate} onChange={(e) => setInputs({...inputs, discount_rate: parseFloat(e.target.value) || 0})} step="0.5" />
            </label>
            <label>Salvage Value ($)
              <input type="number" value={inputs.salvage_value} onChange={(e) => setInputs({...inputs, salvage_value: parseFloat(e.target.value) || 0})} />
            </label>
            <label>Reinvestment Rate (%) for MIRR
              <input type="number" value={inputs.reinvestment_rate} onChange={(e) => setInputs({...inputs, reinvestment_rate: parseFloat(e.target.value) || 0})} step="0.5" />
            </label>
            <label>Depreciation Method
              <select value={inputs.depreciation_method} onChange={(e) => setInputs({...inputs, depreciation_method: e.target.value})}>
                <option value="straight_line">Straight Line</option>
                <option value="declining_balance">Declining Balance</option>
                <option value="macrs">MACRS</option>
              </select>
            </label>
          </div>

          <div className="cash-flows-section">
            <div className="section-header">
              <h4>Annual Cash Flows</h4>
              <div className="year-controls">
                <button onClick={removeYear} className="btn-icon" disabled={inputs.project_life <= 1}><Trash2 size={14} /></button>
                <button onClick={addYear} className="btn-icon"><Plus size={14} /></button>
              </div>
            </div>
            <div className="cash-flow-inputs">
              {inputs.cash_flows.map((cf, idx) => (
                <label key={idx}>Year {idx + 1}
                  <input type="number" value={cf} onChange={(e) => updateCashFlow(idx, e.target.value)} />
                </label>
              ))}
            </div>
          </div>

          {projects.length > 0 && (
            <div className="saved-projects">
              <h4>Saved Projects ({projects.length})</h4>
              <div className="project-list">
                {projects.map((p, idx) => (
                  <div key={idx} className="project-item">
                    <span>{p.name}</span>
                    <button onClick={() => removeProject(idx)} className="btn-remove"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
              {projects.length >= 2 && (
                <button className="btn btn-secondary full-width" onClick={compareProjects} disabled={comparing}>
                  {comparing ? <RefreshCw size={16} className="spinning" /> : <TrendingUp size={16} />} Compare Projects
                </button>
              )}
            </div>
          )}
        </div>

        <div className="results-panel">
          {result ? (
            <>
              <div className="project-summary">
                <h3>Investment Analysis: {result.project?.name || inputs.project_name}</h3>
                <div className="decision-badge" style={{
                  background: result.metrics?.decision?.accept ? '#22c55e20' : '#ef444420',
                  color: result.metrics?.decision?.accept ? '#22c55e' : '#ef4444'
                }}>
                  {result.metrics?.decision?.accept ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  {result.metrics?.decision?.recommendation || 'Pending'}
                </div>
              </div>

              <div className="metrics-grid">
                <div className="metric-card">
                  <span className="label">Net Present Value</span>
                  <span className={`value ${result.metrics?.npv >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(result.metrics?.npv)}
                  </span>
                </div>
                <div className="metric-card">
                  <span className="label">Internal Rate of Return</span>
                  <span className="value">{formatPercent(result.metrics?.irr)}</span>
                </div>
                <div className="metric-card">
                  <span className="label">Modified IRR</span>
                  <span className="value">{formatPercent(result.metrics?.mirr)}</span>
                </div>
                <div className="metric-card">
                  <span className="label">Payback Period</span>
                  <span className="value">{safeToFixed(result.metrics?.paybackPeriod)} years</span>
                </div>
                <div className="metric-card">
                  <span className="label">Discounted Payback</span>
                  <span className="value">{safeToFixed(result.metrics?.discountedPayback)} years</span>
                </div>
                <div className="metric-card">
                  <span className="label">Profitability Index</span>
                  <span className="value">{safeToFixed(result.metrics?.profitabilityIndex, 3)}</span>
                </div>
                <div className="metric-card">
                  <span className="label">Equivalent Annual Annuity</span>
                  <span className="value">{formatCurrency(result.metrics?.eaa)}</span>
                </div>
              </div>

              <div className="cash-flow-table">
                <h4>Cash Flow Analysis</h4>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Cash Flow</th>
                      <th>Discount Factor</th>
                      <th>Present Value</th>
                      <th>Cumulative PV</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="initial-row">
                      <td>0</td>
                      <td className="negative">{formatCurrency(-inputs.initial_investment)}</td>
                      <td>1.000</td>
                      <td className="negative">{formatCurrency(-inputs.initial_investment)}</td>
                      <td className="negative">{formatCurrency(-inputs.initial_investment)}</td>
                    </tr>
                    {result.cashFlowAnalysis?.map((cf, idx) => (
                      <tr key={idx}>
                        <td>{cf.year}</td>
                        <td>{formatCurrency(cf.cashFlow)}</td>
                        <td>{safeToFixed(cf.discountFactor, 4)}</td>
                        <td>{formatCurrency(cf.presentValue)}</td>
                        <td className={cf.cumulativePV >= 0 ? 'positive' : 'negative'}>{formatCurrency(cf.cumulativePV)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="actions">
                <button className="btn btn-secondary" onClick={getAIAnalysis} disabled={analyzing}>
                  {analyzing ? <RefreshCw size={16} className="spinning" /> : <Brain size={16} />} AI Analysis
                </button>
              </div>

              {aiAnalysis && (
                <div className="ai-analysis">
                  <h4><Brain size={18} /> AI Investment Analysis</h4>
                  {aiAnalysis.summary && <p className="summary">{aiAnalysis.summary}</p>}

                  {aiAnalysis.strengths && aiAnalysis.strengths.length > 0 && (
                    <div className="analysis-section strengths">
                      <h5>Strengths</h5>
                      <ul>{aiAnalysis.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                  )}

                  {aiAnalysis.risks && aiAnalysis.risks.length > 0 && (
                    <div className="analysis-section risks">
                      <h5>Risks</h5>
                      <ul>{aiAnalysis.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
                    </div>
                  )}

                  {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                    <div className="analysis-section recommendations">
                      <h5>Recommendations</h5>
                      <ul>{aiAnalysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
                    </div>
                  )}

                  {aiAnalysis.sensitivityFactors && aiAnalysis.sensitivityFactors.length > 0 && (
                    <div className="analysis-section sensitivity">
                      <h5>Key Sensitivity Factors</h5>
                      <ul>{aiAnalysis.sensitivityFactors.map((f, i) => <li key={i}>{f}</li>)}</ul>
                    </div>
                  )}

                  {aiAnalysis.alternativeConsiderations && (
                    <div className="analysis-section alternatives">
                      <h5>Alternative Considerations</h5>
                      <p>{aiAnalysis.alternativeConsiderations}</p>
                    </div>
                  )}

                  {aiAnalysis.raw && (
                    <div className="analysis-section raw">
                      <p>{aiAnalysis.raw}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : comparison ? (
            <div className="comparison-results">
              <h3>Project Comparison</h3>
              <table className="data-table comparison-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    {comparison.projects?.map((p, idx) => <th key={idx}>{p.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>NPV</td>
                    {comparison.projects?.map((p, idx) => (
                      <td key={idx} className={p.metrics?.npv >= 0 ? 'positive' : 'negative'}>
                        {formatCurrency(p.metrics?.npv)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>IRR</td>
                    {comparison.projects?.map((p, idx) => (
                      <td key={idx}>{formatPercent(p.metrics?.irr)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>MIRR</td>
                    {comparison.projects?.map((p, idx) => (
                      <td key={idx}>{formatPercent(p.metrics?.mirr)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Payback Period</td>
                    {comparison.projects?.map((p, idx) => (
                      <td key={idx}>{safeToFixed(p.metrics?.paybackPeriod)} years</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Profitability Index</td>
                    {comparison.projects?.map((p, idx) => (
                      <td key={idx}>{safeToFixed(p.metrics?.profitabilityIndex, 3)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
              {comparison.ranking && (
                <div className="ranking-section">
                  <h4>Project Ranking</h4>
                  <div className="ranking-list">
                    {comparison.ranking.map((r, idx) => (
                      <div key={idx} className={`ranking-item ${idx === 0 ? 'top' : ''}`}>
                        <span className="rank">#{idx + 1}</span>
                        <span className="name">{r.name}</span>
                        <span className="score">Score: {safeToFixed(r.score)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <Building2 size={60} />
              <h3>Capital Budgeting Analysis</h3>
              <p>Enter project details and cash flows to calculate NPV, IRR, and other investment metrics</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .capital-budgeting-page { padding: 0; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
        .header-content h1 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 0.5rem 0; color: #f1f5f9; }
        .header-content p { color: #94a3b8; margin: 0; }
        .header-actions { display: flex; gap: 0.75rem; align-items: center; }
        .company-select { padding: 0.5rem 1rem; background: #1e293b; border: 1px solid #334155; border-radius: 0.5rem; color: #f1f5f9; min-width: 200px; }
        .btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 0.5rem; border: none; cursor: pointer; font-weight: 500; }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-secondary { background: #334155; color: #f1f5f9; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn.full-width { width: 100%; justify-content: center; margin-top: 0.75rem; }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .cb-layout { display: grid; grid-template-columns: 350px 1fr; gap: 1.5rem; }
        .inputs-panel { background: #1e293b; border: 1px solid #334155; border-radius: 0.75rem; padding: 1.5rem; height: fit-content; }
        .inputs-panel h3 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 1.5rem; color: #f1f5f9; }
        .input-section { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; }
        .input-section label { display: flex; flex-direction: column; gap: 0.25rem; color: #94a3b8; font-size: 0.85rem; }
        .input-section input, .input-section select { padding: 0.5rem; background: #0f172a; border: 1px solid #334155; border-radius: 0.375rem; color: #f1f5f9; }

        .cash-flows-section { margin-bottom: 1.5rem; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
        .section-header h4 { margin: 0; color: #f1f5f9; font-size: 0.9rem; }
        .year-controls { display: flex; gap: 0.25rem; }
        .btn-icon { padding: 0.35rem; background: #334155; border: none; border-radius: 0.25rem; color: #94a3b8; cursor: pointer; }
        .btn-icon:hover { background: #475569; }
        .btn-icon:disabled { opacity: 0.3; cursor: not-allowed; }
        .cash-flow-inputs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
        .cash-flow-inputs label { display: flex; flex-direction: column; gap: 0.25rem; color: #64748b; font-size: 0.75rem; }
        .cash-flow-inputs input { padding: 0.35rem; font-size: 0.85rem; background: #0f172a; border: 1px solid #334155; border-radius: 0.25rem; color: #f1f5f9; }

        .saved-projects h4 { color: #94a3b8; font-size: 0.9rem; margin: 0 0 0.75rem; }
        .project-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .project-item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: #0f172a; border-radius: 0.375rem; }
        .project-item span { color: #f1f5f9; font-size: 0.85rem; }
        .btn-remove { padding: 0.25rem; background: transparent; border: none; color: #ef4444; cursor: pointer; }

        .results-panel { background: #1e293b; border: 1px solid #334155; border-radius: 0.75rem; padding: 1.5rem; }
        .project-summary { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .project-summary h3 { margin: 0; color: #f1f5f9; }
        .decision-badge { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 0.375rem; font-weight: 600; }

        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .metric-card { background: #0f172a; padding: 1rem; border-radius: 0.5rem; text-align: center; }
        .metric-card .label { display: block; color: #94a3b8; font-size: 0.8rem; margin-bottom: 0.5rem; }
        .metric-card .value { display: block; color: #f1f5f9; font-size: 1.1rem; font-weight: 700; }
        .metric-card .value.positive { color: #22c55e; }
        .metric-card .value.negative { color: #ef4444; }

        .cash-flow-table h4 { color: #f1f5f9; margin: 0 0 1rem; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #334155; }
        .data-table th { color: #94a3b8; font-weight: 600; }
        .data-table td { color: #f1f5f9; }
        .data-table .initial-row { background: #0f172a; }
        .data-table .positive { color: #22c55e; }
        .data-table .negative { color: #ef4444; }

        .comparison-results h3 { margin: 0 0 1.5rem; color: #f1f5f9; }
        .comparison-table th { min-width: 120px; }
        .ranking-section { margin-top: 1.5rem; }
        .ranking-section h4 { color: #f1f5f9; margin: 0 0 1rem; }
        .ranking-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .ranking-item { display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: #0f172a; border-radius: 0.375rem; }
        .ranking-item.top { border: 2px solid #22c55e; }
        .ranking-item .rank { color: #94a3b8; font-weight: 700; width: 2rem; }
        .ranking-item .name { color: #f1f5f9; flex: 1; }
        .ranking-item .score { color: #3b82f6; font-weight: 600; }

        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; color: #94a3b8; text-align: center; }
        .empty-state h3 { margin: 1rem 0 0.5rem; color: #f1f5f9; }

        .actions { margin-top: 1.5rem; }
        .ai-analysis { margin-top: 1.5rem; background: #0f172a; padding: 1.5rem; border-radius: 0.5rem; border: 1px solid #334155; }
        .ai-analysis h4 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 1rem; color: #f1f5f9; }
        .ai-analysis .summary { color: #e2e8f0; line-height: 1.6; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #334155; }
        .analysis-section { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #334155; }
        .analysis-section:first-of-type { border-top: none; margin-top: 0; padding-top: 0; }
        .analysis-section h5 { color: #94a3b8; font-size: 0.9rem; margin: 0 0 0.5rem; }
        .analysis-section ul { margin: 0; padding-left: 1.25rem; }
        .analysis-section li { color: #e2e8f0; font-size: 0.9rem; margin-bottom: 0.5rem; line-height: 1.5; }
        .analysis-section p { color: #e2e8f0; font-size: 0.9rem; margin: 0; line-height: 1.5; }
        .analysis-section.strengths h5 { color: #22c55e; }
        .analysis-section.risks h5 { color: #ef4444; }
        .analysis-section.recommendations h5 { color: #3b82f6; }
        .analysis-section.sensitivity h5 { color: #f59e0b; }
        .analysis-section.alternatives h5 { color: #8b5cf6; }

        @media (max-width: 900px) { .cb-layout { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

export default CapitalBudgeting;
