const express=require('express');
const cors=require('cors');
const path=require('path');
require('dotenv').config({path:path.join(__dirname,'../../.env')});
const governanceRouter=require('../governance/router');
const {validateRuntime}=require('../governance/runtime');
const {createProviderGate}=require('../governance/providerGate');

validateRuntime();
const app=express();
const port=Number(process.env.BACKEND_PORT||3001);
const origins=String(process.env.CORS_ORIGINS||'http://localhost:3000').split(',').map(value=>value.trim()).filter(Boolean);
app.disable('x-powered-by');
app.use((_req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');next();});
app.use(cors({origin:(origin,callback)=>!origin||origins.includes(origin)?callback(null,true):callback(new Error('Origin not allowed by CORS')),credentials:true}));
app.use(express.json({limit:'1mb'}));
app.use(createProviderGate(['/api/ai','/api/gap','/api/generated','/api/batch','/api/export-provider']));
app.get('/api/health',(_req,res)=>res.json({status:'ok',workflow:'approved_financial_report_release',nonAdvisory:true,timestamp:new Date().toISOString()}));
app.use('/api/auth',require('../governance/identityRouter'));
app.use('/api/governance',governanceRouter);
app.use('/api/governed-ai',require('../governance/aiRouter'));
// The native record screens still use these existing routes. Require the same
// active identity used by the governed API before exposing their data.
const {authenticate}=require('../governance/identityRouter');
const recordRoutes={
  companies:'companies', 'financial-statements':'financialStatements',
  'revenue-forecasts':'revenueForecasts', 'expense-records':'expenseRecords',
  'cash-flow':'cashFlow', 'budget-actuals':'budgetActuals',
  'profit-loss':'profitLoss', 'balance-sheets':'balanceSheets',
  'kpi-metrics':'kpiMetrics', 'audit-logs':'auditLogs',
  'custom-reports':'customReports', 'ai-insights':'aiInsights',
  'anomaly-detections':'anomalyDetections', 'trend-analyses':'trendAnalyses',
  'compliance-reports':'complianceReports', 'tax-reports':'taxReports',
  dashboard:'dashboard', 'financial-ratios':'financialRatios',
  'peer-comparison':'peerComparison', 'scheduled-reports':'scheduledReports',
  'scenario-analysis':'scenarioAnalysis', 'dcf-valuation':'dcfValuation',
  'monte-carlo':'monteCarloSimulation', 'capital-budgeting':'capitalBudgeting',
  'break-even':'breakEvenAnalysis', 'working-capital':'workingCapitalOptimizer',
  'natural-language-query':'naturalLanguageQuery', 'ai-presentations':'aiPresentations',
  'ai-variance-explainer':'aiVarianceExplainer', 'ai-forecast-generator':'aiForecastGenerator',
  'ai-audit-analyzer':'aiAuditAnalyzer', 'ai-board-reports':'aiBoardReportWriter',
  'ai-responses':'aiResponses', 'ai-expense-categorizer':'aiExpenseCategorizer',
  'revenue-recognition-drift':'revenueRecognitionDrift',
};
for(const [path,name] of Object.entries(recordRoutes)) app.use(`/api/${path}`,authenticate,require(`./routes/${name}`));
app.use('/api/ai',authenticate,require('./routes/ai'));
app.use((_req,res)=>res.status(404).json({error:'ROUTE_NOT_SUPPORTED'}));
app.use((error,_req,res,_next)=>{console.error('Request failed:',error.message);res.status(500).json({error:'INTERNAL_SERVER_ERROR'});});
app.listen(port,()=>console.log(`Governed financial-report API listening on ${port}`));

module.exports=app;
