import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  X,
  RefreshCw,
  Brain,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Building,
  DollarSign,
  Percent,
  Award,
  Target
} from 'lucide-react';
import * as api from '../services/api';

function PeerComparison() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [benchmarks, setBenchmarks] = useState(null);
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchCompanies();
    fetchBenchmarks('');
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await api.getPeerCompanies();
      setCompanies(response.data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchBenchmarks = async (ind) => {
    try {
      const response = await api.getIndustryBenchmarks(ind);
      setBenchmarks(response.data.benchmarks);
    } catch (error) {
      console.error('Error fetching benchmarks:', error);
    }
  };

  const handleCompanySelect = (companyId) => {
    if (selectedCompanies.includes(companyId)) {
      setSelectedCompanies(selectedCompanies.filter(id => id !== companyId));
    } else if (selectedCompanies.length < 5) {
      setSelectedCompanies([...selectedCompanies, companyId]);
    }
  };

  const handleCompare = async () => {
    if (selectedCompanies.length < 2) {
      alert('Please select at least 2 companies to compare');
      return;
    }

    setLoading(true);
    try {
      const response = await api.getPeerComparison(selectedCompanies.join(','));
      setComparisonData(response.data);
      setAnalysis(null);
    } catch (error) {
      console.error('Error fetching comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!comparisonData) return;

    setAnalyzing(true);
    try {
      const response = await api.analyzePeerComparison(selectedCompanies);
      setAnalysis(response.data);
    } catch (error) {
      console.error('Error analyzing:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toLocaleString()}`;
  };

  const getComparisonColor = (value, values, higherIsBetter = true) => {
    if (!value || !values || values.length === 0) return '#6b7280';
    const numValue = parseFloat(value);
    const numValues = values.filter(v => v !== null).map(v => parseFloat(v));
    const max = Math.max(...numValues);
    const min = Math.min(...numValues);

    if (numValue === max) return higherIsBetter ? '#22c55e' : '#ef4444';
    if (numValue === min) return higherIsBetter ? '#ef4444' : '#22c55e';
    return '#f59e0b';
  };

  const MetricRow = ({ label, values, format = 'currency', higherIsBetter = true }) => {
    const formattedValues = values.map(v => {
      if (v === null || v === undefined) return 'N/A';
      if (format === 'currency') return formatCurrency(v);
      if (format === 'percent') return `${v}%`;
      if (format === 'ratio') return v;
      return v;
    });

    return (
      <tr>
        <td className="metric-label">{label}</td>
        {values.map((value, idx) => (
          <td
            key={idx}
            className="metric-value"
            style={{ color: getComparisonColor(value, values, higherIsBetter) }}
          >
            {formattedValues[idx]}
            {value !== null && value !== undefined && (
              <span className="rank-indicator">
                {values.filter(v => v !== null).indexOf(value) === 0 && higherIsBetter && values.filter(v => v !== null).length > 1 && value === Math.max(...values.filter(v => v !== null)) && (
                  <TrendingUp size={14} />
                )}
                {values.filter(v => v !== null).indexOf(value) === 0 && !higherIsBetter && values.filter(v => v !== null).length > 1 && value === Math.min(...values.filter(v => v !== null)) && (
                  <TrendingDown size={14} />
                )}
              </span>
            )}
          </td>
        ))}
      </tr>
    );
  };

  return (
    <div className="peer-comparison-page">
      <div className="page-header">
        <div className="header-content">
          <h1><Users size={28} /> Peer Comparison</h1>
          <p>Compare financial performance across multiple companies</p>
        </div>
      </div>

      <div className="comparison-layout">
        {/* Company Selection */}
        <div className="selection-panel">
          <h3>Select Companies (2-5)</h3>
          <div className="industry-filter">
            <Building size={16} />
            <select value={industry} onChange={(e) => {
              setIndustry(e.target.value);
              fetchBenchmarks(e.target.value);
            }}>
              <option value="">All Industries</option>
              <option value="technology">Technology</option>
              <option value="healthcare">Healthcare</option>
              <option value="retail">Retail</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="financial">Financial</option>
            </select>
          </div>

          <div className="company-list">
            {companies
              .filter(c => !industry || c.industry?.toLowerCase() === industry)
              .map(company => (
                <div
                  key={company.id}
                  className={`company-card ${selectedCompanies.includes(company.id) ? 'selected' : ''}`}
                  onClick={() => handleCompanySelect(company.id)}
                >
                  <div className="company-info">
                    <span className="company-name">{company.name}</span>
                    <span className="company-industry">{company.industry}</span>
                  </div>
                  <div className="selection-indicator">
                    {selectedCompanies.includes(company.id) ? (
                      <X size={18} />
                    ) : (
                      <Plus size={18} />
                    )}
                  </div>
                </div>
              ))}
          </div>

          <div className="selection-actions">
            <button
              className="btn btn-primary"
              onClick={handleCompare}
              disabled={loading || selectedCompanies.length < 2}
            >
              {loading ? <RefreshCw size={16} className="spinning" /> : <BarChart3 size={16} />}
              Compare ({selectedCompanies.length})
            </button>
          </div>
        </div>

        {/* Comparison Results */}
        <div className="results-panel">
          {!comparisonData ? (
            <div className="empty-state">
              <Users size={60} />
              <h3>Select Companies to Compare</h3>
              <p>Choose 2-5 companies from the list to see a side-by-side comparison</p>
            </div>
          ) : (
            <>
              <div className="results-header">
                <h3>Comparison Results</h3>
                <button
                  className="btn btn-secondary"
                  onClick={handleAnalyze}
                  disabled={analyzing}
                >
                  {analyzing ? <RefreshCw size={16} className="spinning" /> : <Brain size={16} />}
                  AI Analysis
                </button>
              </div>

              {/* Company Headers */}
              <div className="comparison-table-wrapper">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th className="metric-header">Metric</th>
                      {comparisonData.companies.map(company => (
                        <th key={company.company.id} className="company-header">
                          <div className="company-header-content">
                            <span className="name">{company.company.name}</span>
                            <span className="industry">{company.company.industry}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Financial Metrics */}
                    <tr className="section-header">
                      <td colSpan={comparisonData.companies.length + 1}>
                        <DollarSign size={16} /> Financial Position
                      </td>
                    </tr>
                    <MetricRow
                      label="Total Assets"
                      values={comparisonData.companies.map(c => c.financials.totalAssets)}
                    />
                    <MetricRow
                      label="Total Liabilities"
                      values={comparisonData.companies.map(c => c.financials.totalLiabilities)}
                      higherIsBetter={false}
                    />
                    <MetricRow
                      label="Shareholders Equity"
                      values={comparisonData.companies.map(c => c.financials.shareholdersEquity)}
                    />
                    <MetricRow
                      label="Revenue"
                      values={comparisonData.companies.map(c => c.financials.revenue)}
                    />
                    <MetricRow
                      label="Net Income"
                      values={comparisonData.companies.map(c => c.financials.netIncome)}
                    />
                    <MetricRow
                      label="Gross Profit"
                      values={comparisonData.companies.map(c => c.financials.grossProfit)}
                    />

                    {/* Financial Ratios */}
                    <tr className="section-header">
                      <td colSpan={comparisonData.companies.length + 1}>
                        <Percent size={16} /> Financial Ratios
                      </td>
                    </tr>
                    <MetricRow
                      label="Current Ratio"
                      values={comparisonData.companies.map(c => c.ratios.currentRatio)}
                      format="ratio"
                    />
                    <MetricRow
                      label="Debt to Equity"
                      values={comparisonData.companies.map(c => c.ratios.debtToEquity)}
                      format="ratio"
                      higherIsBetter={false}
                    />
                    <MetricRow
                      label="Gross Margin"
                      values={comparisonData.companies.map(c => c.ratios.grossMargin)}
                      format="percent"
                    />
                    <MetricRow
                      label="Net Margin"
                      values={comparisonData.companies.map(c => c.ratios.netMargin)}
                      format="percent"
                    />
                    <MetricRow
                      label="ROA"
                      values={comparisonData.companies.map(c => c.ratios.roa)}
                      format="percent"
                    />
                    <MetricRow
                      label="ROE"
                      values={comparisonData.companies.map(c => c.ratios.roe)}
                      format="percent"
                    />
                  </tbody>
                </table>
              </div>

              {/* Industry Benchmarks */}
              {benchmarks && (
                <div className="benchmarks-section">
                  <h4><Target size={18} /> Industry Benchmarks ({industry || 'All'})</h4>
                  <div className="benchmarks-grid">
                    {Object.entries(benchmarks).slice(0, 6).map(([key, value]) => (
                      <div key={key} className="benchmark-item">
                        <span className="benchmark-label">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <div className="benchmark-values">
                          <span className="p25">P25: {value.p25}</span>
                          <span className="p50">P50: {value.p50}</span>
                          <span className="p75">P75: {value.p75}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Analysis Results */}
              {analysis && (
                <div className="analysis-section">
                  <h4><Brain size={18} /> AI Analysis</h4>

                  {/* Performance Ranking */}
                  {analysis.ranking && (
                    <div className="ranking-section">
                      <h5><Award size={16} /> Performance Ranking</h5>
                      <div className="ranking-cards">
                        {analysis.ranking.map((item, idx) => {
                          const isObject = typeof item === 'object';
                          const rank = isObject ? item.rank : idx + 1;
                          const company = isObject ? item.company : item;
                          const score = isObject ? item.overall_score : null;
                          const rationale = isObject ? item.rationale : null;

                          return (
                            <div key={idx} className={`ranking-card rank-${rank}`}>
                              <div className="rank-badge">#{rank}</div>
                              <div className="rank-content">
                                <div className="rank-company">{company}</div>
                                {score && <div className="rank-score">Score: <strong>{score}</strong></div>}
                                {rationale && <div className="rank-rationale">{rationale}</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Strengths & Weaknesses */}
                  <div className="analysis-grid">
                    {analysis.strengths && Object.keys(analysis.strengths).map(company => (
                      <div key={company} className="analysis-card strengths">
                        <div className="card-header">
                          <TrendingUp size={18} />
                          <h5>{company}</h5>
                        </div>
                        <div className="card-label">Strengths</div>
                        <ul>
                          {(Array.isArray(analysis.strengths[company])
                            ? analysis.strengths[company]
                            : [analysis.strengths[company]]
                          ).map((s, idx) => (
                            <li key={idx}>
                              {typeof s === 'object' ? (
                                <div className="item-detail">
                                  <span className="item-text">{s.strength || s.description || s.area || Object.values(s)[0]}</span>
                                  {s.metric && <span className="item-metric">{s.metric}</span>}
                                  {s.impact && <span className="item-impact">{s.impact}</span>}
                                </div>
                              ) : s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}

                    {analysis.weaknesses && Object.keys(analysis.weaknesses).map(company => (
                      <div key={company} className="analysis-card weaknesses">
                        <div className="card-header">
                          <TrendingDown size={18} />
                          <h5>{company}</h5>
                        </div>
                        <div className="card-label">Weaknesses</div>
                        <ul>
                          {(Array.isArray(analysis.weaknesses[company])
                            ? analysis.weaknesses[company]
                            : [analysis.weaknesses[company]]
                          ).map((w, idx) => (
                            <li key={idx}>
                              {typeof w === 'object' ? (
                                <div className="item-detail">
                                  <span className="item-text">{w.weakness || w.description || w.area || Object.values(w)[0]}</span>
                                  {w.metric && <span className="item-metric">{w.metric}</span>}
                                  {w.impact && <span className="item-impact">{w.impact}</span>}
                                </div>
                              ) : w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Differentiators */}
                  {analysis.differentiators && (
                    <div className="differentiators-section">
                      <h5><Target size={16} /> Key Differentiators</h5>
                      <div className="differentiators-list">
                        {(Array.isArray(analysis.differentiators) ? analysis.differentiators : [analysis.differentiators]).map((diff, idx) => (
                          <div key={idx} className="differentiator-item">
                            {typeof diff === 'object' ? (
                              <>
                                <span className="diff-text">{diff.differentiator || diff.description || diff.factor || Object.values(diff)[0]}</span>
                                {diff.company && <span className="diff-company">{diff.company}</span>}
                              </>
                            ) : diff}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {analysis.recommendations && (
                    <div className="recommendations-section">
                      <h5><Target size={16} /> Recommendations</h5>
                      {Object.entries(analysis.recommendations).map(([company, recs]) => (
                        <div key={company} className="company-recommendations">
                          <h6>{company}</h6>
                          <div className="recs-list">
                            {(Array.isArray(recs) ? recs : [recs]).map((rec, idx) => (
                              <div key={idx} className="rec-item">
                                {typeof rec === 'object' ? (
                                  <>
                                    <div className="rec-header">
                                      {rec.priority && <span className={`rec-priority priority-${rec.priority.toLowerCase()}`}>{rec.priority}</span>}
                                      {rec.category && <span className="rec-category">{rec.category}</span>}
                                    </div>
                                    <div className="rec-text">{rec.recommendation || rec.description || rec.action}</div>
                                    {rec.rationale && <div className="rec-rationale">{rec.rationale}</div>}
                                    {rec.expected_impact && <div className="rec-impact"><strong>Expected Impact:</strong> {rec.expected_impact}</div>}
                                  </>
                                ) : (
                                  <div className="rec-text">{rec}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary */}
                  {analysis.summary && (
                    <div className="summary-section">
                      <h5><Brain size={16} /> Summary</h5>
                      <p>{typeof analysis.summary === 'object' ? JSON.stringify(analysis.summary) : analysis.summary}</p>
                    </div>
                  )}

                  {/* Raw JSON fallback */}
                  {analysis.raw && (
                    <div className="raw-analysis">
                      <h5>Analysis Details</h5>
                      <pre>{analysis.raw}</pre>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .peer-comparison-page {
          padding: 0;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .header-content h1 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 0 0.5rem 0;
          color: #f1f5f9;
        }

        .header-content p {
          color: #94a3b8;
          margin: 0;
        }

        .comparison-layout {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 1.5rem;
        }

        .selection-panel {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 0.75rem;
          padding: 1.5rem;
          height: fit-content;
          position: sticky;
          top: 1rem;
        }

        .selection-panel h3 {
          margin: 0 0 1rem;
          color: #f1f5f9;
        }

        .industry-filter {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          color: #94a3b8;
        }

        .industry-filter select {
          flex: 1;
          padding: 0.5rem;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 0.5rem;
          color: #f1f5f9;
        }

        .company-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 400px;
          overflow-y: auto;
          margin-bottom: 1rem;
        }

        .company-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: #0f172a;
          border: 2px solid transparent;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .company-card:hover {
          border-color: #334155;
        }

        .company-card.selected {
          border-color: #3b82f6;
          background: #3b82f610;
        }

        .company-info {
          display: flex;
          flex-direction: column;
        }

        .company-name {
          color: #f1f5f9;
          font-weight: 500;
        }

        .company-industry {
          color: #64748b;
          font-size: 0.8rem;
        }

        .selection-indicator {
          color: #64748b;
        }

        .company-card.selected .selection-indicator {
          color: #ef4444;
        }

        .selection-actions {
          padding-top: 1rem;
          border-top: 1px solid #334155;
        }

        .btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          border: none;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-primary { background: #3b82f6; color: white; }
        .btn-primary:hover { background: #2563eb; }
        .btn-secondary { background: #334155; color: #f1f5f9; }
        .btn-secondary:hover { background: #475569; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .results-panel {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 0.75rem;
          padding: 1.5rem;
          min-height: 500px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 400px;
          color: #94a3b8;
          text-align: center;
        }

        .empty-state h3 {
          margin: 1rem 0 0.5rem;
          color: #f1f5f9;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .results-header h3 {
          margin: 0;
          color: #f1f5f9;
        }

        .results-header .btn {
          width: auto;
        }

        .comparison-table-wrapper {
          overflow-x: auto;
          margin-bottom: 1.5rem;
        }

        .comparison-table {
          width: 100%;
          border-collapse: collapse;
        }

        .comparison-table th, .comparison-table td {
          padding: 0.75rem 1rem;
          text-align: left;
          border-bottom: 1px solid #334155;
        }

        .metric-header {
          color: #94a3b8;
          font-weight: 600;
          min-width: 150px;
        }

        .company-header {
          min-width: 150px;
        }

        .company-header-content {
          display: flex;
          flex-direction: column;
        }

        .company-header-content .name {
          color: #f1f5f9;
          font-weight: 600;
        }

        .company-header-content .industry {
          color: #64748b;
          font-size: 0.8rem;
          font-weight: normal;
        }

        .section-header td {
          background: #0f172a;
          color: #3b82f6;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .metric-label {
          color: #94a3b8;
        }

        .metric-value {
          font-weight: 600;
          position: relative;
        }

        .rank-indicator {
          margin-left: 0.5rem;
        }

        .benchmarks-section {
          background: #0f172a;
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .benchmarks-section h4 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 0 1rem;
          color: #f1f5f9;
        }

        .benchmarks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }

        .benchmark-item {
          padding: 0.75rem;
          background: #1e293b;
          border-radius: 0.5rem;
        }

        .benchmark-label {
          display: block;
          color: #94a3b8;
          font-size: 0.85rem;
          margin-bottom: 0.5rem;
          text-transform: capitalize;
        }

        .benchmark-values {
          display: flex;
          gap: 0.5rem;
          font-size: 0.8rem;
        }

        .benchmark-values span {
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
        }

        .p25 { background: #ef444420; color: #ef4444; }
        .p50 { background: #f59e0b20; color: #f59e0b; }
        .p75 { background: #22c55e20; color: #22c55e; }

        .analysis-section {
          background: #0f172a;
          padding: 1.5rem;
          border-radius: 0.5rem;
        }

        .analysis-section h4 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 0 1.5rem;
          color: #f1f5f9;
        }

        .ranking-section {
          margin-bottom: 1.5rem;
        }

        .ranking-section h5 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #f59e0b;
          margin: 0 0 1rem;
        }

        .ranking-cards {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .ranking-card {
          display: flex;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: #1e293b;
          border-radius: 0.75rem;
          border-left: 4px solid #64748b;
          flex: 1;
          min-width: 250px;
          transition: transform 0.2s;
        }

        .ranking-card:hover {
          transform: translateY(-2px);
        }

        .ranking-card.rank-1 { border-left-color: #fbbf24; background: linear-gradient(135deg, #1e293b 0%, #422006 100%); }
        .ranking-card.rank-2 { border-left-color: #94a3b8; background: linear-gradient(135deg, #1e293b 0%, #1e293b 100%); }
        .ranking-card.rank-3 { border-left-color: #b45309; background: linear-gradient(135deg, #1e293b 0%, #451a03 100%); }

        .rank-badge {
          font-size: 1.5rem;
          font-weight: 800;
          color: #fbbf24;
          min-width: 40px;
        }

        .ranking-card.rank-2 .rank-badge { color: #94a3b8; }
        .ranking-card.rank-3 .rank-badge { color: #b45309; }

        .rank-content {
          flex: 1;
        }

        .rank-company {
          font-size: 1.1rem;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 0.25rem;
        }

        .rank-score {
          font-size: 0.9rem;
          color: #94a3b8;
          margin-bottom: 0.5rem;
        }

        .rank-score strong {
          color: #22c55e;
        }

        .rank-rationale {
          font-size: 0.85rem;
          color: #64748b;
          line-height: 1.5;
        }

        .analysis-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .analysis-card {
          padding: 1.25rem;
          background: #1e293b;
          border-radius: 0.75rem;
          border: 1px solid #334155;
        }

        .analysis-card .card-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .analysis-card .card-header h5 {
          margin: 0;
          font-size: 1rem;
          color: #f1f5f9;
        }

        .analysis-card.strengths { border-top: 3px solid #22c55e; }
        .analysis-card.weaknesses { border-top: 3px solid #ef4444; }

        .analysis-card.strengths .card-header svg { color: #22c55e; }
        .analysis-card.weaknesses .card-header svg { color: #ef4444; }

        .card-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.75rem;
        }

        .analysis-card.strengths .card-label { color: #22c55e; }
        .analysis-card.weaknesses .card-label { color: #ef4444; }

        .analysis-card ul {
          margin: 0;
          padding-left: 1.25rem;
        }

        .analysis-card li {
          color: #cbd5e1;
          font-size: 0.9rem;
          margin-bottom: 0.75rem;
          line-height: 1.5;
        }

        .item-detail {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .item-text {
          color: #e2e8f0;
        }

        .item-metric {
          font-size: 0.8rem;
          color: #3b82f6;
          font-weight: 500;
        }

        .item-impact {
          font-size: 0.8rem;
          color: #94a3b8;
          font-style: italic;
        }

        .differentiators-section {
          margin-bottom: 1.5rem;
        }

        .differentiators-section h5 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #8b5cf6;
          margin: 0 0 1rem;
        }

        .differentiators-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .differentiator-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 0.5rem;
        }

        .diff-text {
          color: #e2e8f0;
          font-size: 0.9rem;
        }

        .diff-company {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          background: #8b5cf620;
          color: #a78bfa;
          border-radius: 0.25rem;
        }

        .recommendations-section {
          margin-bottom: 1.5rem;
        }

        .recommendations-section > h5 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #3b82f6;
          margin: 0 0 1rem;
        }

        .company-recommendations {
          margin-bottom: 1.25rem;
          padding: 1.25rem;
          background: #1e293b;
          border-radius: 0.75rem;
          border: 1px solid #334155;
        }

        .company-recommendations h6 {
          color: #f1f5f9;
          font-size: 1rem;
          margin: 0 0 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #334155;
        }

        .recs-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .rec-item {
          padding: 1rem;
          background: #0f172a;
          border-radius: 0.5rem;
          border-left: 3px solid #3b82f6;
        }

        .rec-header {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .rec-priority {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          padding: 0.2rem 0.5rem;
          border-radius: 0.25rem;
        }

        .rec-priority.priority-high { background: #ef444430; color: #f87171; }
        .rec-priority.priority-medium { background: #f59e0b30; color: #fbbf24; }
        .rec-priority.priority-low { background: #22c55e30; color: #4ade80; }

        .rec-category {
          font-size: 0.75rem;
          padding: 0.2rem 0.5rem;
          background: #334155;
          color: #94a3b8;
          border-radius: 0.25rem;
        }

        .rec-text {
          color: #e2e8f0;
          font-size: 0.95rem;
          line-height: 1.5;
          margin-bottom: 0.5rem;
        }

        .rec-rationale {
          font-size: 0.85rem;
          color: #94a3b8;
          line-height: 1.5;
          margin-bottom: 0.5rem;
          font-style: italic;
        }

        .rec-impact {
          font-size: 0.85rem;
          color: #22c55e;
          padding: 0.5rem;
          background: #22c55e10;
          border-radius: 0.25rem;
        }

        .summary-section {
          padding: 1.5rem;
          background: linear-gradient(135deg, #3b82f615 0%, #8b5cf615 100%);
          border: 1px solid #3b82f640;
          border-radius: 0.75rem;
        }

        .summary-section h5 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #f1f5f9;
          margin: 0 0 1rem;
        }

        .summary-section p {
          color: #e2e8f0;
          margin: 0;
          line-height: 1.7;
          font-size: 0.95rem;
        }

        .raw-analysis {
          margin-top: 1.5rem;
          padding: 1rem;
          background: #0f172a;
          border-radius: 0.5rem;
          border: 1px solid #334155;
        }

        .raw-analysis h5 {
          color: #94a3b8;
          margin: 0 0 0.75rem;
        }

        .raw-analysis pre {
          margin: 0;
          color: #94a3b8;
          font-size: 0.85rem;
          white-space: pre-wrap;
          word-break: break-word;
          line-height: 1.6;
        }

        @media (max-width: 900px) {
          .comparison-layout {
            grid-template-columns: 1fr;
          }

          .selection-panel {
            position: static;
          }
        }
      `}</style>
    </div>
  );
}

export default PeerComparison;
