import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dashboard
export const getDashboardSummary = () => api.get('/dashboard/summary');
export const getRecentActivity = () => api.get('/dashboard/recent-activity');
export const getFinancialOverview = () => api.get('/dashboard/financial-overview');
export const getAlerts = () => api.get('/dashboard/alerts');
export const getKpiDashboard = () => api.get('/dashboard/kpi-dashboard');

// Companies
export const getCompanies = () => api.get('/companies');
export const getCompany = (id) => api.get(`/companies/${id}`);
export const createCompany = (data) => api.post('/companies', data);
export const updateCompany = (id, data) => api.put(`/companies/${id}`, data);
export const deleteCompany = (id) => api.delete(`/companies/${id}`);

// Financial Statements
export const getFinancialStatements = (params) => api.get('/financial-statements', { params });
export const getFinancialStatement = (id) => api.get(`/financial-statements/${id}`);
export const createFinancialStatement = (data) => api.post('/financial-statements', data);
export const updateFinancialStatement = (id, data) => api.put(`/financial-statements/${id}`, data);
export const deleteFinancialStatement = (id) => api.delete(`/financial-statements/${id}`);

// Revenue Forecasts
export const getRevenueForecasts = (params) => api.get('/revenue-forecasts', { params });
export const getRevenueForecast = (id) => api.get(`/revenue-forecasts/${id}`);
export const createRevenueForecast = (data) => api.post('/revenue-forecasts', data);
export const updateRevenueForecast = (id, data) => api.put(`/revenue-forecasts/${id}`, data);
export const deleteRevenueForecast = (id) => api.delete(`/revenue-forecasts/${id}`);

// Expense Records
export const getExpenseRecords = (params) => api.get('/expense-records', { params });
export const getExpenseRecord = (id) => api.get(`/expense-records/${id}`);
export const createExpenseRecord = (data) => api.post('/expense-records', data);
export const updateExpenseRecord = (id, data) => api.put(`/expense-records/${id}`, data);
export const deleteExpenseRecord = (id) => api.delete(`/expense-records/${id}`);

// Cash Flow
export const getCashFlowRecords = (params) => api.get('/cash-flow', { params });
export const getCashFlowRecord = (id) => api.get(`/cash-flow/${id}`);
export const createCashFlowRecord = (data) => api.post('/cash-flow', data);
export const updateCashFlowRecord = (id, data) => api.put(`/cash-flow/${id}`, data);
export const deleteCashFlowRecord = (id) => api.delete(`/cash-flow/${id}`);

// Budget Actuals
export const getBudgetActuals = (params) => api.get('/budget-actuals', { params });
export const getBudgetActual = (id) => api.get(`/budget-actuals/${id}`);
export const createBudgetActual = (data) => api.post('/budget-actuals', data);
export const updateBudgetActual = (id, data) => api.put(`/budget-actuals/${id}`, data);
export const deleteBudgetActual = (id) => api.delete(`/budget-actuals/${id}`);

// Profit & Loss
export const getProfitLossRecords = (params) => api.get('/profit-loss', { params });
export const getProfitLossRecord = (id) => api.get(`/profit-loss/${id}`);
export const createProfitLossRecord = (data) => api.post('/profit-loss', data);
export const updateProfitLossRecord = (id, data) => api.put(`/profit-loss/${id}`, data);
export const deleteProfitLossRecord = (id) => api.delete(`/profit-loss/${id}`);

// Balance Sheets
export const getBalanceSheets = (params) => api.get('/balance-sheets', { params });
export const getBalanceSheet = (id) => api.get(`/balance-sheets/${id}`);
export const createBalanceSheet = (data) => api.post('/balance-sheets', data);
export const updateBalanceSheet = (id, data) => api.put(`/balance-sheets/${id}`, data);
export const deleteBalanceSheet = (id) => api.delete(`/balance-sheets/${id}`);

// KPI Metrics
export const getKpiMetrics = (params) => api.get('/kpi-metrics', { params });
export const getKpiMetric = (id) => api.get(`/kpi-metrics/${id}`);
export const createKpiMetric = (data) => api.post('/kpi-metrics', data);
export const updateKpiMetric = (id, data) => api.put(`/kpi-metrics/${id}`, data);
export const deleteKpiMetric = (id) => api.delete(`/kpi-metrics/${id}`);

