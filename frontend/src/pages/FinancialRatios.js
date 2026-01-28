import React, { useState, useEffect } from 'react';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  Brain,
  BarChart3,
  DollarSign,
  Percent,
  Activity
} from 'lucide-react';
import * as api from '../services/api';

function FinancialRatios() {
  const [ratios, setRatios] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [benchmarks, setBenchmarks] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchRatios();
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

  const fetchRatios = async () => {
    setLoading(true);
    try {
      const response = await api.getFinancialRatios(selectedCompany);
      setRatios(response.data);

      const company = companies.find(c => c.id === selectedCompany);
      if (company) {
        const benchResponse = await api.getRatioBenchmarks(company.industry || 'technology');
        setBenchmarks(benchResponse.data);
      }
    } catch (error) {
      console.error('Error fetching ratios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!ratios) return;
    setAnalyzing(true);
    try {
      const response = await api.analyzeFinancialRatios(selectedCompany, ratios);
      setAnalysis(response.data);
    } catch (error) {
      console.error('Error analyzing ratios:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const getRatioStatus = (value, benchmark) => {
    if (!value || !benchmark) return 'neutral';
    const numValue = parseFloat(value);
    if (numValue >= benchmark.high) return 'excellent';
    if (numValue >= benchmark.median) return 'good';
    if (numValue >= benchmark.low) return 'fair';
    return 'poor';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return '#22c55e';
      case 'good': return '#3b82f6';
      case 'fair': return '#f59e0b';
      case 'poor': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Helper function to render items that may be strings or objects
  const renderItem = (item) => {
    if (item === null || item === undefined) return 'N/A';
    if (typeof item === 'string') return item;
    if (typeof item === 'number') return String(item);
    if (typeof item === 'object') {
      // Handle objects with common keys
      if (item.action) return item.action;
      if (item.recommendation) return item.recommendation;
      if (item.description) return item.description;
      if (item.text) return item.text;
      if (item.message) return item.message;
      if (item.assessment) return item.assessment;
      // Fallback: convert object to readable string
      return Object.entries(item)
        .filter(([key, val]) => val !== null && val !== undefined)
        .map(([key, val]) => {
          const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
          const value = typeof val === 'object' ? JSON.stringify(val) : val;
          return `${label}: ${value}`;
        })
        .join(' | ');
    }
    return String(item);
  };

  // Helper to render industryComparison which can be string or object
  const renderComparison = (comparison) => {
    if (!comparison) return null;
    if (typeof comparison === 'string') return comparison;
    if (typeof comparison === 'object') {
      if (comparison.assessment) return comparison.assessment;
      if (comparison.summary) return comparison.summary;
      if (comparison.details) {
        return typeof comparison.details === 'string'
          ? comparison.details
          : JSON.stringify(comparison.details);
      }
      return Object.entries(comparison)
        .filter(([key, val]) => val !== null && val !== undefined)
        .map(([key, val]) => `${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`)
        .join(' | ');
    }
    return String(comparison);
  };

  const RatioCard = ({ title, value, unit, benchmark, description, icon: Icon }) => {
    const status = getRatioStatus(value, benchmark);
    const statusColor = getStatusColor(status);

    return (
      <div className="card ratio-card">
        <div className="ratio-header">
          <div className="ratio-icon" style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
            <Icon size={20} />
          </div>
          <div className="ratio-title">{title}</div>
        </div>
        <div className="ratio-value" style={{ color: statusColor }}>
          {value !== null ? `${value}${unit || ''}` : 'N/A'}
        </div>
        {benchmark && (
          <div className="ratio-benchmark">
            <span>Industry: Low {benchmark.low} | Median {benchmark.median} | High {benchmark.high}</span>
          </div>
        )}
        {description && <div className="ratio-description">{description}</div>}
        <div className="ratio-status" style={{ color: statusColor }}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      </div>
    );
  };

  return (
    <div className="financial-ratios-page">
      <div className="page-header">
        <div className="header-content">
          <h1><Calculator size={28} /> Financial Ratio Dashboard</h1>
          <p>Comprehensive analysis of 20+ financial ratios with industry benchmarks</p>
        </div>
        <div className="header-actions">
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="company-select"
          >
            {companies.map(company => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={fetchRatios} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spinning' : ''} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing || !ratios}>
            <Brain size={16} /> {analyzing ? 'Analyzing...' : 'AI Analysis'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <RefreshCw size={40} className="spinning" />
          <p>Calculating financial ratios...</p>
        </div>
      ) : ratios ? (
        <>
          {/* Liquidity Ratios */}
          <section className="ratio-section">
            <h2><Activity size={24} /> Liquidity Ratios</h2>
            <p className="section-description">Measure the company's ability to pay short-term obligations</p>
            <div className="ratios-grid">
              <RatioCard
                title="Current Ratio"
                value={ratios.liquidity?.currentRatio}
                benchmark={benchmarks?.currentRatio}
                description="Current Assets / Current Liabilities"
                icon={BarChart3}
              />
              <RatioCard
                title="Quick Ratio"
                value={ratios.liquidity?.quickRatio}
                benchmark={benchmarks?.quickRatio}
                description="(Current Assets - Inventory) / Current Liabilities"
                icon={Activity}
              />
              <RatioCard
                title="Cash Ratio"
                value={ratios.liquidity?.cashRatio}
                benchmark={{ low: 0.2, median: 0.5, high: 1.0 }}
                description="Cash / Current Liabilities"
                icon={DollarSign}
              />
              <RatioCard
                title="Working Capital"
                value={ratios.liquidity?.workingCapital}
                unit=""
                description="Current Assets - Current Liabilities"
                icon={TrendingUp}
              />
            </div>
          </section>

          {/* Profitability Ratios */}
          <section className="ratio-section">
            <h2><TrendingUp size={24} /> Profitability Ratios</h2>
            <p className="section-description">Measure the company's ability to generate profits</p>
            <div className="ratios-grid">
              <RatioCard
                title="Gross Profit Margin"
                value={ratios.profitability?.grossProfitMargin}
                unit="%"
                benchmark={benchmarks?.grossProfitMargin}
                description="Gross Profit / Revenue"
                icon={Percent}
              />
              <RatioCard
                title="Operating Profit Margin"
                value={ratios.profitability?.operatingProfitMargin}
                unit="%"
                description="Operating Income / Revenue"
                icon={Percent}
              />
              <RatioCard
                title="Net Profit Margin"
                value={ratios.profitability?.netProfitMargin}
                unit="%"
                benchmark={benchmarks?.netProfitMargin}
                description="Net Income / Revenue"
                icon={Percent}
              />
              <RatioCard
                title="Return on Assets (ROA)"
                value={ratios.profitability?.returnOnAssets}
                unit="%"
                description="Net Income / Total Assets"
                icon={TrendingUp}
              />
              <RatioCard
                title="Return on Equity (ROE)"
                value={ratios.profitability?.returnOnEquity}
                unit="%"
                benchmark={benchmarks?.returnOnEquity}
                description="Net Income / Shareholders Equity"
                icon={TrendingUp}
              />
              <RatioCard
                title="Return on Capital Employed"
                value={ratios.profitability?.returnOnCapitalEmployed}
                unit="%"
                description="EBIT / (Total Assets - Current Liabilities)"
                icon={TrendingUp}
              />
            </div>
          </section>

          {/* Leverage Ratios */}
          <section className="ratio-section">
            <h2><AlertCircle size={24} /> Leverage/Solvency Ratios</h2>
            <p className="section-description">Measure the company's financial leverage and long-term solvency</p>
            <div className="ratios-grid">
              <RatioCard
                title="Debt to Equity"
                value={ratios.leverage?.debtToEquity}
                benchmark={benchmarks?.debtToEquity}
                description="Total Liabilities / Shareholders Equity"
                icon={BarChart3}
              />
              <RatioCard
                title="Debt Ratio"
                value={ratios.leverage?.debtRatio}
                unit="%"
                description="Total Liabilities / Total Assets"
                icon={Percent}
              />
              <RatioCard
                title="Equity Ratio"
                value={ratios.leverage?.equityRatio}
                unit="%"
                description="Shareholders Equity / Total Assets"
                icon={Percent}
              />
              <RatioCard
                title="Interest Coverage"
                value={ratios.leverage?.interestCoverage}
                unit="x"
                description="EBIT / Interest Expense"
                icon={Activity}
              />
              <RatioCard
                title="Debt to Capital"
                value={ratios.leverage?.debtToCapital}
                unit="%"
                description="Total Debt / (Total Debt + Equity)"
                icon={Percent}
              />
            </div>
          </section>

          {/* Efficiency Ratios */}
          <section className="ratio-section">
            <h2><RefreshCw size={24} /> Efficiency Ratios</h2>
            <p className="section-description">Measure how efficiently the company uses its assets</p>
            <div className="ratios-grid">
              <RatioCard
                title="Asset Turnover"
                value={ratios.efficiency?.assetTurnover}
                unit="x"
                description="Revenue / Total Assets"
                icon={RefreshCw}
              />
              <RatioCard
                title="Inventory Turnover"
                value={ratios.efficiency?.inventoryTurnover}
                unit="x"
                description="COGS / Average Inventory"
                icon={RefreshCw}
              />
              <RatioCard
                title="Receivables Turnover"
                value={ratios.efficiency?.receivablesTurnover}
                unit="x"
                description="Revenue / Average Receivables"
                icon={RefreshCw}
              />
              <RatioCard
                title="Payables Turnover"
                value={ratios.efficiency?.payablesTurnover}
                unit="x"
                description="COGS / Average Payables"
                icon={RefreshCw}
              />
              <RatioCard
                title="Fixed Asset Turnover"
                value={ratios.efficiency?.fixedAssetTurnover}
                unit="x"
                description="Revenue / Fixed Assets"
                icon={RefreshCw}
              />
            </div>
          </section>

          {/* Cash Flow Ratios */}
          <section className="ratio-section">
            <h2><DollarSign size={24} /> Cash Flow Ratios</h2>
            <p className="section-description">Measure the company's cash generation capabilities</p>
            <div className="ratios-grid">
              <RatioCard
                title="Operating Cash Flow Ratio"
                value={ratios.cashFlow?.operatingCashFlowRatio}
                description="Operating Cash Flow / Current Liabilities"
                icon={DollarSign}
              />
              <RatioCard
                title="Cash Flow to Debt"
                value={ratios.cashFlow?.cashFlowToDebt}
                description="Operating Cash Flow / Total Debt"
                icon={DollarSign}
              />
              <RatioCard
                title="Free Cash Flow Yield"
                value={ratios.cashFlow?.freeCashFlowYield}
                unit="%"
                description="Free Cash Flow / Market Cap"
                icon={Percent}
              />
            </div>
          </section>

          {/* AI Analysis Results */}
          {analysis && (
            <section className="analysis-section">
              <h2><Brain size={24} /> AI Analysis Results</h2>
              <div className="analysis-content">
                <div className="health-score">
                  <div className="score-circle" style={{
                    background: `conic-gradient(${analysis.healthScore >= 70 ? '#22c55e' : analysis.healthScore >= 50 ? '#f59e0b' : '#ef4444'} ${analysis.healthScore}%, #1e293b ${analysis.healthScore}%)`
                  }}>
                    <span>{analysis.healthScore}</span>
                  </div>
                  <div className="score-label">Financial Health Score</div>
                </div>

                <div className="analysis-grid">
                  <div className="analysis-card strengths">
                    <h3><TrendingUp size={20} /> Strengths</h3>
                    <ul>
                      {analysis.strengths?.map((strength, idx) => (
                        <li key={idx}>{renderItem(strength)}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="analysis-card concerns">
                    <h3><TrendingDown size={20} /> Areas of Concern</h3>
                    <ul>
                      {analysis.concerns?.map((concern, idx) => (
                        <li key={idx}>{renderItem(concern)}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="analysis-card recommendations">
                    <h3><AlertCircle size={20} /> Recommendations</h3>
                    <ul>
                      {analysis.recommendations?.map((rec, idx) => (
                        <li key={idx}>{renderItem(rec)}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {analysis.industryComparison && (
                  <div className="industry-comparison">
                    <h3>Industry Comparison</h3>
                    <p>{renderComparison(analysis.industryComparison)}</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="empty-state">
          <Calculator size={60} />
          <h3>No Data Available</h3>
          <p>Select a company to view financial ratios</p>
        </div>
      )}

      <style jsx>{`
        .financial-ratios-page {
          padding: 0;
        }

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

        .header-content p {
          color: #94a3b8;
          margin: 0;
        }

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
          transition: all 0.2s;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        .btn-secondary {
          background: #334155;
          color: #f1f5f9;
        }

        .btn-secondary:hover {
          background: #475569;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .ratio-section {
          margin-bottom: 2rem;
        }

        .ratio-section h2 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #f1f5f9;
          margin-bottom: 0.5rem;
        }

        .section-description {
          color: #94a3b8;
          margin-bottom: 1rem;
        }

        .ratios-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .ratio-card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 0.75rem;
          padding: 1.25rem;
        }

        .ratio-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .ratio-icon {
          width: 40px;
          height: 40px;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ratio-title {
          font-weight: 600;
          color: #f1f5f9;
        }

        .ratio-value {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .ratio-benchmark {
          font-size: 0.75rem;
          color: #64748b;
          margin-bottom: 0.5rem;
        }

        .ratio-description {
          font-size: 0.8rem;
          color: #94a3b8;
          margin-bottom: 0.5rem;
        }

        .ratio-status {
          font-size: 0.85rem;
          font-weight: 600;
        }

        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          color: #94a3b8;
          text-align: center;
        }

        .empty-state h3 {
          margin: 1rem 0 0.5rem;
          color: #f1f5f9;
        }

        .analysis-section {
          margin-top: 2rem;
          padding: 1.5rem;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 0.75rem;
        }

        .analysis-section h2 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #f1f5f9;
          margin-bottom: 1.5rem;
        }

        .analysis-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .health-score {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.5rem;
        }

        .score-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .score-circle span {
          font-size: 2.5rem;
          font-weight: 700;
          color: #f1f5f9;
          background: #0f172a;
          width: 90px;
          height: 90px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .score-label {
          margin-top: 1rem;
          font-weight: 600;
          color: #94a3b8;
        }

        .analysis-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
        }

        .analysis-card {
          padding: 1rem;
          background: #0f172a;
          border-radius: 0.5rem;
        }

        .analysis-card h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          font-size: 1rem;
        }

        .analysis-card.strengths h3 { color: #22c55e; }
        .analysis-card.concerns h3 { color: #f59e0b; }
        .analysis-card.recommendations h3 { color: #3b82f6; }

        .analysis-card ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .analysis-card li {
          padding: 0.5rem 0;
          color: #e2e8f0;
          font-size: 0.9rem;
          border-bottom: 1px solid #1e293b;
        }

        .analysis-card li:last-child {
          border-bottom: none;
        }

        .industry-comparison {
          padding: 1rem;
          background: #0f172a;
          border-radius: 0.5rem;
        }

        .industry-comparison h3 {
          color: #f1f5f9;
          margin-bottom: 0.5rem;
        }

        .industry-comparison p {
          color: #94a3b8;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}

export default FinancialRatios;
