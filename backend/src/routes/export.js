const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Helper function to safely format numbers
function safeFormatNumber(value, decimals = 0) {
  if (value === null || value === undefined || value === '') return 'N/A';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'N/A';
  return decimals > 0 ? num.toFixed(decimals) : num.toLocaleString();
}

function safeFormatMillions(value, decimals = 1) {
  if (value === null || value === undefined || value === '') return 'N/A';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'N/A';
  return (num / 1000000).toFixed(decimals);
}

// Export financial statements to CSV format
router.get('/financial-statements/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { format } = req.query; // csv or json

    const result = await pool.query(
      `SELECT fs.*, c.name as company_name
       FROM financial_statements fs
       LEFT JOIN companies c ON fs.company_id = c.id
       WHERE fs.company_id = $1
       ORDER BY fs.period_end DESC`,
      [companyId]
    );

    if (format === 'csv') {
      const headers = ['Period Start', 'Period End', 'Type', 'Revenue', 'Expenses', 'Net Income', 'Status'];
      const rows = result.rows.map(row => [
        row.period_start,
        row.period_end,
        row.statement_type,
        row.total_revenue,
        row.total_expenses,
        row.net_income,
        row.status
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=financial-statements.csv');
      res.send(csv);
    } else {
      res.json(result.rows);
    }
  } catch (error) {
    console.error('Error exporting financial statements:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export balance sheets
router.get('/balance-sheets/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { format } = req.query;

    const result = await pool.query(
      `SELECT bs.*, c.name as company_name
       FROM balance_sheets bs
       LEFT JOIN companies c ON bs.company_id = c.id
       WHERE bs.company_id = $1
       ORDER BY bs.as_of_date DESC`,
      [companyId]
    );

    if (format === 'csv') {
      const headers = ['As Of Date', 'Total Assets', 'Current Assets', 'Fixed Assets', 'Total Liabilities', 'Current Liabilities', 'Long-term Liabilities', 'Shareholders Equity', 'Retained Earnings', 'AI Health Score'];
      const rows = result.rows.map(row => [
        row.as_of_date,
        row.total_assets,
        row.current_assets,
        row.fixed_assets,
        row.total_liabilities,
        row.current_liabilities,
        row.long_term_liabilities,
        row.shareholders_equity,
        row.retained_earnings,
        row.ai_health_score
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=balance-sheets.csv');
      res.send(csv);
    } else {
      res.json(result.rows);
    }
  } catch (error) {
    console.error('Error exporting balance sheets:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export profit & loss
router.get('/profit-loss/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { format } = req.query;

    const result = await pool.query(
      `SELECT pl.*, c.name as company_name
       FROM profit_loss_records pl
       LEFT JOIN companies c ON pl.company_id = c.id
       WHERE pl.company_id = $1
       ORDER BY pl.created_at DESC`,
      [companyId]
    );

    if (format === 'csv') {
      const headers = ['Period', 'Revenue', 'COGS', 'Gross Profit', 'Operating Expenses', 'Operating Income', 'Net Income', 'EPS'];
      const rows = result.rows.map(row => [
        row.period,
        row.revenue,
        row.cost_of_goods_sold,
        row.gross_profit,
        row.operating_expenses,
        row.operating_income,
        row.net_income,
        row.earnings_per_share
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=profit-loss.csv');
      res.send(csv);
    } else {
      res.json(result.rows);
    }
  } catch (error) {
    console.error('Error exporting profit & loss:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export comprehensive report (HTML format for PDF conversion)
router.get('/comprehensive-report/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    // Gather all data
    const [company, balanceSheets, profitLoss, kpis, insights] = await Promise.all([
      pool.query('SELECT * FROM companies WHERE id = $1', [companyId]),
      pool.query('SELECT * FROM balance_sheets WHERE company_id = $1 ORDER BY as_of_date DESC LIMIT 4', [companyId]),
      pool.query('SELECT * FROM profit_loss_records WHERE company_id = $1 ORDER BY created_at DESC LIMIT 4', [companyId]),
      pool.query('SELECT * FROM kpi_metrics WHERE company_id = $1 ORDER BY created_at DESC LIMIT 10', [companyId]),
      pool.query('SELECT * FROM ai_insights WHERE company_id = $1 ORDER BY created_at DESC LIMIT 5', [companyId]),
    ]);

    const companyData = company.rows[0] || {};
    const generatedAt = new Date().toISOString();

    const reportHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Financial Report - ${companyData.name || 'Company'}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #1e40af; color: white; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .summary-box { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .metric { display: inline-block; margin: 10px 20px; }
    .metric-value { font-size: 24px; font-weight: bold; color: #1e40af; }
    .metric-label { font-size: 12px; color: #64748b; }
    .insight { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 10px 0; }
    .footer { margin-top: 40px; text-align: center; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <h1>📊 Financial Report</h1>
  <p><strong>Company:</strong> ${companyData.name || 'N/A'}</p>
  <p><strong>Industry:</strong> ${companyData.industry || 'N/A'}</p>
  <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>

  <div class="summary-box">
    <h3>Executive Summary</h3>
    ${balanceSheets.rows[0] ? `
    <div class="metric">
      <div class="metric-value">$${safeFormatMillions(balanceSheets.rows[0].total_assets)}M</div>
      <div class="metric-label">Total Assets</div>
    </div>
    <div class="metric">
      <div class="metric-value">$${safeFormatMillions(balanceSheets.rows[0].shareholders_equity)}M</div>
      <div class="metric-label">Shareholders Equity</div>
    </div>
    ` : '<p>No balance sheet data available</p>'}
    ${profitLoss.rows[0] ? `
    <div class="metric">
      <div class="metric-value">$${safeFormatMillions(profitLoss.rows[0].revenue)}M</div>
      <div class="metric-label">Revenue</div>
    </div>
    <div class="metric">
      <div class="metric-value">$${safeFormatMillions(profitLoss.rows[0].net_income)}M</div>
      <div class="metric-label">Net Income</div>
    </div>
    ` : ''}
  </div>

  <h2>Balance Sheet</h2>
  <table>
    <tr>
      <th>As Of Date</th>
      <th>Total Assets</th>
      <th>Total Liabilities</th>
      <th>Shareholders Equity</th>
      <th>Health Score</th>
    </tr>
    ${balanceSheets.rows.map(bs => `
    <tr>
      <td>${bs.as_of_date}</td>
      <td>$${safeFormatNumber(bs.total_assets)}</td>
      <td>$${safeFormatNumber(bs.total_liabilities)}</td>
      <td>$${safeFormatNumber(bs.shareholders_equity)}</td>
      <td>${bs.ai_health_score || 'N/A'}</td>
    </tr>
    `).join('')}
  </table>

  <h2>Profit & Loss</h2>
  <table>
    <tr>
      <th>Period</th>
      <th>Revenue</th>
      <th>Gross Profit</th>
      <th>Operating Income</th>
      <th>Net Income</th>
    </tr>
    ${profitLoss.rows.map(pl => `
    <tr>
      <td>${pl.period}</td>
      <td>$${safeFormatNumber(pl.revenue)}</td>
      <td>$${safeFormatNumber(pl.gross_profit)}</td>
      <td>$${safeFormatNumber(pl.operating_income)}</td>
      <td>$${safeFormatNumber(pl.net_income)}</td>
    </tr>
    `).join('')}
  </table>

  <h2>Key Performance Indicators</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Category</th>
      <th>Current Value</th>
      <th>Target</th>
      <th>Trend</th>
    </tr>
    ${kpis.rows.map(kpi => `
    <tr>
      <td>${kpi.metric_name}</td>
      <td>${kpi.metric_category}</td>
      <td>${kpi.current_value} ${kpi.unit || ''}</td>
      <td>${kpi.target_value || 'N/A'} ${kpi.unit || ''}</td>
      <td>${kpi.trend || 'N/A'}</td>
    </tr>
    `).join('')}
  </table>

  ${insights.rows.length > 0 ? `
  <h2>AI Insights</h2>
  ${insights.rows.map(insight => `
  <div class="insight">
    <strong>${insight.title}</strong>
    <p>${insight.description}</p>
    <small>Impact: ${insight.impact_level} | Confidence: ${insight.confidence_score}%</small>
  </div>
  `).join('')}
  ` : ''}

  <div class="footer">
    <p>Generated by FinanceAI Enterprise Reports</p>
    <p>${generatedAt}</p>
  </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename=financial-report.html');
    res.send(reportHtml);
  } catch (error) {
    console.error('Error generating comprehensive report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export all data as JSON (for backup/transfer)
router.get('/all-data/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    const [
      company,
      financialStatements,
      balanceSheets,
      profitLoss,
      cashFlow,
      budgetActuals,
      expenses,
      kpis,
      forecasts,
      insights,
      anomalies,
      trends,
      compliance,
      taxes
    ] = await Promise.all([
      pool.query('SELECT * FROM companies WHERE id = $1', [companyId]),
      pool.query('SELECT * FROM financial_statements WHERE company_id = $1', [companyId]),
      pool.query('SELECT * FROM balance_sheets WHERE company_id = $1', [companyId]),
      pool.query('SELECT * FROM profit_loss_records WHERE company_id = $1', [companyId]),
      pool.query('SELECT * FROM cash_flow_records WHERE company_id = $1', [companyId]),
      pool.query('SELECT * FROM budget_actuals WHERE company_id = $1', [companyId]),
      pool.query('SELECT * FROM expense_records WHERE company_id = $1', [companyId]),
      pool.query('SELECT * FROM kpi_metrics WHERE company_id = $1', [companyId]),
      pool.query('SELECT * FROM revenue_forecasts WHERE company_id = $1', [companyId]),
      pool.query('SELECT * FROM ai_insights WHERE company_id = $1', [companyId]),
      pool.query('SELECT * FROM anomaly_detections WHERE company_id = $1', [companyId]),
      pool.query('SELECT * FROM trend_analyses WHERE company_id = $1', [companyId]),
      pool.query('SELECT * FROM compliance_reports WHERE company_id = $1', [companyId]),
      pool.query('SELECT * FROM tax_reports WHERE company_id = $1', [companyId]),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      company: company.rows[0],
      financialStatements: financialStatements.rows,
      balanceSheets: balanceSheets.rows,
      profitLoss: profitLoss.rows,
      cashFlow: cashFlow.rows,
      budgetActuals: budgetActuals.rows,
      expenses: expenses.rows,
      kpis: kpis.rows,
      forecasts: forecasts.rows,
      insights: insights.rows,
      anomalies: anomalies.rows,
      trends: trends.rows,
      compliance: compliance.rows,
      taxes: taxes.rows,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=company-data-export.json');
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting all data:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