// Audit Logs
export const getAuditLogs = (params) => api.get('/audit-logs', { params });
export const getAuditLog = (id) => api.get(`/audit-logs/${id}`);
export const createAuditLog = (data) => api.post('/audit-logs', data);

// Custom Reports
export const getCustomReports = (params) => api.get('/custom-reports', { params });
export const getCustomReport = (id) => api.get(`/custom-reports/${id}`);
export const createCustomReport = (data) => api.post('/custom-reports', data);
export const updateCustomReport = (id, data) => api.put(`/custom-reports/${id}`, data);
export const deleteCustomReport = (id) => api.delete(`/custom-reports/${id}`);

// AI Insights
export const getAiInsights = (params) => api.get('/ai-insights', { params });
export const getAiInsight = (id) => api.get(`/ai-insights/${id}`);
export const createAiInsight = (data) => api.post('/ai-insights', data);
export const updateAiInsight = (id, data) => api.put(`/ai-insights/${id}`, data);
export const deleteAiInsight = (id) => api.delete(`/ai-insights/${id}`);

// Anomaly Detections
export const getAnomalyDetections = (params) => api.get('/anomaly-detections', { params });
export const getAnomalyDetection = (id) => api.get(`/anomaly-detections/${id}`);
export const createAnomalyDetection = (data) => api.post('/anomaly-detections', data);
export const updateAnomalyDetection = (id, data) => api.put(`/anomaly-detections/${id}`, data);
export const deleteAnomalyDetection = (id) => api.delete(`/anomaly-detections/${id}`);

// Trend Analyses
export const getTrendAnalyses = (params) => api.get('/trend-analyses', { params });
export const getTrendAnalysis = (id) => api.get(`/trend-analyses/${id}`);
export const createTrendAnalysis = (data) => api.post('/trend-analyses', data);
export const updateTrendAnalysis = (id, data) => api.put(`/trend-analyses/${id}`, data);
export const deleteTrendAnalysis = (id) => api.delete(`/trend-analyses/${id}`);

// Compliance Reports
export const getComplianceReports = (params) => api.get('/compliance-reports', { params });
export const getComplianceReport = (id) => api.get(`/compliance-reports/${id}`);
export const createComplianceReport = (data) => api.post('/compliance-reports', data);
export const updateComplianceReport = (id, data) => api.put(`/compliance-reports/${id}`, data);
export const deleteComplianceReport = (id) => api.delete(`/compliance-reports/${id}`);

// Tax Reports
export const getTaxReports = (params) => api.get('/tax-reports', { params });
export const getTaxReport = (id) => api.get(`/tax-reports/${id}`);
export const createTaxReport = (data) => api.post('/tax-reports', data);
export const updateTaxReport = (id, data) => api.put(`/tax-reports/${id}`, data);
export const deleteTaxReport = (id) => api.delete(`/tax-reports/${id}`);

