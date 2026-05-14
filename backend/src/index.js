const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
// Robust dotenv loading: try several known locations regardless of cwd
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config(); // fallback to cwd .env

const app = express();
const PORT = process.env.PORT || 5001;

// --- Security middleware ---
app.use(helmet({ contentSecurityPolicy: false }));

// CORS allowlist driven by env (comma-separated). Default = http://localhost:3000.
const corsAllowlist = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // server-to-server / curl
      if (corsAllowlist.includes('*') || corsAllowlist.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '5mb' }));

// Auth + rate limiter middleware
const { authMiddleware } = require('./middleware/auth');
const { aiRateLimiter } = require('./middleware/rateLimiter');

// --- AI rate limiting (20/hr per user) on AI-heavy paths ---
const AI_PATHS = [
  '/api/ai',
  '/api/ai-board-reports/generate',
  '/api/ai-variance-explainer',
  '/api/ai-forecast-generator',
  '/api/ai-audit-analyzer',
  '/api/ai-expense-categorizer',
  '/api/ai-presentations',
  '/api/ai-insights',
  '/api/natural-language',
  '/api/dcf-valuation/analyze',
  '/api/scenario-analysis/ai-analyze',
  '/api/working-capital/ai-recommendations',
];
AI_PATHS.forEach((p) => app.use(p, authMiddleware, aiRateLimiter));

// --- Auth-guarded list of mounted routers ---
// Public mounts: only /api/auth and /api/health.
// All other API routers require a valid Bearer token via authMiddleware.

// New route modules
const boardReportPdfRoutes = require('./routes/boardReportPdf');
const scheduledScansRoutes = require('./routes/scheduledScans');

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
const aiPresentationsRoutes = require('./routes/aiPresentations');
const aiVarianceExplainerRoutes = require('./routes/aiVarianceExplainer');
const aiForecastGeneratorRoutes = require('./routes/aiForecastGenerator');
const aiAuditAnalyzerRoutes = require('./routes/aiAuditAnalyzer');
const aiBoardReportWriterRoutes = require('./routes/aiBoardReportWriter');
const aiResponsesRoutes = require('./routes/aiResponses');
const aiExpenseCategorizerRoutes = require('./routes/aiExpenseCategorizer');
const authRoutes = require('./routes/auth');

// Public routes
app.use('/api/auth', authRoutes);

// Health check endpoint (public)
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// All API routes below require auth.
const protect = authMiddleware;

app.use('/api/companies', protect, companiesRoutes);
app.use('/api/financial-statements', protect, financialStatementsRoutes);
app.use('/api/revenue-forecasts', protect, revenueForecastsRoutes);
app.use('/api/expense-records', protect, expenseRecordsRoutes);
app.use('/api/cash-flow', protect, cashFlowRoutes);
app.use('/api/budget-actuals', protect, budgetActualsRoutes);
app.use('/api/profit-loss', protect, profitLossRoutes);
app.use('/api/balance-sheets', protect, balanceSheetsRoutes);
app.use('/api/kpi-metrics', protect, kpiMetricsRoutes);
app.use('/api/audit-logs', protect, auditLogsRoutes);
app.use('/api/custom-reports', protect, customReportsRoutes);
app.use('/api/ai-insights', protect, aiInsightsRoutes);
app.use('/api/anomaly-detections', protect, anomalyDetectionsRoutes);
app.use('/api/trend-analyses', protect, trendAnalysesRoutes);
app.use('/api/compliance-reports', protect, complianceReportsRoutes);
app.use('/api/tax-reports', protect, taxReportsRoutes);
app.use('/api/ai', protect, aiRoutes);
app.use('/api/dashboard', protect, dashboardRoutes);
app.use('/api/financial-ratios', protect, financialRatiosRoutes);
app.use('/api/export', protect, exportRoutes);
app.use('/api/scheduled-reports', protect, scheduledReportsRoutes);
app.use('/api/natural-language', naturalLanguageQueryRoutes); // already wraps auth+rateLimiter inside
app.use('/api/peer-comparison', protect, peerComparisonRoutes);
app.use('/api/scenario-analysis', protect, scenarioAnalysisRoutes);
app.use('/api/dcf-valuation', protect, dcfValuationRoutes);
app.use('/api/monte-carlo', protect, monteCarloRoutes);
app.use('/api/capital-budgeting', protect, capitalBudgetingRoutes);
app.use('/api/break-even', protect, breakEvenRoutes);
app.use('/api/working-capital', protect, workingCapitalRoutes);
app.use('/api/ai-presentations', protect, aiPresentationsRoutes);
app.use('/api/ai-variance-explainer', protect, aiVarianceExplainerRoutes);
app.use('/api/ai-forecast-generator', protect, aiForecastGeneratorRoutes);
app.use('/api/ai-audit-analyzer', protect, aiAuditAnalyzerRoutes);
app.use('/api/ai-board-reports', protect, aiBoardReportWriterRoutes);
app.use('/api/board-report', protect, boardReportPdfRoutes);
app.use('/api/ai-responses', protect, aiResponsesRoutes);
app.use('/api/ai-expense-categorizer', protect, aiExpenseCategorizerRoutes);
app.use('/api/anomalies', scheduledScansRoutes); // routes apply authMiddleware per-handler
app.use('/api/agentic-cfo', protect, require('./routes/agenticCFO'));
app.use('/api/realtime-financial-dash', protect, require('./routes/realtimeFinancialDash'));
app.use('/api/predictive-cash-flow', protect, require('./routes/predictiveCashFlow'));
app.use('/api/audit-support', protect, require('./routes/auditSupport'));
app.use('/api/fpa', protect, require('./routes/fpaModule'));
app.use('/api/consolidation', protect, require('./routes/consolidation'));
app.use('/api/esg-integration', protect, require('./routes/esgIntegration'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Init ai_results table at startup (best-effort)
require('./utils/aiResultsStore').ensureTable().catch((e) => {
  console.warn('ai_results init failed:', e.message);
});

// Start in-process scheduler for scheduled scans + reports
require('./services/scheduler').startScheduler();


// === Batch 03 Gaps & Frontend Mounts ===
try {
  const _batch03 = require('../routes/batch03Gaps');
  if (typeof authenticateToken === 'function') app.use('/api', authenticateToken, _batch03);
  else app.use('/api', _batch03);
} catch (_e) { /* batch03 gap routes optional */ }

app.listen(PORT, () => {
  console.log(`AI Financial Report Generator API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS allowlist: ${corsAllowlist.join(', ')}`);
});

module.exports = app;
