import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Brain,
  Plus,
  Trash2,
  Play,
  Settings,
  BarChart3
} from 'lucide-react';
import * as api from '../services/api';

function ScenarioAnalysis() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [scenarios, setScenarios] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const [config, setConfig] = useState({
    bestCase: { revenueChange: 20, cogsChange: -5, expenseChange: -10 },
    worstCase: { revenueChange: -15, cogsChange: 10, expenseChange: 15 },
    custom: { revenueChange: 0, cogsChange: 0, expenseChange: 0 }
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchScenarios();
    }
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    try {
      const response = await api.getCompanies();
      setCompanies(response.data);
      if (response.data.length > 0) {
        setSelectedCompany(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchScenarios = async () => {
    try {
      const response = await api.getScenarioAnalyses({ company_id: selectedCompany });
      setScenarios(response.data);
    } catch (error) {
      console.error('Error fetching scenarios:', error);
    }
  };

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const response = await api.runScenarioAnalysis({
        company_id: selectedCompany,
        what_if_changes: config
      });
      setAnalysisResult(response.data);
    } catch (error) {
      console.error('Error running analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'N/A';
    return `$${Math.round(num).toLocaleString()}`;
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'N/A';
    return `${num.toFixed(1)}%`;
  };

  const getChangeColor = (value) => {
    if (value > 0) return '#22c55e';
    if (value < 0) return '#ef4444';
    return '#94a3b8';
  };

  // Helper to safely render AI response items (handles strings, objects, arrays)
  const renderItem = (item) => {
    if (item === null || item === undefined) return 'N/A';
    if (typeof item === 'string') return item;
    if (typeof item === 'number') return item.toString();
    if (typeof item === 'object') {
      // If it's an object, render its values
      return Object.entries(item)
        .map(([key, val]) => `${key.replace(/_/g, ' ')}: ${typeof val === 'object' ? JSON.stringify(val) : val}`)
        .join('; ');
    }
    return String(item);
  };

  const renderSummary = (summary) => {
    if (!summary) return null;
    if (typeof summary === 'string') return summary;
    if (typeof summary === 'object') {
      return Object.entries(summary)
        .map(([key, val]) => `${key.replace(/_/g, ' ')}: ${typeof val === 'object' ? JSON.stringify(val) : val}`)
        .join('\n\n');
    }
    return String(summary);
  };

  return (
    <div className="scenario-analysis-page">
      <div className="page-header">
        <div className="header-content">
          <h1><GitBranch size={28} /> What-If Scenario Analysis</h1>
          <p>Model different business scenarios and analyze financial impact</p>
        </div>
        <div className="header-actions">
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="company-select"
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={() => setShowConfig(!showConfig)}>
            <Settings size={16} /> Configure
          </button>
          <button className="btn btn-primary" onClick={runAnalysis} disabled={loading}>
            {loading ? <RefreshCw size={16} className="spinning" /> : <Play size={16} />}
            Run Analysis
          </button>
        </div>
      </div>

      {showConfig && (
        <div className="config-panel">
          <h3>Scenario Configuration</h3>
          <div className="config-grid">
            <div className="scenario-config">
              <h4><TrendingUp size={16} color="#22c55e" /> Best Case</h4>
              <div className="config-inputs">
                <label>
                  Revenue Change (%)
                  <input
                    type="number"
                    value={config.bestCase.revenueChange}
                    onChange={(e) => setConfig({
                      ...config,
                      bestCase: { ...config.bestCase, revenueChange: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </label>
                <label>
                  COGS Change (%)
                  <input
                    type="number"
                    value={config.bestCase.cogsChange}
                    onChange={(e) => setConfig({
                      ...config,
                      bestCase: { ...config.bestCase, cogsChange: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </label>
                <label>
                  Expense Change (%)
                  <input
                    type="number"
                    value={config.bestCase.expenseChange}
                    onChange={(e) => setConfig({
                      ...config,
                      bestCase: { ...config.bestCase, expenseChange: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </label>
              </div>
            </div>

            <div className="scenario-config">
              <h4><TrendingDown size={16} color="#ef4444" /> Worst Case</h4>
              <div className="config-inputs">
                <label>
                  Revenue Change (%)
                  <input
                    type="number"
                    value={config.worstCase.revenueChange}
                    onChange={(e) => setConfig({
                      ...config,
                      worstCase: { ...config.worstCase, revenueChange: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </label>
                <label>
                  COGS Change (%)
                  <input
                    type="number"
                    value={config.worstCase.cogsChange}
                    onChange={(e) => setConfig({
                      ...config,
                      worstCase: { ...config.worstCase, cogsChange: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </label>
                <label>
                  Expense Change (%)
                  <input
                    type="number"
                    value={config.worstCase.expenseChange}
                    onChange={(e) => setConfig({
                      ...config,
                      worstCase: { ...config.worstCase, expenseChange: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </label>
              </div>
            </div>

            <div className="scenario-config">
              <h4><BarChart3 size={16} color="#3b82f6" /> Custom Scenario</h4>
              <div className="config-inputs">
                <label>
                  Revenue Change (%)
                  <input
                    type="number"
                    value={config.custom.revenueChange}
                    onChange={(e) => setConfig({
                      ...config,
                      custom: { ...config.custom, revenueChange: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </label>
                <label>
                  COGS Change (%)
                  <input
                    type="number"
                    value={config.custom.cogsChange}
                    onChange={(e) => setConfig({
                      ...config,
                      custom: { ...config.custom, cogsChange: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </label>
                <label>
                  Expense Change (%)
                  <input
                    type="number"
                    value={config.custom.expenseChange}
                    onChange={(e) => setConfig({
                      ...config,
                      custom: { ...config.custom, expenseChange: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {analysisResult && (
        <div className="results-section">
          <h2>Scenario Comparison</h2>

          <div className="scenarios-grid">
            {analysisResult.scenarios?.map((scenario, idx) => (
              <div key={idx} className={`scenario-card ${scenario.name.toLowerCase().replace(' ', '-')}`}>
                <h3>
                  {scenario.name === 'Best Case' && <TrendingUp size={20} />}
                  {scenario.name === 'Worst Case' && <TrendingDown size={20} />}
                  {scenario.name === 'Base Case' && <BarChart3 size={20} />}
                  {scenario.name === 'Custom Scenario' && <Settings size={20} />}
                  {scenario.name}
                </h3>
                <div className="scenario-metrics">
                  <div className="metric">
                    <span className="label">Revenue</span>
                    <span className="value">{formatCurrency(scenario.revenue)}</span>
                  </div>
                  <div className="metric">
                    <span className="label">Gross Profit</span>
                    <span className="value">{formatCurrency(scenario.grossProfit)}</span>
                  </div>
                  <div className="metric">
                    <span className="label">Operating Income</span>
                    <span className="value">{formatCurrency(scenario.operatingIncome)}</span>
                  </div>
                  <div className="metric highlight">
                    <span className="label">Net Income</span>
                    <span className="value" style={{ color: getChangeColor(scenario.netIncome) }}>
                      {formatCurrency(scenario.netIncome)}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="label">Profit Margin</span>
                    <span className="value" style={{ color: getChangeColor(scenario.profitMargin) }}>
                      {formatPercent(scenario.profitMargin)}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="label">ROA</span>
                    <span className="value">{formatPercent(scenario.roa)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {analysisResult.aiAnalysis && (
            <div className="ai-analysis">
              <h3><Brain size={20} /> AI Analysis</h3>

              {analysisResult.aiAnalysis.summary && (
                <div className="summary-box">
                  <p style={{ whiteSpace: 'pre-wrap' }}>{renderSummary(analysisResult.aiAnalysis.summary)}</p>
                </div>
              )}

              <div className="analysis-grid">
                {analysisResult.aiAnalysis.risks && (
                  <div className="analysis-card risks">
                    <h4>Risks</h4>
                    <ul>
                      {(Array.isArray(analysisResult.aiAnalysis.risks)
                        ? analysisResult.aiAnalysis.risks
                        : [analysisResult.aiAnalysis.risks]
                      ).map((risk, idx) => (
                        <li key={idx}>{renderItem(risk)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.aiAnalysis.opportunities && (
                  <div className="analysis-card opportunities">
                    <h4>Opportunities</h4>
                    <ul>
                      {(Array.isArray(analysisResult.aiAnalysis.opportunities)
                        ? analysisResult.aiAnalysis.opportunities
                        : [analysisResult.aiAnalysis.opportunities]
                      ).map((opp, idx) => (
                        <li key={idx}>{renderItem(opp)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.aiAnalysis.recommendations && (
                  <div className="analysis-card recommendations">
                    <h4>Recommendations</h4>
                    <ul>
                      {(Array.isArray(analysisResult.aiAnalysis.recommendations)
                        ? analysisResult.aiAnalysis.recommendations
                        : [analysisResult.aiAnalysis.recommendations]
                      ).map((rec, idx) => (
                        <li key={idx}>{renderItem(rec)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!analysisResult && (
        <div className="empty-state">
          <GitBranch size={60} />
          <h3>Run a Scenario Analysis</h3>
          <p>Configure your scenarios and click "Run Analysis" to compare outcomes</p>
        </div>
      )}

      <style jsx>{`
        .scenario-analysis-page { padding: 0; }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-content h1 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 0 0.5rem 0;
          color: #f1f5f9;
        }

        .header-content p { color: #94a3b8; margin: 0; }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .company-select {
          padding: 0.5rem 1rem;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 0.5rem;
          color: #f1f5f9;
          min-width: 200px;
        }

        .btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          border: none;
          cursor: pointer;
          font-weight: 500;
        }

        .btn-primary { background: #3b82f6; color: white; }
        .btn-secondary { background: #334155; color: #f1f5f9; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .config-panel {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .config-panel h3 { margin: 0 0 1rem; color: #f1f5f9; }

        .config-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .scenario-config {
          background: #0f172a;
          padding: 1rem;
          border-radius: 0.5rem;
        }

        .scenario-config h4 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 0 1rem;
          color: #f1f5f9;
        }

        .config-inputs {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .config-inputs label {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          color: #94a3b8;
          font-size: 0.85rem;
        }

        .config-inputs input {
          padding: 0.5rem;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 0.375rem;
          color: #f1f5f9;
        }

        .results-section {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 0.75rem;
          padding: 1.5rem;
        }

        .results-section h2 { margin: 0 0 1.5rem; color: #f1f5f9; }

        .scenarios-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .scenario-card {
          background: #0f172a;
          border: 2px solid #334155;
          border-radius: 0.75rem;
          padding: 1.25rem;
        }

        .scenario-card.best-case { border-color: #22c55e40; }
        .scenario-card.worst-case { border-color: #ef444440; }
        .scenario-card.base-case { border-color: #3b82f640; }
        .scenario-card.custom-scenario { border-color: #8b5cf640; }

        .scenario-card h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 0 1rem;
          color: #f1f5f9;
        }

        .scenario-card.best-case h3 { color: #22c55e; }
        .scenario-card.worst-case h3 { color: #ef4444; }
        .scenario-card.base-case h3 { color: #3b82f6; }
        .scenario-card.custom-scenario h3 { color: #8b5cf6; }

        .scenario-metrics {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .metric {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #1e293b;
        }

        .metric.highlight {
          background: #1e293b;
          margin: 0.5rem -0.5rem;
          padding: 0.75rem 0.5rem;
          border-radius: 0.375rem;
          border: none;
        }

        .metric .label { color: #94a3b8; }
        .metric .value { color: #f1f5f9; font-weight: 600; }

        .ai-analysis {
          background: #0f172a;
          border-radius: 0.75rem;
          padding: 1.5rem;
        }

        .ai-analysis h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 0 1rem;
          color: #f1f5f9;
        }

        .summary-box {
          background: linear-gradient(135deg, #3b82f620 0%, #8b5cf620 100%);
          border: 1px solid #3b82f640;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .summary-box p { margin: 0; color: #e2e8f0; line-height: 1.6; }

        .analysis-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .analysis-card {
          padding: 1rem;
          background: #1e293b;
          border-radius: 0.5rem;
        }

        .analysis-card h4 { margin: 0 0 0.75rem; }
        .analysis-card.risks h4 { color: #ef4444; }
        .analysis-card.opportunities h4 { color: #22c55e; }
        .analysis-card.recommendations h4 { color: #3b82f6; }

        .analysis-card ul {
          margin: 0;
          padding-left: 1.25rem;
        }

        .analysis-card li {
          color: #94a3b8;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          color: #94a3b8;
          text-align: center;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 0.75rem;
        }

        .empty-state h3 { margin: 1rem 0 0.5rem; color: #f1f5f9; }
      `}</style>
    </div>
  );
}

export default ScenarioAnalysis;