// AI Features
export const analyzeStatement = (statementId) => api.post('/ai/analyze-statement', { statement_id: statementId });
export const analyzeTaxReport = (taxReportId) => api.post('/ai/analyze-tax-report', { tax_report_id: taxReportId });
export const analyzeComplianceReport = (complianceReportId) => api.post('/ai/analyze-compliance-report', { compliance_report_id: complianceReportId });
export const analyzeTrendRecord = (trendAnalysisId) => api.post('/ai/analyze-trend-record', { trend_analysis_id: trendAnalysisId });
export const analyzeCustomReport = (reportId) => api.post('/ai/analyze-custom-report', { report_id: reportId });
export const analyzeExpense = (expenseId) => api.post('/ai/analyze-expense', { expense_id: expenseId });
export const analyzeBalanceSheet = (balanceSheetId) => api.post('/ai/analyze-balance-sheet', { balance_sheet_id: balanceSheetId });
export const analyzeProfitLoss = (profitLossId) => api.post('/ai/analyze-profit-loss', { profit_loss_id: profitLossId });
export const analyzeKpi = (kpiId) => api.post('/ai/analyze-kpi', { kpi_id: kpiId });
export const analyzeAuditLog = (auditLogId) => api.post('/ai/analyze-audit-log', { audit_log_id: auditLogId });
export const analyzeAnomaly = (anomalyId) => api.post('/ai/analyze-anomaly', { anomaly_id: anomalyId });
export const analyzeCashFlow = (cashFlowId) => api.post('/ai/analyze-cash-flow', { cash_flow_id: cashFlowId });
export const analyzeBudgetActual = (budgetActualId) => api.post('/ai/analyze-budget-actual', { budget_actual_id: budgetActualId });
export const analyzeRevenueForecast = (forecastId) => api.post('/ai/analyze-revenue-forecast', { forecast_id: forecastId });
export const generateForecast = (data) => api.post('/ai/generate-forecast', data);
export const detectAnomalies = (data) => api.post('/ai/detect-anomalies', data);
export const analyzeTrends = (data) => api.post('/ai/analyze-trends', data);
export const generateInsights = (companyId) => api.post('/ai/generate-insights', { company_id: companyId });
export const checkCompliance = (data) => api.post('/ai/check-compliance', data);
export const optimizeTax = (data) => api.post('/ai/optimize-tax', data);
export const explainVariance = (budgetActualId) => api.post('/ai/explain-variance', { budget_actual_id: budgetActualId });
export const generateReport = (data) => api.post('/ai/generate-report', data);
export const generateFinalReport = (data) => api.post('/ai/generate-final-report', data);
export const chatWithAi = (message, context, companyId) => api.post('/ai/chat', { message, context, company_id: companyId });

// Financial Ratios
export const getFinancialRatios = (companyId) => api.get(`/financial-ratios/calculate/${companyId}`);
export const getRatioBenchmarks = (industry) => api.get(`/financial-ratios/benchmarks/${industry}`);
export const analyzeFinancialRatios = (companyId, ratios) => api.post('/financial-ratios/analyze', { companyId, ratios });

// Export
export const exportFinancialStatements = (companyId, format) => api.get(`/export/financial-statements/${companyId}`, { params: { format }, responseType: 'blob' });
export const exportBalanceSheets = (companyId, format) => api.get(`/export/balance-sheets/${companyId}`, { params: { format }, responseType: 'blob' });
export const exportProfitLoss = (companyId, format) => api.get(`/export/profit-loss/${companyId}`, { params: { format }, responseType: 'blob' });
export const exportComprehensiveReport = (companyId) => api.get(`/export/comprehensive-report/${companyId}`, { responseType: 'blob' });
export const exportAllData = (companyId) => api.get(`/export/all-data/${companyId}`, { responseType: 'blob' });

// Scheduled Reports
export const getScheduledReports = (params) => api.get('/scheduled-reports', { params });
export const getScheduledReport = (id) => api.get(`/scheduled-reports/${id}`);
export const createScheduledReport = (data) => api.post('/scheduled-reports', data);
export const updateScheduledReport = (id, data) => api.put(`/scheduled-reports/${id}`, data);
export const deleteScheduledReport = (id) => api.delete(`/scheduled-reports/${id}`);
export const runScheduledReport = (id) => api.post(`/scheduled-reports/${id}/run`);
export const getReportExecutionHistory = (id) => api.get(`/scheduled-reports/${id}/history`);

// Natural Language Query
export const executeNaturalLanguageQuery = (data) => api.post('/natural-language/query', data);
export const getQuerySuggestions = () => api.get('/natural-language/suggestions');
export const saveQuery = (data) => api.post('/natural-language/save', data);
export const getSavedQueries = (params) => api.get('/natural-language/saved', { params });
export const deleteSavedQuery = (id) => api.delete(`/natural-language/saved/${id}`);

// Peer Comparison
export const getPeerComparison = (companyIds) => api.get('/peer-comparison/compare', { params: { company_ids: companyIds } });
export const analyzePeerComparison = (companyIds) => api.post('/peer-comparison/analyze', { company_ids: companyIds });
export const getIndustryBenchmarks = (industry) => api.get('/peer-comparison/benchmarks', { params: { industry } });
export const getPeerCompanies = (params) => api.get('/peer-comparison/companies', { params });

