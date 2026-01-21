const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get dashboard summary
router.get('/summary', async (req, res) => {
  try {
    const { company_id } = req.query;
    const params = company_id ? [company_id] : [];
    const whereClause = company_id ? 'WHERE company_id = $1' : '';

    // Get counts for all features
    const [
      companies,
      financialStatements,
      revenueForecasts,
      expenseRecords,
      cashFlowRecords,
      budgetActuals,
      profitLossRecords,
      balanceSheets,
      kpiMetrics,
      aiInsights,
      anomalyDetections,
      customReports,
      complianceReports,
      taxReports,
      trendAnalyses,
      auditLogs
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM companies'),
      pool.query(`SELECT COUNT(*) FROM financial_statements ${whereClause}`, params),
      pool.query(`SELECT COUNT(*) FROM revenue_forecasts ${whereClause}`, params),
      pool.query(`SELECT COUNT(*) FROM expense_records ${whereClause}`, params),
      pool.query(`SELECT COUNT(*) FROM cash_flow_records ${whereClause}`, params),
      pool.query(`SELECT COUNT(*) FROM budget_actuals ${whereClause}`, params),
      pool.query(`SELECT COUNT(*) FROM profit_loss_records ${whereClause}`, params),
      pool.query(`SELECT COUNT(*) FROM balance_sheets ${whereClause}`, params),
      pool.query(`SELECT COUNT(*) FROM kpi_metrics ${whereClause}`, params),
      pool.query(`SELECT COUNT(*) FROM ai_insights ${whereClause}`, params),
      pool.query(`SELECT COUNT(*) FROM anomaly_detections ${whereClause}`, params),
      pool.query(`SELECT COUNT(*) FROM custom_reports ${whereClause}`, params),
      pool.query(`SELECT COUNT(*) FROM compliance_reports ${whereClause}`, params),
      pool.query(`SELECT COUNT(*) FROM tax_reports ${whereClause}`, params),
      pool.query(`SELECT COUNT(*) FROM trend_analyses ${whereClause}`, params),
      pool.query(`SELECT COUNT(*) FROM audit_logs ${whereClause}`, params)
    ]);

    res.json({
      companies: parseInt(companies.rows[0].count),
      financialStatements: parseInt(financialStatements.rows[0].count),
      revenueForecasts: parseInt(revenueForecasts.rows[0].count),
      expenseRecords: parseInt(expenseRecords.rows[0].count),
      cashFlowRecords: parseInt(cashFlowRecords.rows[0].count),
      budgetActuals: parseInt(budgetActuals.rows[0].count),
      profitLossRecords: parseInt(profitLossRecords.rows[0].count),
      balanceSheets: parseInt(balanceSheets.rows[0].count),
      kpiMetrics: parseInt(kpiMetrics.rows[0].count),
      aiInsights: parseInt(aiInsights.rows[0].count),
      anomalyDetections: parseInt(anomalyDetections.rows[0].count),
      customReports: parseInt(customReports.rows[0].count),
      complianceReports: parseInt(complianceReports.rows[0].count),
      taxReports: parseInt(taxReports.rows[0].count),
      trendAnalyses: parseInt(trendAnalyses.rows[0].count),
      auditLogs: parseInt(auditLogs.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

// Get recent activity
router.get('/recent-activity', async (req, res) => {
  try {
    const { company_id, limit = 20 } = req.query;
    const params = company_id ? [company_id, limit] : [limit];
    const whereClause = company_id ? 'WHERE al.company_id = $1' : '';
    const limitParam = company_id ? '$2' : '$1';

    const result = await pool.query(`
      SELECT al.*, c.name as company_name, u.name as user_name
      FROM audit_logs al
      LEFT JOIN companies c ON al.company_id = c.id
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ${limitParam}
    `, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

// Get financial overview
router.get('/financial-overview', async (req, res) => {
  try {
    const { company_id } = req.query;
    const params = company_id ? [company_id] : [];
    const whereClause = company_id ? 'WHERE company_id = $1' : '';

    // Get latest financial metrics
    const [latestPL, latestBS, recentExpenses, recentCashFlow] = await Promise.all([
      pool.query(`
        SELECT * FROM profit_loss_records ${whereClause}
        ORDER BY created_at DESC LIMIT 1
      `, params),
      pool.query(`
        SELECT * FROM balance_sheets ${whereClause}
        ORDER BY as_of_date DESC LIMIT 1
      `, params),
      pool.query(`
        SELECT SUM(amount) as total, category
        FROM expense_records ${whereClause ? whereClause + ' AND' : 'WHERE'} date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY category
        ORDER BY total DESC LIMIT 5
      `, params),
      pool.query(`
        SELECT record_type, SUM(amount) as total
        FROM cash_flow_records ${whereClause ? whereClause + ' AND' : 'WHERE'} date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY record_type
      `, params)
    ]);

    res.json({
      profitLoss: latestPL.rows[0] || null,
      balanceSheet: latestBS.rows[0] || null,
      topExpenses: recentExpenses.rows,
      cashFlowSummary: recentCashFlow.rows
    });
  } catch (error) {
    console.error('Error fetching financial overview:', error);
    res.status(500).json({ error: 'Failed to fetch financial overview' });
  }
});

// Get alerts and notifications
router.get('/alerts', async (req, res) => {
  try {
    const { company_id } = req.query;
    const params = company_id ? [company_id] : [];
    const whereClause = company_id ? 'WHERE company_id = $1' : '';

    const [anomalies, insights, budgetIssues, complianceIssues] = await Promise.all([
      pool.query(`
        SELECT * FROM anomaly_detections
        ${whereClause ? whereClause + ' AND' : 'WHERE'} resolution_status = 'open'
        ORDER BY severity DESC, detection_date DESC LIMIT 5
      `, params),
      pool.query(`
        SELECT * FROM ai_insights
        ${whereClause ? whereClause + ' AND' : 'WHERE'} status = 'new'
        ORDER BY impact_level DESC, created_at DESC LIMIT 5
      `, params),
      pool.query(`
        SELECT * FROM budget_actuals
        ${whereClause ? whereClause + ' AND' : 'WHERE'} status IN ('over_budget', 'at_risk')
        ORDER BY variance_percentage DESC LIMIT 5
      `, params),
      pool.query(`
        SELECT * FROM compliance_reports
        ${whereClause ? whereClause + ' AND' : 'WHERE'} compliance_status != 'compliant'
        ORDER BY due_date ASC LIMIT 5
      `, params)
    ]);

    res.json({
      anomalies: anomalies.rows,
      insights: insights.rows,
      budgetIssues: budgetIssues.rows,
      complianceIssues: complianceIssues.rows
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get KPI dashboard
router.get('/kpi-dashboard', async (req, res) => {
  try {
    const { company_id } = req.query;
    const params = company_id ? [company_id] : [];
    const whereClause = company_id ? 'WHERE company_id = $1' : '';

    const result = await pool.query(`
      SELECT DISTINCT ON (metric_name) *
      FROM kpi_metrics
      ${whereClause}
      ORDER BY metric_name, created_at DESC
    `, params);

    const kpisByCategory = result.rows.reduce((acc, kpi) => {
      if (!acc[kpi.metric_category]) {
        acc[kpi.metric_category] = [];
      }
      acc[kpi.metric_category].push(kpi);
      return acc;
    }, {});

    res.json(kpisByCategory);
  } catch (error) {
    console.error('Error fetching KPI dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch KPI dashboard' });
  }
});

module.exports = router;
