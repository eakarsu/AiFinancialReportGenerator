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
