import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
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
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0f172a',
        color: 'white'
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
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
          <Route path="/profile" element={<UserProfile user={user} />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
