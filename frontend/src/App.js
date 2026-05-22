import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import PasswordReset from './pages/PasswordReset';
import Dashboard from './pages/Dashboard';
import FinancialStatements from './pages/FinancialStatements';
import RevenueForecasts from './pages/RevenueForecasts';
import ExpenseRecords from './pages/ExpenseRecords';
import CashFlow from './pages/CashFlow';
import BudgetActuals from './pages/BudgetActuals';
import ProfitLoss from './pages/ProfitLoss';
import BalanceSheets from './pages/BalanceSheets';
import KpiMetrics from './pages/KpiMetrics';
import AuditLogs from './pages/AuditLogs';
import CustomReports from './pages/CustomReports';
import AiInsights from './pages/AiInsights';
import AnomalyDetections from './pages/AnomalyDetections';
import TrendAnalyses from './pages/TrendAnalyses';
import ComplianceReports from './pages/ComplianceReports';
import TaxReports from './pages/TaxReports';
import AiChat from './pages/AiChat';
import UserProfile from './pages/UserProfile';
import GenerateReport from './pages/GenerateReport';
import FinancialRatios from './pages/FinancialRatios';
import NaturalLanguageQuery from './pages/NaturalLanguageQuery';
import PeerComparison from './pages/PeerComparison';
import ExportData from './pages/ExportData';
import ScheduledReports from './pages/ScheduledReports';
import ScenarioAnalysis from './pages/ScenarioAnalysis';
import DCFValuation from './pages/DCFValuation';
import MonteCarloSimulation from './pages/MonteCarloSimulation';
import CapitalBudgeting from './pages/CapitalBudgeting';
import BreakEvenAnalysis from './pages/BreakEvenAnalysis';
import WorkingCapitalOptimizer from './pages/WorkingCapitalOptimizer';
import AiPresentations from './pages/AiPresentations';
import AiVarianceExplainer from './pages/AiVarianceExplainer';
import AiForecastGenerator from './pages/AiForecastGenerator';
import AiAuditAnalyzer from './pages/AiAuditAnalyzer';
import AiBoardReports from './pages/AiBoardReports';
import AiResponsesHistory from './pages/AiResponsesHistory';
import AiExpenseCategorizer from './pages/AiExpenseCategorizer';
import AiAuditReadiness from './pages/AiAuditReadiness';
import AiCovenantTracking from './pages/AiCovenantTracking';
import AiSegmentAnalysis from './pages/AiSegmentAnalysis';
import AiBacklogTools from './pages/AiBacklogTools';
import RevenueRecognitionDrift from './pages/RevenueRecognitionDrift';
import './App.css';

import Batch03Features from './pages/Batch03Features';
import CustomViewsPage from './pages/CustomViewsPage';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0f172a', color: 'white',
        flexDirection: 'column', gap: '16px',
      }}>
        <div className="loading-spinner" style={{ width: '48px', height: '48px' }}></div>
        <span>Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <ToastProvider>
        <Router>
          <Routes>
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

          <Route path="/batch03" element={<Batch03Features />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register onLogin={handleLogin} />} />
            <Route path="/password-reset" element={<PasswordReset />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <ErrorBoundary>
        <Router>
          <Layout user={user} onLogout={handleLogout}>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/financial-statements" element={<FinancialStatements />} />
                <Route path="/revenue-forecasts" element={<RevenueForecasts />} />
                <Route path="/expense-records" element={<ExpenseRecords />} />
                <Route path="/cash-flow" element={<CashFlow />} />
                <Route path="/budget-actuals" element={<BudgetActuals />} />
                <Route path="/profit-loss" element={<ProfitLoss />} />
                <Route path="/balance-sheets" element={<BalanceSheets />} />
                <Route path="/kpi-metrics" element={<KpiMetrics />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
                <Route path="/custom-reports" element={<CustomReports />} />
                <Route path="/ai-insights" element={<AiInsights />} />
                <Route path="/anomaly-detections" element={<AnomalyDetections />} />
                <Route path="/trend-analyses" element={<TrendAnalyses />} />
                <Route path="/compliance-reports" element={<ComplianceReports />} />
                <Route path="/tax-reports" element={<TaxReports />} />
                <Route path="/ai-chat" element={<AiChat />} />
                <Route path="/generate-report" element={<GenerateReport />} />
                <Route path="/profile" element={<UserProfile user={user} onUpdateUser={(u) => { setUser(u); localStorage.setItem('user', JSON.stringify(u)); }} />} />
                <Route path="/financial-ratios" element={<FinancialRatios />} />
                <Route path="/natural-language-query" element={<NaturalLanguageQuery />} />
                <Route path="/peer-comparison" element={<PeerComparison />} />
                <Route path="/export-data" element={<ExportData />} />
                <Route path="/scheduled-reports" element={<ScheduledReports />} />
                <Route path="/scenario-analysis" element={<ScenarioAnalysis />} />
                <Route path="/dcf-valuation" element={<DCFValuation />} />
                <Route path="/monte-carlo" element={<MonteCarloSimulation />} />
                <Route path="/capital-budgeting" element={<CapitalBudgeting />} />
                <Route path="/break-even" element={<BreakEvenAnalysis />} />
                <Route path="/working-capital" element={<WorkingCapitalOptimizer />} />
                <Route path="/ai-presentations" element={<AiPresentations />} />
                <Route path="/ai-variance-explainer" element={<AiVarianceExplainer />} />
                <Route path="/ai-forecast-generator" element={<AiForecastGenerator />} />
                <Route path="/ai-audit-analyzer" element={<AiAuditAnalyzer />} />
                <Route path="/ai-board-reports" element={<AiBoardReports />} />
                <Route path="/ai-responses" element={<AiResponsesHistory />} />
                <Route path="/ai-expense-categorizer" element={<AiExpenseCategorizer />} />
                <Route path="/ai-audit-readiness" element={<AiAuditReadiness />} />
                <Route path="/ai-covenant-tracking" element={<AiCovenantTracking />} />
                <Route path="/ai-segment-analysis" element={<AiSegmentAnalysis />} />
                <Route path="/ai-backlog-tools" element={<AiBacklogTools />} />
                <Route path="/revenue-recognition-drift" element={<RevenueRecognitionDrift />} />
                <Route path="/custom-views" element={<CustomViewsPage />} />
                <Route path="/login" element={<Navigate to="/" replace />} />
              </Routes>
            </ErrorBoundary>
          </Layout>
        </Router>
      </ErrorBoundary>
    </ToastProvider>
  );
}

export default App;
