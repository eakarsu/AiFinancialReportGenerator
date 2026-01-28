import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, DollarSign, RefreshCw, Brain, Settings, Play, Info } from 'lucide-react';
import * as api from '../services/api';

function DCFValuation() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [valuations, setValuations] = useState([]);
  const [result, setResult] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [inputs, setInputs] = useState({
    valuation_name: 'DCF Valuation',
    initial_fcf: 1000000,
    projection_years: 5,
    growth_rates: [15, 12, 10, 8, 6],
    risk_free_rate: 3,
    market_risk_premium: 5,
    beta: 1.2,
    cost_of_debt: 5,
    tax_rate: 25,
    debt_weight: 30,
    equity_weight: 70,
    terminal_growth_rate: 2.5,
    use_company_data: true
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

  const calculateDCF = async () => {
    setLoading(true);
    try {
      const response = await api.calculateDCF({
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
    setAnalysisError(null);
    try {
      const response = await api.analyzeDCF({
        valuation_id: result.valuation?.id,
        company_id: selectedCompany,
        summary: result.summary
      });
      setAnalysis(response.data);
    } catch (error) {
      console.error('Error:', error);
      setAnalysisError(error.response?.data?.error || error.message || 'Failed to get AI analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'N/A';
    if (Math.abs(num) >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`;
    if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (Math.abs(num) >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'N/A';
    return `${num.toFixed(2)}%`;
  };

  return (
    <div className="dcf-page">
      <div className="page-header">
        <div className="header-content">
          <h1><Calculator size={28} /> DCF Valuation Calculator</h1>
          <p>Calculate intrinsic company value using Discounted Cash Flow analysis</p>
        </div>
        <div className="header-actions">
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="company-select">
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={calculateDCF} disabled={loading}>
            {loading ? <RefreshCw size={16} className="spinning" /> : <Play size={16} />} Calculate
          </button>
        </div>
      </div>

      <div className="dcf-layout">
        <div className="inputs-panel">
          <h3><Settings size={20} /> Valuation Inputs</h3>

          <div className="input-section">
            <h4>Cash Flow Assumptions</h4>
            <div className="input-group">
              <label>Initial Free Cash Flow ($)
                <input type="number" value={inputs.initial_fcf} onChange={(e) => setInputs({...inputs, initial_fcf: parseFloat(e.target.value) || 0})} />
              </label>
              <label>Projection Years
                <input type="number" value={inputs.projection_years} onChange={(e) => setInputs({...inputs, projection_years: parseInt(e.target.value) || 5})} min="1" max="10" />
              </label>
              <label>Terminal Growth Rate (%)
                <input type="number" value={inputs.terminal_growth_rate} onChange={(e) => setInputs({...inputs, terminal_growth_rate: parseFloat(e.target.value) || 0})} step="0.1" />
              </label>
            </div>
            <label className="checkbox-label">
              <input type="checkbox" checked={inputs.use_company_data} onChange={(e) => setInputs({...inputs, use_company_data: e.target.checked})} />
              Use company financial data
            </label>
          </div>

          <div className="input-section">
            <h4>WACC Components</h4>
            <div className="input-group">
              <label>Risk-Free Rate (%)
                <input type="number" value={inputs.risk_free_rate} onChange={(e) => setInputs({...inputs, risk_free_rate: parseFloat(e.target.value) || 0})} step="0.1" />
              </label>
              <label>Market Risk Premium (%)
                <input type="number" value={inputs.market_risk_premium} onChange={(e) => setInputs({...inputs, market_risk_premium: parseFloat(e.target.value) || 0})} step="0.1" />
              </label>
              <label>Beta
                <input type="number" value={inputs.beta} onChange={(e) => setInputs({...inputs, beta: parseFloat(e.target.value) || 1})} step="0.1" />
              </label>
              <label>Cost of Debt (%)
                <input type="number" value={inputs.cost_of_debt} onChange={(e) => setInputs({...inputs, cost_of_debt: parseFloat(e.target.value) || 0})} step="0.1" />
              </label>
              <label>Tax Rate (%)
                <input type="number" value={inputs.tax_rate} onChange={(e) => setInputs({...inputs, tax_rate: parseFloat(e.target.value) || 0})} />
              </label>
              <label>Debt Weight (%)
                <input type="number" value={inputs.debt_weight} onChange={(e) => setInputs({...inputs, debt_weight: parseFloat(e.target.value) || 0, equity_weight: 100 - parseFloat(e.target.value) || 0})} />
              </label>
            </div>
          </div>
        </div>

        <div className="results-panel">
          {result ? (
            <>
              <div className="valuation-summary">
                <h3>Valuation Results</h3>
                <div className="value-cards">
                  <div className="value-card primary">
                    <span className="label">Enterprise Value</span>
                    <span className="value">{formatCurrency(result.summary?.enterpriseValue)}</span>
                  </div>
                  <div className="value-card success">
                    <span className="label">Equity Value</span>
                    <span className="value">{formatCurrency(result.summary?.equityValue)}</span>
                  </div>
                  <div className="value-card">
                    <span className="label">WACC</span>
                    <span className="value">{formatPercent(result.summary?.wacc)}</span>
                  </div>
                  <div className="value-card">
                    <span className="label">Terminal Value</span>
                    <span className="value">{formatCurrency(result.summary?.terminalValue)}</span>
                  </div>
                </div>
              </div>

              <div className="cash-flows-section">
                <h4>Projected Cash Flows</h4>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>FCF</th>
                      <th>Discount Factor</th>
                      <th>Present Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.summary?.projectedCashFlows?.map((cf, idx) => (
                      <tr key={idx}>
                        <td>{cf.year}</td>
                        <td>{formatCurrency(cf.fcf)}</td>
                        <td>{cf.discountFactor}</td>
                        <td>{formatCurrency(cf.presentValue)}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan="3">Terminal Value (PV)</td>
                      <td>{formatCurrency(result.summary?.terminalPV)}</td>
                    </tr>
                    <tr className="total-row">
                      <td colSpan="3"><strong>Total Enterprise Value</strong></td>
                      <td><strong>{formatCurrency(result.summary?.enterpriseValue)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="actions">
                <button className="btn btn-secondary" onClick={runAIAnalysis} disabled={analyzing}>
                  {analyzing ? <RefreshCw size={16} className="spinning" /> : <Brain size={16} />} AI Analysis
                </button>
              </div>

              {analysisError && (
                <div className="error-message">
                  <strong>Error:</strong> {analysisError}
                </div>
              )}

              {analysis && (
                <div className="ai-analysis">
                  <h4><Brain size={18} /> AI Valuation Analysis</h4>

                  {analysis.valuationAssessment && (
                    <p className="assessment">{analysis.valuationAssessment}</p>
                  )}

                  {analysis.recommendation && (
                    <p className="recommendation"><strong>Recommendation:</strong> {analysis.recommendation}</p>
                  )}

                  {analysis.fairValueRange && (
                    <div className="fair-value-range">
                      <span>Fair Value Range: </span>
                      <strong>{formatCurrency(analysis.fairValueRange.low)} - {formatCurrency(analysis.fairValueRange.high)}</strong>
                    </div>
                  )}

                  {analysis.keyDrivers && analysis.keyDrivers.length > 0 && (
                    <div className="analysis-section">
                      <h5>Key Drivers</h5>
                      <ul>{analysis.keyDrivers.map((d, i) => <li key={i}>{d}</li>)}</ul>
                    </div>
                  )}

                  {analysis.risks && analysis.risks.length > 0 && (
                    <div className="analysis-section risks">
                      <h5>Risks</h5>
                      <ul>{analysis.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
                    </div>
                  )}

                  {analysis.raw && (
                    <div className="analysis-section">
                      <p>{analysis.raw}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <Calculator size={60} />
              <h3>Configure & Calculate</h3>
              <p>Enter your assumptions and click Calculate to generate a DCF valuation</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .dcf-page { padding: 0; }
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

        .dcf-layout { display: grid; grid-template-columns: 350px 1fr; gap: 1.5rem; }
        .inputs-panel { background: #1e293b; border: 1px solid #334155; border-radius: 0.75rem; padding: 1.5rem; height: fit-content; }
        .inputs-panel h3 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 1.5rem; color: #f1f5f9; }
        .input-section { margin-bottom: 1.5rem; }
        .input-section h4 { color: #94a3b8; font-size: 0.9rem; margin: 0 0 1rem; }
        .input-group { display: flex; flex-direction: column; gap: 0.75rem; }
        .input-group label { display: flex; flex-direction: column; gap: 0.25rem; color: #94a3b8; font-size: 0.85rem; }
        .input-group input { padding: 0.5rem; background: #0f172a; border: 1px solid #334155; border-radius: 0.375rem; color: #f1f5f9; }
        .checkbox-label { display: flex; align-items: center; gap: 0.5rem; color: #94a3b8; font-size: 0.9rem; cursor: pointer; }
        .checkbox-label input { width: auto; }

        .results-panel { background: #1e293b; border: 1px solid #334155; border-radius: 0.75rem; padding: 1.5rem; }
        .valuation-summary h3 { margin: 0 0 1rem; color: #f1f5f9; }
        .value-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .value-card { background: #0f172a; padding: 1rem; border-radius: 0.5rem; text-align: center; }
        .value-card.primary { border: 2px solid #3b82f6; }
        .value-card.success { border: 2px solid #22c55e; }
        .value-card .label { display: block; color: #94a3b8; font-size: 0.85rem; margin-bottom: 0.5rem; }
        .value-card .value { display: block; color: #f1f5f9; font-size: 1.25rem; font-weight: 700; }
        .value-card.primary .value { color: #3b82f6; }
        .value-card.success .value { color: #22c55e; }

        .cash-flows-section h4 { color: #f1f5f9; margin: 0 0 1rem; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #334155; }
        .data-table th { color: #94a3b8; font-weight: 600; }
        .data-table td { color: #f1f5f9; }
        .data-table .total-row { background: #0f172a; }

        .actions { margin-top: 1.5rem; }
        .ai-analysis { margin-top: 1.5rem; background: #0f172a; padding: 1.5rem; border-radius: 0.5rem; border: 1px solid #334155; }
        .ai-analysis h4 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 1rem; color: #f1f5f9; }
        .assessment { color: #e2e8f0; line-height: 1.6; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #334155; }
        .recommendation { color: #3b82f6; margin-top: 1rem; }
        .fair-value-range { margin-top: 1rem; padding: 0.75rem; background: #1e293b; border-radius: 0.375rem; color: #22c55e; }
        .analysis-section { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #334155; }
        .analysis-section h5 { color: #94a3b8; font-size: 0.9rem; margin: 0 0 0.5rem; }
        .analysis-section ul { margin: 0; padding-left: 1.25rem; }
        .analysis-section li { color: #e2e8f0; font-size: 0.9rem; margin-bottom: 0.5rem; line-height: 1.5; }
        .analysis-section p { color: #e2e8f0; font-size: 0.9rem; margin: 0; line-height: 1.6; }
        .analysis-section.risks h5 { color: #ef4444; }

        .error-message { margin-top: 1rem; padding: 1rem; background: #ef444420; border: 1px solid #ef4444; border-radius: 0.5rem; color: #ef4444; }

        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; color: #94a3b8; text-align: center; }
        .empty-state h3 { margin: 1rem 0 0.5rem; color: #f1f5f9; }

        @media (max-width: 900px) { .dcf-layout { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

export default DCFValuation;
