const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../../.env' });

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Import routes
const companiesRoutes = require('./routes/companies');
const financialStatementsRoutes = require('./routes/financialStatements');
const revenueForecastsRoutes = require('./routes/revenueForecasts');
const expenseRecordsRoutes = require('./routes/expenseRecords');
const cashFlowRoutes = require('./routes/cashFlow');
const budgetActualsRoutes = require('./routes/budgetActuals');
const profitLossRoutes = require('./routes/profitLoss');
const balanceSheetsRoutes = require('./routes/balanceSheets');
const kpiMetricsRoutes = require('./routes/kpiMetrics');
const auditLogsRoutes = require('./routes/auditLogs');
const customReportsRoutes = require('./routes/customReports');
const aiInsightsRoutes = require('./routes/aiInsights');
const anomalyDetectionsRoutes = require('./routes/anomalyDetections');
const trendAnalysesRoutes = require('./routes/trendAnalyses');
const complianceReportsRoutes = require('./routes/complianceReports');
const taxReportsRoutes = require('./routes/taxReports');
const aiRoutes = require('./routes/ai');
const dashboardRoutes = require('./routes/dashboard');
const financialRatiosRoutes = require('./routes/financialRatios');
const exportRoutes = require('./routes/export');
const scheduledReportsRoutes = require('./routes/scheduledReports');
const naturalLanguageQueryRoutes = require('./routes/naturalLanguageQuery');
const peerComparisonRoutes = require('./routes/peerComparison');
const scenarioAnalysisRoutes = require('./routes/scenarioAnalysis');
const dcfValuationRoutes = require('./routes/dcfValuation');
const monteCarloRoutes = require('./routes/monteCarloSimulation');
const capitalBudgetingRoutes = require('./routes/capitalBudgeting');
const breakEvenRoutes = require('./routes/breakEvenAnalysis');
const workingCapitalRoutes = require('./routes/workingCapitalOptimizer');

// API Routes
app.use('/api/companies', companiesRoutes);
app.use('/api/financial-statements', financialStatementsRoutes);
app.use('/api/revenue-forecasts', revenueForecastsRoutes);
app.use('/api/expense-records', expenseRecordsRoutes);
app.use('/api/cash-flow', cashFlowRoutes);
app.use('/api/budget-actuals', budgetActualsRoutes);
app.use('/api/profit-loss', profitLossRoutes);
app.use('/api/balance-sheets', balanceSheetsRoutes);
app.use('/api/kpi-metrics', kpiMetricsRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/custom-reports', customReportsRoutes);
app.use('/api/ai-insights', aiInsightsRoutes);
app.use('/api/anomaly-detections', anomalyDetectionsRoutes);
app.use('/api/trend-analyses', trendAnalysesRoutes);
app.use('/api/compliance-reports', complianceReportsRoutes);
app.use('/api/tax-reports', taxReportsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/financial-ratios', financialRatiosRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/scheduled-reports', scheduledReportsRoutes);
app.use('/api/natural-language', naturalLanguageQueryRoutes);
app.use('/api/peer-comparison', peerComparisonRoutes);
app.use('/api/scenario-analysis', scenarioAnalysisRoutes);
app.use('/api/dcf-valuation', dcfValuationRoutes);
app.use('/api/monte-carlo', monteCarloRoutes);
app.use('/api/capital-budgeting', capitalBudgetingRoutes);
app.use('/api/break-even', breakEvenRoutes);
app.use('/api/working-capital', workingCapitalRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`AI Financial Report Generator API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
