import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, TrendingUp, DollarSign, ArrowRightLeft, PieChart,
  BarChart3, Scale, Target, History, FileSpreadsheet, Lightbulb,
  AlertTriangle, LineChart, Shield, Receipt, Brain
} from 'lucide-react';
import { getDashboardSummary, getAlerts } from '../services/api';

const featureCards = [
  { key: 'financialStatements', icon: FileText, label: 'Financial Statements', path: '/financial-statements', color: '#3b82f6', bg: '#eff6ff', description: 'Comprehensive financial reports' },
  { key: 'revenueForecasts', icon: TrendingUp, label: 'Revenue Forecasts', path: '/revenue-forecasts', color: '#10b981', bg: '#ecfdf5', description: 'AI-powered revenue predictions' },
  { key: 'expenseRecords', icon: DollarSign, label: 'Expense Records', path: '/expense-records', color: '#f59e0b', bg: '#fffbeb', description: 'Track and manage expenses' },
  { key: 'cashFlowRecords', icon: ArrowRightLeft, label: 'Cash Flow', path: '/cash-flow', color: '#8b5cf6', bg: '#f5f3ff', description: 'Monitor cash movements' },
  { key: 'budgetActuals', icon: PieChart, label: 'Budget vs Actuals', path: '/budget-actuals', color: '#ec4899', bg: '#fdf2f8', description: 'Budget variance analysis' },
  { key: 'profitLossRecords', icon: BarChart3, label: 'Profit & Loss', path: '/profit-loss', color: '#06b6d4', bg: '#ecfeff', description: 'Income statement analysis' },
  { key: 'balanceSheets', icon: Scale, label: 'Balance Sheets', path: '/balance-sheets', color: '#84cc16', bg: '#f7fee7', description: 'Asset and liability reports' },
  { key: 'kpiMetrics', icon: Target, label: 'KPI Metrics', path: '/kpi-metrics', color: '#f97316', bg: '#fff7ed', description: 'Key performance indicators' },
  { key: 'aiInsights', icon: Lightbulb, label: 'AI Insights', path: '/ai-insights', color: '#6366f1', bg: '#eef2ff', description: 'Intelligent recommendations' },
  { key: 'anomalyDetections', icon: AlertTriangle, label: 'Anomaly Detection', path: '/anomaly-detections', color: '#ef4444', bg: '#fef2f2', description: 'Unusual pattern detection' },
  { key: 'trendAnalyses', icon: LineChart, label: 'Trend Analysis', path: '/trend-analyses', color: '#14b8a6', bg: '#f0fdfa', description: 'Historical trend patterns' },
  { key: 'complianceReports', icon: Shield, label: 'Compliance', path: '/compliance-reports', color: '#7c3aed', bg: '#f5f3ff', description: 'Regulatory compliance' },
  { key: 'taxReports', icon: Receipt, label: 'Tax Reports', path: '/tax-reports', color: '#059669', bg: '#ecfdf5', description: 'Tax liability management' },
  { key: 'customReports', icon: FileSpreadsheet, label: 'Custom Reports', path: '/custom-reports', color: '#0891b2', bg: '#ecfeff', description: 'Build custom reports' },
  { key: 'auditLogs', icon: History, label: 'Audit Logs', path: '/audit-logs', color: '#64748b', bg: '#f8fafc', description: 'Activity tracking' },
];

function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({});
  const [alerts, setAlerts] = useState({ anomalies: [], insights: [], budgetIssues: [], complianceIssues: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, alertsRes] = await Promise.all([
          getDashboardSummary(),
          getAlerts()
        ]);
        setSummary(summaryRes.data);
        setAlerts(alertsRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCardClick = (path) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const totalAlerts = alerts.anomalies.length + alerts.insights.length + alerts.budgetIssues.length + alerts.complianceIssues.length;

  return (
    <div>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={24} color="#3b82f6" />
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#3b82f6' }}>{summary.aiInsights || 0}</div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>AI Insights</div>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={24} color="#ef4444" />
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#ef4444' }}>{totalAlerts}</div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Active Alerts</div>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={24} color="#10b981" />
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#10b981' }}>{summary.financialStatements || 0}</div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Reports</div>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={24} color="#8b5cf6" />
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#8b5cf6' }}>{summary.complianceReports || 0}</div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Compliance</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#111827' }}>Financial Modules</h3>
      <div className="dashboard-grid">
        {featureCards.map((card) => {
          const Icon = card.icon;
          const count = summary[card.key] || 0;
          return (
            <div
              key={card.key}
              className="feature-card"
              onClick={() => handleCardClick(card.path)}
            >
              <div
                className="feature-card-icon"
                style={{ background: card.bg }}
              >
                <Icon size={24} color={card.color} />
              </div>
              <div className="feature-card-title">{card.label}</div>
              <div className="feature-card-count">{count}</div>
              <div className="feature-card-description">{card.description}</div>
            </div>
          );
        })}
      </div>

      {/* Alerts Section */}
      {totalAlerts > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#111827' }}>Active Alerts</h3>
          <div className="card">
            <div className="card-body">
              {alerts.anomalies.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444', marginBottom: '12px' }}>Anomalies Detected</h4>
                  {alerts.anomalies.map((anomaly, index) => (
                    <div key={index} style={{ padding: '12px', background: '#fef2f2', borderRadius: '8px', marginBottom: '8px' }}>
                      <div style={{ fontWeight: '500' }}>{anomaly.description}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>Severity: {anomaly.severity}</div>
                    </div>
                  ))}
                </div>
              )}
              {alerts.budgetIssues.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#f59e0b', marginBottom: '12px' }}>Budget Issues</h4>
                  {alerts.budgetIssues.map((issue, index) => (
                    <div key={index} style={{ padding: '12px', background: '#fffbeb', borderRadius: '8px', marginBottom: '8px' }}>
                      <div style={{ fontWeight: '500' }}>{issue.department} - {issue.category}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>Variance: {issue.variance_percentage ? parseFloat(issue.variance_percentage).toFixed(1) : 'N/A'}%</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