// Scenario Analysis (What-If)
export const getScenarios = (params) => api.get('/scenario-analysis', { params });
export const getScenarioAnalyses = (params) => api.get('/scenario-analysis', { params });
export const getScenario = (id) => api.get(`/scenario-analysis/${id}`);
export const runScenarioAnalysis = (data) => api.post('/scenario-analysis/analyze', data);
export const compareScenarios = (data) => api.post('/scenario-analysis/compare', data);
export const analyzeScenario = (data) => api.post('/scenario-analysis/ai-analyze', data);
export const createScenario = (data) => api.post('/scenario-analysis', data);
export const deleteScenario = (id) => api.delete(`/scenario-analysis/${id}`);

// DCF Valuation
export const getDCFValuations = (params) => api.get('/dcf-valuation', { params });
export const getDCFValuation = (id) => api.get(`/dcf-valuation/${id}`);
export const calculateDCF = (data) => api.post('/dcf-valuation/calculate', data);
export const analyzeDCF = (data) => api.post('/dcf-valuation/analyze', data);
export const createDCFValuation = (data) => api.post('/dcf-valuation', data);
export const deleteDCFValuation = (id) => api.delete(`/dcf-valuation/${id}`);

// Monte Carlo Simulation
export const getMonteCarloSimulations = (params) => api.get('/monte-carlo', { params });
export const getMonteCarloSimulation = (id) => api.get(`/monte-carlo/${id}`);
export const runMonteCarloSimulation = (data) => api.post('/monte-carlo/run', data);
export const analyzeMonteCarloSimulation = (data) => api.post('/monte-carlo/analyze', data);
export const createMonteCarloSimulation = (data) => api.post('/monte-carlo', data);
export const deleteMonteCarloSimulation = (id) => api.delete(`/monte-carlo/${id}`);

// Capital Budgeting
export const getCapitalProjects = (params) => api.get('/capital-budgeting', { params });
export const getCapitalProject = (id) => api.get(`/capital-budgeting/${id}`);
export const calculateCapitalProject = (data) => api.post('/capital-budgeting/calculate', data);
export const compareCapitalProjects = (data) => api.post('/capital-budgeting/compare', data);
export const runSensitivityAnalysis = (data) => api.post('/capital-budgeting/sensitivity', data);
export const analyzeCapitalProject = (data) => api.post('/capital-budgeting/analyze', data);
export const createCapitalProject = (data) => api.post('/capital-budgeting', data);
export const deleteCapitalProject = (id) => api.delete(`/capital-budgeting/${id}`);

// Break-Even Analysis
export const getBreakEvenAnalyses = (params) => api.get('/break-even', { params });
export const getBreakEvenAnalysis = (id) => api.get(`/break-even/${id}`);
export const calculateBreakEven = (data) => api.post('/break-even/calculate', data);
export const breakEvenWhatIf = (data) => api.post('/break-even/what-if', data);
export const calculateTargetProfit = (data) => api.post('/break-even/target-profit', data);
export const analyzeBreakEven = (data) => api.post('/break-even/analyze', data);
export const createBreakEvenAnalysis = (data) => api.post('/break-even', data);
export const deleteBreakEvenAnalysis = (id) => api.delete(`/break-even/${id}`);

// Working Capital Optimizer
export const getWorkingCapitalAnalyses = (params) => api.get('/working-capital', { params });
export const getWorkingCapitalAnalysis = (id) => api.get(`/working-capital/${id}`);
export const analyzeWorkingCapital = (data) => api.post('/working-capital/analyze', data);
export const forecastCashFlow = (data) => api.post('/working-capital/forecast-cash', data);
export const getWorkingCapitalBenchmarks = (industry) => api.get(`/working-capital/benchmarks/${industry}`);
export const getWorkingCapitalRecommendations = (data) => api.post('/working-capital/ai-recommendations', data);
export const createWorkingCapitalAnalysis = (data) => api.post('/working-capital', data);
export const deleteWorkingCapitalAnalysis = (id) => api.delete(`/working-capital/${id}`);

export default api;
