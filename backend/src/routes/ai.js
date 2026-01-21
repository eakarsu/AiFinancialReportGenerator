const express = require('express');
const router = express.Router();
const pool = require('../config/database');
require('dotenv').config({ path: '../../../.env' });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Helper function to call OpenRouter API
async function callOpenRouter(messages, model = OPENROUTER_MODEL, maxTokens = 2000) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Financial Report Generator'
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Analyze financial statement
router.post('/analyze-statement', async (req, res) => {
  try {
    const { statement_id } = req.body;

    const result = await pool.query(`
      SELECT fs.*, c.name as company_name
      FROM financial_statements fs
      LEFT JOIN companies c ON fs.company_id = c.id
      WHERE fs.id = $1
    `, [statement_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Financial statement not found' });
    }

    const statement = result.rows[0];

    const messages = [
      {
        role: 'system',
        content: 'You are an expert CFO and financial analyst. Provide professional, accurate, and actionable financial analysis.'
      },
      {
        role: 'user',
        content: `Analyze this financial statement for ${statement.company_name}:

Statement Type: ${statement.statement_type}
Period: ${statement.period_start} to ${statement.period_end}
Total Revenue: $${statement.total_revenue?.toLocaleString() || 'N/A'}
Total Expenses: $${statement.total_expenses?.toLocaleString() || 'N/A'}
Net Income: $${statement.net_income?.toLocaleString() || 'N/A'}

Please provide:
1. Key financial insights
2. Profitability analysis
3. Areas of concern
4. Recommendations for improvement
5. Comparison benchmarks for the industry`
      }
    ];

    const analysis = await callOpenRouter(messages);

    // Update the statement with AI summary
    await pool.query(
      'UPDATE financial_statements SET ai_summary = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [analysis, statement_id]
    );

    res.json({ analysis, statement_id });
  } catch (error) {
    console.error('Error analyzing statement:', error);
    res.status(500).json({ error: 'Failed to analyze statement' });
  }
});

// Generate revenue forecast
router.post('/generate-forecast', async (req, res) => {
  try {
    const { company_id, historical_data, forecast_period } = req.body;

    const companyResult = await pool.query('SELECT * FROM companies WHERE id = $1', [company_id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const company = companyResult.rows[0];

    const messages = [
      {
        role: 'system',
        content: 'You are an expert financial forecasting analyst. Provide accurate revenue predictions with confidence intervals and methodology explanations.'
      },
      {
        role: 'user',
        content: `Generate a revenue forecast for ${company.name} (${company.industry} industry):

Historical Revenue Data: ${JSON.stringify(historical_data)}
Forecast Period: ${forecast_period}

Please provide:
1. Predicted revenue with confidence level (as a percentage)
2. Forecasting methodology used
3. Key assumptions
4. Risk factors that could affect the forecast
5. Best and worst case scenarios

Format your response as JSON with fields: predicted_revenue, confidence_level, model_used, assumptions, analysis`
      }
    ];

    const forecastResponse = await callOpenRouter(messages);

    // Parse the response and create forecast record
    let forecastData;
    try {
      forecastData = JSON.parse(forecastResponse);
    } catch {
      forecastData = {
        predicted_revenue: 0,
        confidence_level: 75,
        model_used: 'AI Analysis',
        assumptions: forecastResponse,
        analysis: forecastResponse
      };
    }

    res.json({ forecast: forecastData, company_id });
  } catch (error) {
    console.error('Error generating forecast:', error);
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
});

// Detect anomalies
router.post('/detect-anomalies', async (req, res) => {
  try {
    const { company_id, data_type, data_points } = req.body;

    const messages = [
      {
        role: 'system',
        content: 'You are an expert fraud detection and anomaly analysis specialist. Identify unusual patterns in financial data.'
      },
      {
        role: 'user',
        content: `Analyze these ${data_type} data points for anomalies:

${JSON.stringify(data_points)}

Please identify:
1. Any anomalies or unusual patterns
2. Severity level (low, medium, high, critical)
3. Possible explanations for each anomaly
4. Recommended actions
5. Whether further investigation is needed

Format your response as JSON with fields: anomalies (array with type, severity, description, explanation, recommendation)`
      }
    ];

    const anomalyResponse = await callOpenRouter(messages);

    res.json({ anomalies: anomalyResponse, company_id, data_type });
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    res.status(500).json({ error: 'Failed to detect anomalies' });
  }
});

// Analyze tax report
router.post('/analyze-tax-report', async (req, res) => {
  try {
    const { tax_report_id } = req.body;

    const result = await pool.query(`
      SELECT tr.*, c.name as company_name
      FROM tax_reports tr
      LEFT JOIN companies c ON tr.company_id = c.id
      WHERE tr.id = $1
    `, [tax_report_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tax report not found' });
    }

    const taxReport = result.rows[0];

    const messages = [
      {
        role: 'system',
        content: 'You are an expert tax strategist and CFO advisor. Provide professional tax optimization recommendations.'
      },
      {
        role: 'user',
        content: `Analyze this tax report for ${taxReport.company_name} and provide optimization suggestions:

Tax Type: ${taxReport.tax_type}
Tax Period: ${taxReport.tax_period}
Taxable Income: $${taxReport.taxable_income?.toLocaleString() || 'N/A'}
Tax Liability: $${taxReport.tax_liability?.toLocaleString() || 'N/A'}
Deductions: $${taxReport.deductions?.toLocaleString() || 'N/A'}
Credits: $${taxReport.credits?.toLocaleString() || 'N/A'}
Effective Rate: ${taxReport.effective_rate}%
Filing Status: ${taxReport.filing_status}
Due Date: ${taxReport.due_date}

Please provide:
1. Analysis of current tax position
2. Potential deduction opportunities
3. Tax credit recommendations
4. Timing strategies
5. Estimated potential savings
6. Risk considerations`
      }
    ];

    const analysis = await callOpenRouter(messages);

    // Update the tax report with AI suggestions
    await pool.query(
      'UPDATE tax_reports SET ai_optimization_suggestions = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [analysis, tax_report_id]
    );

    res.json({ analysis, tax_report_id });
  } catch (error) {
    console.error('Error analyzing tax report:', error);
    res.status(500).json({ error: 'Failed to analyze tax report' });
  }
});

// Analyze compliance report
router.post('/analyze-compliance-report', async (req, res) => {
  try {
    const { compliance_report_id } = req.body;

    const result = await pool.query(`
      SELECT cr.*, c.name as company_name
      FROM compliance_reports cr
      LEFT JOIN companies c ON cr.company_id = c.id
      WHERE cr.id = $1
    `, [compliance_report_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance report not found' });
    }

    const complianceReport = result.rows[0];

    const messages = [
      {
        role: 'system',
        content: 'You are an expert compliance officer and regulatory analyst. Provide thorough compliance assessments and recommendations.'
      },
      {
        role: 'user',
        content: `Analyze this compliance report for ${complianceReport.company_name}:

Regulation Type: ${complianceReport.regulation_type}
Report Period: ${complianceReport.report_period}
Compliance Status: ${complianceReport.compliance_status}
Compliance Score: ${complianceReport.score}%
Due Date: ${complianceReport.due_date}
Submitted Date: ${complianceReport.submitted_date || 'Not yet submitted'}

Please provide:
1. Assessment of current compliance status
2. Identified gaps or risks
3. Specific remediation recommendations
4. Priority action items
5. Best practices for maintaining compliance
6. Upcoming regulatory considerations`
      }
    ];

    const analysis = await callOpenRouter(messages);

    // Update the compliance report with AI check
    await pool.query(
      'UPDATE compliance_reports SET ai_compliance_check = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [analysis, compliance_report_id]
    );

    res.json({ analysis, compliance_report_id });
  } catch (error) {
    console.error('Error analyzing compliance report:', error);
    res.status(500).json({ error: 'Failed to analyze compliance report' });
  }
});

// Analyze trend analysis record
router.post('/analyze-trend-record', async (req, res) => {
  try {
    const { trend_analysis_id } = req.body;

    const result = await pool.query(`
      SELECT ta.*, c.name as company_name
      FROM trend_analyses ta
      LEFT JOIN companies c ON ta.company_id = c.id
      WHERE ta.id = $1
    `, [trend_analysis_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trend analysis not found' });
    }

    const trendAnalysis = result.rows[0];

    const messages = [
      {
        role: 'system',
        content: 'You are an expert financial analyst specializing in trend analysis and forecasting. Provide insightful narrative explanations.'
      },
      {
        role: 'user',
        content: `Provide a detailed narrative analysis for this trend data for ${trendAnalysis.company_name}:

Metric: ${trendAnalysis.metric_name}
Analysis Period: ${trendAnalysis.analysis_period}
Trend Direction: ${trendAnalysis.trend_direction}
Growth Rate: ${trendAnalysis.growth_rate}%
Seasonality Detected: ${trendAnalysis.seasonality_detected ? 'Yes' : 'No'}
Next Period Forecast: $${trendAnalysis.forecast_next_period?.toLocaleString() || 'N/A'}

Please provide:
1. Executive summary of the trend
2. Key drivers behind this trend
3. Comparison to industry benchmarks
4. Implications for business strategy
5. Risks and opportunities
6. Recommendations for leadership`
      }
    ];

    const analysis = await callOpenRouter(messages);

    // Update the trend analysis with AI narrative
    await pool.query(
      'UPDATE trend_analyses SET ai_narrative = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [analysis, trend_analysis_id]
    );

    res.json({ analysis, trend_analysis_id });
  } catch (error) {
    console.error('Error analyzing trend:', error);
    res.status(500).json({ error: 'Failed to analyze trend' });
  }
});

// Analyze custom report
router.post('/analyze-custom-report', async (req, res) => {
  try {
    const { report_id } = req.body;
    const result = await pool.query(`
      SELECT cr.*, c.name as company_name
      FROM custom_reports cr
      LEFT JOIN companies c ON cr.company_id = c.id
      WHERE cr.id = $1
    `, [report_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Custom report not found' });
    }

    const report = result.rows[0];
    const messages = [
      { role: 'system', content: 'You are an expert financial report analyst. Generate comprehensive report content and insights.' },
      { role: 'user', content: `Generate AI analysis for this custom report for ${report.company_name}:

Report Name: ${report.report_name}
Report Type: ${report.report_type}
Description: ${report.description}
Schedule: ${report.schedule}

Provide: 1. Executive summary 2. Key metrics to track 3. Recommended visualizations 4. Insights based on report type 5. Action items and recommendations` }
    ];

    const analysis = await callOpenRouter(messages);
    await pool.query('UPDATE custom_reports SET ai_content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [analysis, report_id]);
    res.json({ analysis, report_id });
  } catch (error) {
    console.error('Error analyzing custom report:', error);
    res.status(500).json({ error: 'Failed to analyze custom report' });
  }
});

// Analyze expense record
router.post('/analyze-expense', async (req, res) => {
  try {
    const { expense_id } = req.body;
    const result = await pool.query(`
      SELECT er.*, c.name as company_name
      FROM expense_records er
      LEFT JOIN companies c ON er.company_id = c.id
      WHERE er.id = $1
    `, [expense_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense record not found' });
    }

    const expense = result.rows[0];
    const messages = [
      { role: 'system', content: 'You are an expert expense analyst and cost optimization specialist.' },
      { role: 'user', content: `Analyze this expense for ${expense.company_name}:

Category: ${expense.category}
Subcategory: ${expense.subcategory}
Amount: $${expense.amount?.toLocaleString() || 'N/A'}
Vendor: ${expense.vendor}
Date: ${expense.date}
Description: ${expense.description}
Status: ${expense.status}

Provide: 1. Expense categorization validation 2. Cost optimization opportunities 3. Vendor assessment 4. Budget impact analysis 5. Recommendations for approval/rejection` }
    ];

    const analysis = await callOpenRouter(messages);
    await pool.query('UPDATE expense_records SET ai_categorization = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [analysis, expense_id]);
    res.json({ analysis, expense_id });
  } catch (error) {
    console.error('Error analyzing expense:', error);
    res.status(500).json({ error: 'Failed to analyze expense' });
  }
});

// Analyze balance sheet
router.post('/analyze-balance-sheet', async (req, res) => {
  try {
    const { balance_sheet_id } = req.body;
    const result = await pool.query(`
      SELECT bs.*, c.name as company_name
      FROM balance_sheets bs
      LEFT JOIN companies c ON bs.company_id = c.id
      WHERE bs.id = $1
    `, [balance_sheet_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Balance sheet not found' });
    }

    const bs = result.rows[0];
    const messages = [
      { role: 'system', content: 'You are an expert financial analyst. Provide detailed balance sheet analysis.' },
      { role: 'user', content: `Analyze this balance sheet for ${bs.company_name}:

Total Assets: $${bs.total_assets?.toLocaleString() || 'N/A'}
Current Assets: $${bs.current_assets?.toLocaleString() || 'N/A'}
Fixed Assets: $${bs.fixed_assets?.toLocaleString() || 'N/A'}
Total Liabilities: $${bs.total_liabilities?.toLocaleString() || 'N/A'}
Shareholders Equity: $${bs.shareholders_equity?.toLocaleString() || 'N/A'}

Provide: 1. Liquidity analysis 2. Solvency assessment 3. Asset utilization 4. Financial health score 5. Recommendations` }
    ];

    const analysis = await callOpenRouter(messages);
    await pool.query('UPDATE balance_sheets SET ai_analysis = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [analysis, balance_sheet_id]);
    res.json({ analysis, balance_sheet_id });
  } catch (error) {
    console.error('Error analyzing balance sheet:', error);
    res.status(500).json({ error: 'Failed to analyze balance sheet' });
  }
});

// Analyze profit/loss
router.post('/analyze-profit-loss', async (req, res) => {
  try {
    const { profit_loss_id } = req.body;
    const result = await pool.query(`
      SELECT pl.*, c.name as company_name
      FROM profit_loss_records pl
      LEFT JOIN companies c ON pl.company_id = c.id
      WHERE pl.id = $1
    `, [profit_loss_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profit/Loss record not found' });
    }

    const pl = result.rows[0];
    const messages = [
      { role: 'system', content: 'You are an expert financial analyst. Provide detailed P&L analysis.' },
      { role: 'user', content: `Analyze this P&L for ${pl.company_name}:

Revenue: $${pl.revenue?.toLocaleString() || 'N/A'}
Cost of Goods Sold: $${pl.cost_of_goods_sold?.toLocaleString() || 'N/A'}
Gross Profit: $${pl.gross_profit?.toLocaleString() || 'N/A'}
Operating Expenses: $${pl.operating_expenses?.toLocaleString() || 'N/A'}
Net Income: $${pl.net_income?.toLocaleString() || 'N/A'}

Provide: 1. Profitability analysis 2. Margin assessment 3. Cost structure review 4. Performance insights 5. Improvement recommendations` }
    ];

    const analysis = await callOpenRouter(messages);
    await pool.query('UPDATE profit_loss_records SET ai_insights = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [analysis, profit_loss_id]);
    res.json({ analysis, profit_loss_id });
  } catch (error) {
    console.error('Error analyzing P&L:', error);
    res.status(500).json({ error: 'Failed to analyze P&L' });
  }
});

// Analyze KPI
router.post('/analyze-kpi', async (req, res) => {
  try {
    const { kpi_id } = req.body;
    const result = await pool.query(`
      SELECT k.*, c.name as company_name
      FROM kpi_metrics k
      LEFT JOIN companies c ON k.company_id = c.id
      WHERE k.id = $1
    `, [kpi_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KPI not found' });
    }

    const kpi = result.rows[0];
    const messages = [
      { role: 'system', content: 'You are an expert business analyst. Provide KPI analysis and recommendations.' },
      { role: 'user', content: `Analyze this KPI for ${kpi.company_name}:

Metric: ${kpi.metric_name}
Category: ${kpi.metric_category}
Current Value: ${kpi.current_value} ${kpi.unit}
Target Value: ${kpi.target_value} ${kpi.unit}
Previous Value: ${kpi.previous_value} ${kpi.unit}
Trend: ${kpi.trend}

Provide: 1. Performance assessment 2. Gap analysis 3. Trend interpretation 4. Actionable recommendations 5. Priority actions` }
    ];

    const analysis = await callOpenRouter(messages);
    await pool.query('UPDATE kpi_metrics SET ai_recommendation = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [analysis, kpi_id]);
    res.json({ analysis, kpi_id });
  } catch (error) {
    console.error('Error analyzing KPI:', error);
    res.status(500).json({ error: 'Failed to analyze KPI' });
  }
});

// Analyze audit log
router.post('/analyze-audit-log', async (req, res) => {
  try {
    const { audit_log_id } = req.body;
    const result = await pool.query(`
      SELECT al.*, c.name as company_name, u.name as user_name
      FROM audit_logs al
      LEFT JOIN companies c ON al.company_id = c.id
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = $1
    `, [audit_log_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    const log = result.rows[0];
    const messages = [
      { role: 'system', content: 'You are a security and compliance expert. Assess risk levels of audit events.' },
      { role: 'user', content: `Assess this audit event for ${log.company_name}:

User: ${log.user_name}
Action: ${log.action}
Entity Type: ${log.entity_type}
IP Address: ${log.ip_address}
Risk Level: ${log.risk_level}

Provide: 1. Risk assessment 2. Potential security concerns 3. Compliance implications 4. Recommended actions 5. Monitoring suggestions` }
    ];

    const analysis = await callOpenRouter(messages);
    await pool.query('UPDATE audit_logs SET ai_risk_assessment = $1 WHERE id = $2', [analysis, audit_log_id]);
    res.json({ analysis, audit_log_id });
  } catch (error) {
    console.error('Error analyzing audit log:', error);
    res.status(500).json({ error: 'Failed to analyze audit log' });
  }
});

// Analyze anomaly
router.post('/analyze-anomaly', async (req, res) => {
  try {
    const { anomaly_id } = req.body;
    const result = await pool.query(`
      SELECT ad.*, c.name as company_name
      FROM anomaly_detections ad
      LEFT JOIN companies c ON ad.company_id = c.id
      WHERE ad.id = $1
    `, [anomaly_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }

    const anomaly = result.rows[0];
    const messages = [
      { role: 'system', content: 'You are a financial anomaly detection expert. Explain anomalies and provide recommendations.' },
      { role: 'user', content: `Analyze this anomaly for ${anomaly.company_name}:

Type: ${anomaly.anomaly_type}
Severity: ${anomaly.severity}
Affected Metric: ${anomaly.affected_metric}
Expected Value: $${anomaly.expected_value?.toLocaleString() || 'N/A'}
Actual Value: $${anomaly.actual_value?.toLocaleString() || 'N/A'}
Deviation: ${anomaly.deviation_percentage}%

Provide: 1. Root cause analysis 2. Impact assessment 3. Investigation steps 4. Remediation actions 5. Prevention measures` }
    ];

    const analysis = await callOpenRouter(messages);
    await pool.query('UPDATE anomaly_detections SET ai_explanation = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [analysis, anomaly_id]);
    res.json({ analysis, anomaly_id });
  } catch (error) {
    console.error('Error analyzing anomaly:', error);
    res.status(500).json({ error: 'Failed to analyze anomaly' });
  }
});

// Analyze cash flow
router.post('/analyze-cash-flow', async (req, res) => {
  try {
    const { cash_flow_id } = req.body;
    const result = await pool.query(`
      SELECT cf.*, c.name as company_name
      FROM cash_flow_records cf
      LEFT JOIN companies c ON cf.company_id = c.id
      WHERE cf.id = $1
    `, [cash_flow_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cash flow record not found' });
    }

    const cf = result.rows[0];
    const messages = [
      { role: 'system', content: 'You are a cash flow management expert. Provide classification and analysis.' },
      { role: 'user', content: `Analyze this cash flow for ${cf.company_name}:

Type: ${cf.record_type}
Category: ${cf.category}
Amount: $${cf.amount?.toLocaleString() || 'N/A'}
Source: ${cf.source}
Description: ${cf.description}

Provide: 1. Classification validation 2. Cash flow impact 3. Liquidity implications 4. Optimization suggestions 5. Forecasting considerations` }
    ];

    const analysis = await callOpenRouter(messages);
    await pool.query('UPDATE cash_flow_records SET ai_classification = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [analysis, cash_flow_id]);
    res.json({ analysis, cash_flow_id });
  } catch (error) {
    console.error('Error analyzing cash flow:', error);
    res.status(500).json({ error: 'Failed to analyze cash flow' });
  }
});

// Analyze budget actual
router.post('/analyze-budget-actual', async (req, res) => {
  try {
    const { budget_actual_id } = req.body;
    const result = await pool.query(`
      SELECT ba.*, c.name as company_name
      FROM budget_actuals ba
      LEFT JOIN companies c ON ba.company_id = c.id
      WHERE ba.id = $1
    `, [budget_actual_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget actual not found' });
    }

    const ba = result.rows[0];
    const messages = [
      { role: 'system', content: 'You are a budget analysis expert. Explain variances and provide recommendations.' },
      { role: 'user', content: `Analyze this budget variance for ${ba.company_name}:

Department: ${ba.department}
Category: ${ba.category}
Period: ${ba.period}
Budgeted: $${ba.budgeted_amount?.toLocaleString() || 'N/A'}
Actual: $${ba.actual_amount?.toLocaleString() || 'N/A'}
Variance: $${ba.variance?.toLocaleString() || 'N/A'} (${ba.variance_percentage}%)

Provide: 1. Variance explanation 2. Root causes 3. Impact assessment 4. Corrective actions 5. Future budget recommendations` }
    ];

    const analysis = await callOpenRouter(messages);
    await pool.query('UPDATE budget_actuals SET ai_explanation = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [analysis, budget_actual_id]);
    res.json({ analysis, budget_actual_id });
  } catch (error) {
    console.error('Error analyzing budget:', error);
    res.status(500).json({ error: 'Failed to analyze budget' });
  }
});

// Analyze revenue forecast
router.post('/analyze-revenue-forecast', async (req, res) => {
  try {
    const { forecast_id } = req.body;
    const result = await pool.query(`
      SELECT rf.*, c.name as company_name
      FROM revenue_forecasts rf
      LEFT JOIN companies c ON rf.company_id = c.id
      WHERE rf.id = $1
    `, [forecast_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Revenue forecast not found' });
    }

    const rf = result.rows[0];
    const messages = [
      { role: 'system', content: 'You are a revenue forecasting expert. Analyze forecasts and provide insights.' },
      { role: 'user', content: `Analyze this revenue forecast for ${rf.company_name}:

Forecast: ${rf.forecast_name}
Period: ${rf.forecast_period}
Predicted Revenue: $${rf.predicted_revenue?.toLocaleString() || 'N/A'}
Confidence Level: ${rf.confidence_level}%
Model Used: ${rf.model_used}
Assumptions: ${rf.assumptions}

Provide: 1. Forecast validation 2. Confidence assessment 3. Risk factors 4. Scenario analysis 5. Strategic recommendations` }
    ];

    const analysis = await callOpenRouter(messages);
    await pool.query('UPDATE revenue_forecasts SET ai_analysis = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [analysis, forecast_id]);
    res.json({ analysis, forecast_id });
  } catch (error) {
    console.error('Error analyzing forecast:', error);
    res.status(500).json({ error: 'Failed to analyze forecast' });
  }
});

// Analyze trends
router.post('/analyze-trends', async (req, res) => {
  try {
    const { company_id, metric_name, data_points, period } = req.body;

    const messages = [
      {
        role: 'system',
        content: 'You are an expert in financial trend analysis and predictive analytics.'
      },
      {
        role: 'user',
        content: `Analyze the trend for ${metric_name} over ${period}:

Data Points: ${JSON.stringify(data_points)}

Please provide:
1. Overall trend direction (upward, downward, stable, volatile)
2. Growth rate calculation
3. Seasonality patterns detected
4. Forecast for next period
5. Narrative explanation of what's driving the trend

Format your response as JSON with fields: trend_direction, growth_rate, seasonality_detected, forecast_next_period, narrative`
      }
    ];

    const trendResponse = await callOpenRouter(messages);

    res.json({ trend_analysis: trendResponse, company_id, metric_name });
  } catch (error) {
    console.error('Error analyzing trends:', error);
    res.status(500).json({ error: 'Failed to analyze trends' });
  }
});

// Generate AI insights
router.post('/generate-insights', async (req, res) => {
  try {
    const { company_id } = req.body;

    // Fetch company data
    const companyResult = await pool.query('SELECT * FROM companies WHERE id = $1', [company_id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Fetch recent financial data
    const financialData = await pool.query(`
      SELECT * FROM financial_statements WHERE company_id = $1 ORDER BY period_end DESC LIMIT 5
    `, [company_id]);

    const kpiData = await pool.query(`
      SELECT * FROM kpi_metrics WHERE company_id = $1 ORDER BY created_at DESC LIMIT 20
    `, [company_id]);

    const messages = [
      {
        role: 'system',
        content: 'You are a strategic CFO advisor. Generate actionable business insights from financial data.'
      },
      {
        role: 'user',
        content: `Generate strategic insights for the company based on this data:

Financial Statements: ${JSON.stringify(financialData.rows)}
KPI Metrics: ${JSON.stringify(kpiData.rows)}

Please provide 3-5 key insights including:
1. Insight title
2. Detailed description
3. Impact level (low, medium, high, critical)
4. Confidence score (0-100)
5. Recommended actions
6. Data sources used

Format as JSON array with fields: title, description, impact_level, confidence_score, recommendations, action_items`
      }
    ];

    const insightsResponse = await callOpenRouter(messages);

    res.json({ insights: insightsResponse, company_id });
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

// Check compliance
router.post('/check-compliance', async (req, res) => {
  try {
    const { company_id, regulation_type, financial_data } = req.body;

    const messages = [
      {
        role: 'system',
        content: 'You are an expert in financial regulations and compliance. Analyze data against regulatory requirements.'
      },
      {
        role: 'user',
        content: `Check compliance for ${regulation_type} regulations:

Financial Data: ${JSON.stringify(financial_data)}

Please provide:
1. Overall compliance status (compliant, partially_compliant, non_compliant)
2. Compliance score (0-100)
3. Specific findings with severity
4. Required remediation items
5. Deadlines for action items

Format as JSON with fields: status, score, findings (array), remediation_items (array), recommendations`
      }
    ];

    const complianceResponse = await callOpenRouter(messages);

    res.json({ compliance: complianceResponse, company_id, regulation_type });
  } catch (error) {
    console.error('Error checking compliance:', error);
    res.status(500).json({ error: 'Failed to check compliance' });
  }
});

// Optimize tax strategy
router.post('/optimize-tax', async (req, res) => {
  try {
    const { company_id, tax_data } = req.body;

    const messages = [
      {
        role: 'system',
        content: 'You are an expert tax strategist. Provide legal tax optimization recommendations.'
      },
      {
        role: 'user',
        content: `Analyze and optimize tax strategy based on this data:

Tax Data: ${JSON.stringify(tax_data)}

Please provide:
1. Current effective tax rate analysis
2. Available deductions not being utilized
3. Tax credit opportunities
4. Timing strategies for expenses and income
5. Estimated potential savings
6. Risk assessment for each recommendation

Format as JSON with fields: current_analysis, deduction_opportunities, credit_opportunities, timing_strategies, estimated_savings, risk_assessment`
      }
    ];

    const taxResponse = await callOpenRouter(messages);

    res.json({ optimization: taxResponse, company_id });
  } catch (error) {
    console.error('Error optimizing tax:', error);
    res.status(500).json({ error: 'Failed to optimize tax strategy' });
  }
});

// Explain budget variance
router.post('/explain-variance', async (req, res) => {
  try {
    const { budget_actual_id } = req.body;

    const result = await pool.query(`
      SELECT ba.*, c.name as company_name
      FROM budget_actuals ba
      LEFT JOIN companies c ON ba.company_id = c.id
      WHERE ba.id = $1
    `, [budget_actual_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget actual record not found' });
    }

    const budgetActual = result.rows[0];

    const messages = [
      {
        role: 'system',
        content: 'You are an expert budget analyst. Explain budget variances clearly and suggest corrective actions.'
      },
      {
        role: 'user',
        content: `Explain this budget variance for ${budgetActual.company_name}:

Department: ${budgetActual.department}
Category: ${budgetActual.category}
Period: ${budgetActual.period}
Budgeted: $${budgetActual.budgeted_amount?.toLocaleString()}
Actual: $${budgetActual.actual_amount?.toLocaleString()}
Variance: $${budgetActual.variance?.toLocaleString()} (${budgetActual.variance_percentage?.toFixed(2)}%)

Please provide:
1. Clear explanation of why this variance occurred
2. Whether this is a favorable or unfavorable variance
3. Root cause analysis
4. Impact on overall financial performance
5. Recommended corrective actions`
      }
    ];

    const explanation = await callOpenRouter(messages);

    // Update the record with AI explanation
    await pool.query(
      'UPDATE budget_actuals SET ai_explanation = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [explanation, budget_actual_id]
    );

    res.json({ explanation, budget_actual_id });
  } catch (error) {
    console.error('Error explaining variance:', error);
    res.status(500).json({ error: 'Failed to explain variance' });
  }
});

// Generate custom report
router.post('/generate-report', async (req, res) => {
  try {
    const { company_id, report_type, parameters } = req.body;

    const companyResult = await pool.query('SELECT * FROM companies WHERE id = $1', [company_id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const company = companyResult.rows[0];

    const messages = [
      {
        role: 'system',
        content: 'You are an expert financial report writer. Generate professional, accurate financial reports.'
      },
      {
        role: 'user',
        content: `Generate a ${report_type} report for ${company.name}:

Parameters: ${JSON.stringify(parameters)}

Please generate a comprehensive report including:
1. Executive Summary
2. Key Findings
3. Detailed Analysis
4. Charts/Visualizations recommendations
5. Conclusions and Recommendations
6. Appendix with methodology

Format as a professional report that can be presented to the board of directors.`
      }
    ];

    const report = await callOpenRouter(messages);

    res.json({ report, company_id, report_type });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Chat with AI about financial data
router.post('/chat', async (req, res) => {
  try {
    const { message, context, company_id } = req.body;

    let contextData = '';
    if (company_id) {
      const companyResult = await pool.query('SELECT * FROM companies WHERE id = $1', [company_id]);
      if (companyResult.rows.length > 0) {
        contextData = `Company: ${companyResult.rows[0].name} (${companyResult.rows[0].industry})`;
      }
    }

    const messages = [
      {
        role: 'system',
        content: `You are an expert CFO assistant. Help users understand their financial data and make informed decisions.

${contextData}
${context ? `Additional Context: ${context}` : ''}`
      },
      {
        role: 'user',
        content: message
      }
    ];

    const response = await callOpenRouter(messages);

    res.json({ response, company_id });
  } catch (error) {
    console.error('Error in AI chat:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Generate comprehensive final report
router.post('/generate-final-report', async (req, res) => {
  try {
    const { company_id, report_type, period, include_ai } = req.body;

    // Get company info
    const companyResult = await pool.query('SELECT * FROM companies WHERE id = $1', [company_id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const company = companyResult.rows[0];

    // Fetch all relevant financial data
    const [financialStmts, balanceSheets, profitLoss, cashFlow, kpis, budgetActuals, forecasts, taxReports, compliance, expenses, anomalies] = await Promise.all([
      pool.query('SELECT * FROM financial_statements WHERE company_id = $1 ORDER BY period_end DESC LIMIT 8', [company_id]),
      pool.query('SELECT * FROM balance_sheets WHERE company_id = $1 ORDER BY as_of_date DESC LIMIT 8', [company_id]),
      pool.query('SELECT * FROM profit_loss_records WHERE company_id = $1 ORDER BY created_at DESC LIMIT 8', [company_id]),
      pool.query('SELECT * FROM cash_flow_records WHERE company_id = $1 ORDER BY date DESC LIMIT 20', [company_id]),
      pool.query('SELECT * FROM kpi_metrics WHERE company_id = $1 ORDER BY created_at DESC LIMIT 15', [company_id]),
      pool.query('SELECT * FROM budget_actuals WHERE company_id = $1 ORDER BY created_at DESC LIMIT 15', [company_id]),
      pool.query('SELECT * FROM revenue_forecasts WHERE company_id = $1 ORDER BY created_at DESC LIMIT 8', [company_id]),
      pool.query('SELECT * FROM tax_reports WHERE company_id = $1 ORDER BY created_at DESC LIMIT 8', [company_id]),
      pool.query('SELECT * FROM compliance_reports WHERE company_id = $1 ORDER BY created_at DESC LIMIT 8', [company_id]),
      pool.query('SELECT * FROM expense_records WHERE company_id = $1 ORDER BY date DESC LIMIT 20', [company_id]),
      pool.query('SELECT * FROM anomaly_detections WHERE company_id = $1 ORDER BY detection_date DESC LIMIT 10', [company_id])
    ]);

    // Build report title based on type
    const reportTitles = {
      comprehensive: 'Comprehensive Financial Report',
      executive: 'Executive Summary Report',
      quarterly: 'Quarterly Performance Report',
      compliance: 'Compliance Status Report',
      tax: 'Tax Summary Report',
      forecast: 'Financial Forecast Report'
    };

    // Calculate key metrics
    const latestBS = balanceSheets.rows[0] || {};
    const prevBS = balanceSheets.rows[1] || {};
    const latestPL = profitLoss.rows[0] || {};
    const prevPL = profitLoss.rows[1] || {};
    const totalRevenue = profitLoss.rows.reduce((sum, r) => sum + parseFloat(r.revenue || 0), 0);
    const totalNetIncome = profitLoss.rows.reduce((sum, r) => sum + parseFloat(r.net_income || 0), 0);
    const totalCOGS = profitLoss.rows.reduce((sum, r) => sum + parseFloat(r.cost_of_goods_sold || 0), 0);
    const totalOpEx = profitLoss.rows.reduce((sum, r) => sum + parseFloat(r.operating_expenses || 0), 0);
    const totalCashInflow = cashFlow.rows.filter(r => parseFloat(r.amount) > 0).reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const totalCashOutflow = cashFlow.rows.filter(r => parseFloat(r.amount) < 0).reduce((sum, r) => sum + Math.abs(parseFloat(r.amount)), 0);
    const totalExpenses = expenses.rows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

    // Calculate ratios
    const currentRatio = latestBS.current_assets && latestBS.current_liabilities ?
      (parseFloat(latestBS.current_assets) / parseFloat(latestBS.current_liabilities)).toFixed(2) : 'N/A';
    const debtToEquity = latestBS.total_liabilities && latestBS.shareholders_equity ?
      (parseFloat(latestBS.total_liabilities) / parseFloat(latestBS.shareholders_equity)).toFixed(2) : 'N/A';
    const profitMargin = totalRevenue > 0 ? ((totalNetIncome / totalRevenue) * 100).toFixed(2) : 0;
    const grossMargin = totalRevenue > 0 ? (((totalRevenue - totalCOGS) / totalRevenue) * 100).toFixed(2) : 0;
    const operatingMargin = totalRevenue > 0 ? (((totalRevenue - totalCOGS - totalOpEx) / totalRevenue) * 100).toFixed(2) : 0;
    const assetTurnover = latestBS.total_assets && totalRevenue ?
      (totalRevenue / parseFloat(latestBS.total_assets)).toFixed(2) : 'N/A';
    const roe = latestBS.shareholders_equity && totalNetIncome ?
      ((totalNetIncome / parseFloat(latestBS.shareholders_equity)) * 100).toFixed(2) : 'N/A';

    // Build sections based on report type
    let sections = [];

    // SECTION 1: Financial Position Overview (Balance Sheet Analysis)
    if (report_type === 'comprehensive' || report_type === 'executive') {
      const assetChange = prevBS.total_assets ?
        (((parseFloat(latestBS.total_assets || 0) - parseFloat(prevBS.total_assets)) / parseFloat(prevBS.total_assets)) * 100).toFixed(1) : 'N/A';

      sections.push({
        title: 'Balance Sheet & Financial Position',
        content: `ASSETS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Assets: $${parseFloat(latestBS.total_assets || 0).toLocaleString()} ${assetChange !== 'N/A' ? `(${assetChange > 0 ? '+' : ''}${assetChange}% vs prior period)` : ''}
  • Current Assets: $${parseFloat(latestBS.current_assets || 0).toLocaleString()}
  • Fixed Assets: $${parseFloat(latestBS.fixed_assets || 0).toLocaleString()}
  • Other Assets: $${parseFloat(latestBS.other_assets || 0).toLocaleString()}

LIABILITIES & EQUITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Liabilities: $${parseFloat(latestBS.total_liabilities || 0).toLocaleString()}
  • Current Liabilities: $${parseFloat(latestBS.current_liabilities || 0).toLocaleString()}
  • Long-term Liabilities: $${parseFloat(latestBS.long_term_liabilities || 0).toLocaleString()}
Shareholders' Equity: $${parseFloat(latestBS.shareholders_equity || 0).toLocaleString()}

KEY RATIOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Current Ratio: ${currentRatio} ${parseFloat(currentRatio) >= 2 ? '(Strong)' : parseFloat(currentRatio) >= 1 ? '(Adequate)' : '(Needs Attention)'}
• Debt-to-Equity Ratio: ${debtToEquity} ${parseFloat(debtToEquity) <= 1 ? '(Conservative)' : parseFloat(debtToEquity) <= 2 ? '(Moderate)' : '(High Leverage)'}
• Asset Turnover: ${assetTurnover}x
• Return on Equity (ROE): ${roe}%`
      });
    }

    // SECTION 2: Profitability Analysis (P&L)
    if (report_type === 'comprehensive' || report_type === 'executive' || report_type === 'quarterly') {
      const revenueChange = prevPL.revenue ?
        (((parseFloat(latestPL.revenue || 0) - parseFloat(prevPL.revenue)) / parseFloat(prevPL.revenue)) * 100).toFixed(1) : 'N/A';

      sections.push({
        title: 'Profitability Analysis',
        content: `INCOME STATEMENT SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Revenue: $${totalRevenue.toLocaleString()} ${revenueChange !== 'N/A' ? `(${revenueChange > 0 ? '+' : ''}${revenueChange}% growth)` : ''}
Cost of Goods Sold: $${totalCOGS.toLocaleString()}
Gross Profit: $${(totalRevenue - totalCOGS).toLocaleString()}
Operating Expenses: $${totalOpEx.toLocaleString()}
Operating Income: $${(totalRevenue - totalCOGS - totalOpEx).toLocaleString()}
Net Income: $${totalNetIncome.toLocaleString()}

MARGIN ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Gross Margin: ${grossMargin}% ${parseFloat(grossMargin) >= 40 ? '(Excellent)' : parseFloat(grossMargin) >= 25 ? '(Good)' : '(Below Average)'}
• Operating Margin: ${operatingMargin}% ${parseFloat(operatingMargin) >= 15 ? '(Strong)' : parseFloat(operatingMargin) >= 5 ? '(Acceptable)' : '(Needs Improvement)'}
• Net Profit Margin: ${profitMargin}% ${parseFloat(profitMargin) >= 10 ? '(Healthy)' : parseFloat(profitMargin) >= 5 ? '(Moderate)' : '(Low)'}

PERIOD-OVER-PERIOD COMPARISON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${profitLoss.rows.slice(0, 4).map((pl, idx) =>
  `Period ${idx + 1}: Revenue $${parseFloat(pl.revenue || 0).toLocaleString()} | Net Income $${parseFloat(pl.net_income || 0).toLocaleString()}`
).join('\n')}`
      });
    }

    // SECTION 3: Cash Flow Analysis
    if (report_type === 'comprehensive' || report_type === 'quarterly') {
      const operatingCF = cashFlow.rows.filter(r => r.record_type === 'operating');
      const investingCF = cashFlow.rows.filter(r => r.record_type === 'investing');
      const financingCF = cashFlow.rows.filter(r => r.record_type === 'financing');

      const opInflow = operatingCF.filter(r => parseFloat(r.amount) > 0).reduce((sum, r) => sum + parseFloat(r.amount), 0);
      const opOutflow = operatingCF.filter(r => parseFloat(r.amount) < 0).reduce((sum, r) => sum + Math.abs(parseFloat(r.amount)), 0);
      const invInflow = investingCF.filter(r => parseFloat(r.amount) > 0).reduce((sum, r) => sum + parseFloat(r.amount), 0);
      const invOutflow = investingCF.filter(r => parseFloat(r.amount) < 0).reduce((sum, r) => sum + Math.abs(parseFloat(r.amount)), 0);
      const finInflow = financingCF.filter(r => parseFloat(r.amount) > 0).reduce((sum, r) => sum + parseFloat(r.amount), 0);
      const finOutflow = financingCF.filter(r => parseFloat(r.amount) < 0).reduce((sum, r) => sum + Math.abs(parseFloat(r.amount)), 0);

      sections.push({
        title: 'Cash Flow Analysis',
        content: `CASH FLOW SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Cash Inflows: $${totalCashInflow.toLocaleString()}
Total Cash Outflows: $${totalCashOutflow.toLocaleString()}
Net Cash Flow: $${(totalCashInflow - totalCashOutflow).toLocaleString()} ${(totalCashInflow - totalCashOutflow) >= 0 ? '(Positive)' : '(Negative)'}

CASH FLOW BY ACTIVITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Operating Activities (${operatingCF.length} transactions)
  • Inflows: $${opInflow.toLocaleString()}
  • Outflows: $${opOutflow.toLocaleString()}
  • Net: $${(opInflow - opOutflow).toLocaleString()}

Investing Activities (${investingCF.length} transactions)
  • Inflows: $${invInflow.toLocaleString()}
  • Outflows: $${invOutflow.toLocaleString()}
  • Net: $${(invInflow - invOutflow).toLocaleString()}

Financing Activities (${financingCF.length} transactions)
  • Inflows: $${finInflow.toLocaleString()}
  • Outflows: $${finOutflow.toLocaleString()}
  • Net: $${(finInflow - finOutflow).toLocaleString()}

CASH FLOW HEALTH: ${(opInflow - opOutflow) > 0 ? 'Operating cash flow is positive - business is self-sustaining' : 'Operating cash flow is negative - requires attention'}`
      });
    }

    // SECTION 4: Key Performance Indicators
    if (report_type === 'comprehensive' || report_type === 'executive') {
      const kpisByCategory = {};
      kpis.rows.forEach(k => {
        if (!kpisByCategory[k.metric_category]) kpisByCategory[k.metric_category] = [];
        kpisByCategory[k.metric_category].push(k);
      });

      let kpiContent = `KPI DASHBOARD\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

      Object.keys(kpisByCategory).forEach(category => {
        kpiContent += `\n${category.toUpperCase()}\n`;
        kpisByCategory[category].forEach(k => {
          const achievement = k.target_value ? ((parseFloat(k.current_value) / parseFloat(k.target_value)) * 100).toFixed(0) : 'N/A';
          const trendIcon = k.trend === 'up' ? '↑' : k.trend === 'down' ? '↓' : '→';
          const status = parseFloat(achievement) >= 100 ? '✓ On Target' : parseFloat(achievement) >= 80 ? '⚠ Near Target' : '✗ Below Target';
          kpiContent += `  • ${k.metric_name}: ${k.current_value} ${k.unit} ${trendIcon}\n`;
          kpiContent += `    Target: ${k.target_value} ${k.unit} | Achievement: ${achievement}% | ${status}\n`;
        });
      });

      if (kpis.rows.length === 0) {
        kpiContent += '\nNo KPI data available for this period.';
      }

      sections.push({
        title: 'Key Performance Indicators',
        content: kpiContent
      });
    }

    // SECTION 5: Budget Performance
    if (report_type === 'comprehensive' || report_type === 'quarterly') {
      const favorableVariances = budgetActuals.rows.filter(b => parseFloat(b.variance || 0) > 0);
      const unfavorableVariances = budgetActuals.rows.filter(b => parseFloat(b.variance || 0) < 0);
      const totalBudgeted = budgetActuals.rows.reduce((sum, b) => sum + parseFloat(b.budgeted_amount || 0), 0);
      const totalActual = budgetActuals.rows.reduce((sum, b) => sum + parseFloat(b.actual_amount || 0), 0);

      sections.push({
        title: 'Budget vs Actual Performance',
        content: `BUDGET SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Budgeted: $${totalBudgeted.toLocaleString()}
Total Actual: $${totalActual.toLocaleString()}
Overall Variance: $${(totalActual - totalBudgeted).toLocaleString()} (${((totalActual - totalBudgeted) / totalBudgeted * 100).toFixed(1)}%)

FAVORABLE VARIANCES (${favorableVariances.length})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${favorableVariances.slice(0, 5).map(b =>
  `• ${b.department} - ${b.category}: +$${Math.abs(parseFloat(b.variance || 0)).toLocaleString()} (+${Math.abs(parseFloat(b.variance_percentage || 0)).toFixed(1)}%)`
).join('\n') || 'None'}

UNFAVORABLE VARIANCES (${unfavorableVariances.length})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${unfavorableVariances.slice(0, 5).map(b =>
  `• ${b.department} - ${b.category}: -$${Math.abs(parseFloat(b.variance || 0)).toLocaleString()} (${parseFloat(b.variance_percentage || 0).toFixed(1)}%)`
).join('\n') || 'None'}

DEPARTMENT BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${budgetActuals.rows.slice(0, 8).map(b =>
  `${b.department.padEnd(15)} | Budget: $${parseFloat(b.budgeted_amount || 0).toLocaleString().padEnd(12)} | Actual: $${parseFloat(b.actual_amount || 0).toLocaleString().padEnd(12)} | ${b.status}`
).join('\n') || 'No budget data available.'}`
      });
    }

    // SECTION 6: Expense Analysis
    if (report_type === 'comprehensive') {
      const expensesByCategory = {};
      expenses.rows.forEach(e => {
        if (!expensesByCategory[e.category]) expensesByCategory[e.category] = 0;
        expensesByCategory[e.category] += parseFloat(e.amount || 0);
      });

      sections.push({
        title: 'Expense Analysis',
        content: `EXPENSE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Expenses Analyzed: $${totalExpenses.toLocaleString()}
Number of Expense Records: ${expenses.rows.length}

EXPENSES BY CATEGORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${Object.entries(expensesByCategory)
  .sort((a, b) => b[1] - a[1])
  .map(([cat, amt]) => `• ${cat}: $${amt.toLocaleString()} (${((amt / totalExpenses) * 100).toFixed(1)}%)`)
  .join('\n') || 'No expense data available.'}

TOP VENDORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${[...new Set(expenses.rows.map(e => e.vendor))].slice(0, 5).map(v => {
  const vendorTotal = expenses.rows.filter(e => e.vendor === v).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  return `• ${v}: $${vendorTotal.toLocaleString()}`;
}).join('\n') || 'No vendor data available.'}`
      });
    }

    // SECTION 7: Compliance Status
    if (report_type === 'comprehensive' || report_type === 'compliance') {
      const compliant = compliance.rows.filter(c => c.compliance_status === 'compliant');
      const nonCompliant = compliance.rows.filter(c => c.compliance_status !== 'compliant');
      const avgScore = compliance.rows.length > 0 ?
        (compliance.rows.reduce((sum, c) => sum + parseFloat(c.score || 0), 0) / compliance.rows.length).toFixed(0) : 'N/A';

      sections.push({
        title: 'Regulatory Compliance Status',
        content: `COMPLIANCE OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Compliance Score: ${avgScore}%
Compliant Items: ${compliant.length}
Non-Compliant Items: ${nonCompliant.length}
Total Regulations Tracked: ${compliance.rows.length}

COMPLIANCE BY REGULATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${compliance.rows.map(c => {
  const statusIcon = c.compliance_status === 'compliant' ? '✓' : c.compliance_status === 'partial' ? '⚠' : '✗';
  return `${statusIcon} ${c.regulation_type}
   Status: ${c.compliance_status.toUpperCase()} | Score: ${c.score}%
   Period: ${c.report_period} | Due: ${c.due_date ? new Date(c.due_date).toLocaleDateString() : 'N/A'}`;
}).join('\n\n') || 'No compliance data available.'}

${nonCompliant.length > 0 ? `\nATTENTION REQUIRED\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${nonCompliant.map(c => `• ${c.regulation_type}: Requires immediate attention`).join('\n')}` : ''}`
      });
    }

    // SECTION 8: Tax Obligations
    if (report_type === 'comprehensive' || report_type === 'tax') {
      const totalTaxLiability = taxReports.rows.reduce((sum, t) => sum + parseFloat(t.tax_liability || 0), 0);
      const totalDeductions = taxReports.rows.reduce((sum, t) => sum + parseFloat(t.deductions || 0), 0);
      const totalCredits = taxReports.rows.reduce((sum, t) => sum + parseFloat(t.credits || 0), 0);

      sections.push({
        title: 'Tax Obligations & Planning',
        content: `TAX SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Tax Liability: $${totalTaxLiability.toLocaleString()}
Total Deductions Claimed: $${totalDeductions.toLocaleString()}
Total Credits Applied: $${totalCredits.toLocaleString()}
Average Effective Rate: ${taxReports.rows.length > 0 ? (taxReports.rows.reduce((sum, t) => sum + parseFloat(t.effective_rate || 0), 0) / taxReports.rows.length).toFixed(2) : 'N/A'}%

TAX REPORTS BY TYPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${taxReports.rows.map(t => {
  const statusIcon = t.filing_status === 'filed' ? '✓' : t.filing_status === 'pending' ? '⏳' : '⚠';
  return `${statusIcon} ${t.tax_type} - ${t.tax_period}
   Taxable Income: $${parseFloat(t.taxable_income || 0).toLocaleString()}
   Tax Liability: $${parseFloat(t.tax_liability || 0).toLocaleString()}
   Effective Rate: ${t.effective_rate}%
   Filing Status: ${t.filing_status?.toUpperCase()}
   Due Date: ${t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A'}`;
}).join('\n\n') || 'No tax data available.'}`
      });
    }

    // SECTION 9: Revenue Forecasts
    if (report_type === 'comprehensive' || report_type === 'forecast') {
      sections.push({
        title: 'Revenue Forecasts & Projections',
        content: `FORECAST SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${forecasts.rows.map(f => {
  const confidenceLevel = parseFloat(f.confidence_level) >= 80 ? 'High' : parseFloat(f.confidence_level) >= 60 ? 'Medium' : 'Low';
  return `📊 ${f.forecast_name}
   Period: ${f.forecast_period}
   Predicted Revenue: $${parseFloat(f.predicted_revenue || 0).toLocaleString()}
   Confidence Level: ${f.confidence_level}% (${confidenceLevel})
   Model Used: ${f.model_used || 'Standard'}

   Assumptions:
   ${f.assumptions || 'Standard market conditions assumed'}`;
}).join('\n\n') || 'No forecast data available.'}

FORECAST TREND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${forecasts.rows.length >= 2 ?
  `Projected Growth: ${(((parseFloat(forecasts.rows[0].predicted_revenue || 0) - parseFloat(forecasts.rows[1].predicted_revenue || 0)) / parseFloat(forecasts.rows[1].predicted_revenue || 1)) * 100).toFixed(1)}%`
  : 'Insufficient data for trend analysis'}`
      });
    }

    // SECTION 10: Anomaly & Risk Detection
    if (report_type === 'comprehensive') {
      const criticalAnomalies = anomalies.rows.filter(a => a.severity === 'critical' || a.severity === 'high');

      sections.push({
        title: 'Anomaly Detection & Risk Alerts',
        content: `ANOMALY SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Anomalies Detected: ${anomalies.rows.length}
Critical/High Severity: ${criticalAnomalies.length}
Status: ${criticalAnomalies.length > 0 ? '⚠ REQUIRES ATTENTION' : '✓ No Critical Issues'}

DETECTED ANOMALIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${anomalies.rows.slice(0, 8).map(a => {
  const severityIcon = a.severity === 'critical' ? '🔴' : a.severity === 'high' ? '🟠' : a.severity === 'medium' ? '🟡' : '🟢';
  return `${severityIcon} ${a.anomaly_type} (${a.severity?.toUpperCase()})
   Metric: ${a.affected_metric}
   Expected: $${parseFloat(a.expected_value || 0).toLocaleString()}
   Actual: $${parseFloat(a.actual_value || 0).toLocaleString()}
   Deviation: ${a.deviation_percentage}%
   Status: ${a.resolution_status || 'open'}`;
}).join('\n\n') || 'No anomalies detected - all metrics within expected ranges.'}`
      });
    }

    // Generate AI insights if requested
    let aiInsights = null;
    if (include_ai) {
      const comprehensiveData = {
        company: company.name,
        industry: company.industry,
        period: period,
        assets: parseFloat(latestBS.total_assets || 0),
        liabilities: parseFloat(latestBS.total_liabilities || 0),
        equity: parseFloat(latestBS.shareholders_equity || 0),
        revenue: totalRevenue,
        netIncome: totalNetIncome,
        grossMargin: grossMargin,
        operatingMargin: operatingMargin,
        profitMargin: profitMargin,
        currentRatio: currentRatio,
        debtToEquity: debtToEquity,
        roe: roe,
        cashInflows: totalCashInflow,
        cashOutflows: totalCashOutflow,
        netCashFlow: totalCashInflow - totalCashOutflow,
        kpiCount: kpis.rows.length,
        kpisOnTarget: kpis.rows.filter(k => parseFloat(k.current_value) >= parseFloat(k.target_value)).length,
        complianceScore: compliance.rows.length > 0 ? (compliance.rows.reduce((sum, c) => sum + parseFloat(c.score || 0), 0) / compliance.rows.length).toFixed(0) : 'N/A',
        criticalAnomalies: anomalies.rows.filter(a => a.severity === 'critical' || a.severity === 'high').length
      };

      const aiMessages = [
        {
          role: 'system',
          content: `You are an expert CFO, financial analyst, and strategic advisor. Generate a comprehensive, detailed, professional financial analysis report.
Your analysis should be thorough, insightful, and actionable. Use specific numbers from the data provided.
Format your response with clear sections using headers. Be specific and avoid generic statements.
This report will be presented to the board of directors and executive leadership.`
        },
        {
          role: 'user',
          content: `Generate a comprehensive AI-powered analysis for ${company.name} (${company.industry}) for ${period}.

FINANCIAL DATA SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Balance Sheet:
• Total Assets: $${comprehensiveData.assets.toLocaleString()}
• Total Liabilities: $${comprehensiveData.liabilities.toLocaleString()}
• Shareholders' Equity: $${comprehensiveData.equity.toLocaleString()}

Profitability:
• Total Revenue: $${comprehensiveData.revenue.toLocaleString()}
• Net Income: $${comprehensiveData.netIncome.toLocaleString()}
• Gross Margin: ${comprehensiveData.grossMargin}%
• Operating Margin: ${comprehensiveData.operatingMargin}%
• Net Profit Margin: ${comprehensiveData.profitMargin}%

Financial Ratios:
• Current Ratio: ${comprehensiveData.currentRatio}
• Debt-to-Equity: ${comprehensiveData.debtToEquity}
• Return on Equity: ${comprehensiveData.roe}%

Cash Flow:
• Total Inflows: $${comprehensiveData.cashInflows.toLocaleString()}
• Total Outflows: $${comprehensiveData.cashOutflows.toLocaleString()}
• Net Cash Flow: $${comprehensiveData.netCashFlow.toLocaleString()}

Performance Metrics:
• KPIs Tracked: ${comprehensiveData.kpiCount}
• KPIs On Target: ${comprehensiveData.kpisOnTarget}
• Compliance Score: ${comprehensiveData.complianceScore}%
• Critical Anomalies: ${comprehensiveData.criticalAnomalies}

Please provide a detailed analysis including:

**1. EXECUTIVE SUMMARY** (3-4 paragraphs)
- Overall financial health assessment
- Key achievements this period
- Major challenges identified
- Strategic outlook

**2. FINANCIAL HEALTH SCORECARD**
- Liquidity Assessment (with score 1-10)
- Profitability Assessment (with score 1-10)
- Efficiency Assessment (with score 1-10)
- Leverage Assessment (with score 1-10)
- Overall Financial Health Grade (A-F)

**3. KEY STRENGTHS** (5 specific points with data)

**4. AREAS OF CONCERN** (5 specific points with data)

**5. STRATEGIC RECOMMENDATIONS** (7 detailed, actionable items)
Each should include:
- The recommendation
- Expected impact
- Priority level (High/Medium/Low)
- Timeline for implementation

**6. RISK ASSESSMENT**
- Top 5 financial risks identified
- Probability and impact assessment
- Mitigation strategies

**7. COMPETITIVE POSITIONING**
- Industry comparison insights
- Market position analysis
- Competitive advantages/disadvantages

**8. 90-DAY ACTION PLAN**
- Immediate priorities (Week 1-2)
- Short-term goals (Month 1)
- Medium-term objectives (Month 2-3)

**9. FINANCIAL OUTLOOK**
- Revenue projection insights
- Profitability trajectory
- Cash flow expectations
- Key assumptions and risks

**10. CONCLUSION**
- Summary of key findings
- Critical success factors
- Final recommendations

Be specific, use the actual numbers provided, and make the analysis actionable for executive decision-making.`
        }
      ];

      aiInsights = await callOpenRouter(aiMessages, OPENROUTER_MODEL, 10000);
    }

    // Generate comprehensive executive summary
    const healthScore = (
      (parseFloat(currentRatio) >= 1.5 ? 25 : parseFloat(currentRatio) >= 1 ? 15 : 5) +
      (parseFloat(profitMargin) >= 10 ? 25 : parseFloat(profitMargin) >= 5 ? 15 : 5) +
      (parseFloat(debtToEquity) <= 1 ? 25 : parseFloat(debtToEquity) <= 2 ? 15 : 5) +
      ((totalCashInflow - totalCashOutflow) > 0 ? 25 : 10)
    );
    const healthGrade = healthScore >= 90 ? 'A' : healthScore >= 75 ? 'B' : healthScore >= 60 ? 'C' : healthScore >= 40 ? 'D' : 'F';

    const executiveSummary = `FINANCIAL REPORT OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This ${reportTitles[report_type] || 'Financial Report'} presents a comprehensive analysis of ${company.name}'s financial performance for ${period}. The report covers all major financial dimensions including balance sheet health, profitability metrics, cash flow analysis, operational KPIs, compliance status, and forward-looking projections.

FINANCIAL HEALTH SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Health Grade: ${healthGrade} (Score: ${healthScore}/100)

The company maintains total assets of $${parseFloat(latestBS.total_assets || 0).toLocaleString()} against total liabilities of $${parseFloat(latestBS.total_liabilities || 0).toLocaleString()}, resulting in shareholders' equity of $${parseFloat(latestBS.shareholders_equity || 0).toLocaleString()}. The current ratio of ${currentRatio} indicates ${parseFloat(currentRatio) >= 2 ? 'strong' : parseFloat(currentRatio) >= 1 ? 'adequate' : 'concerning'} short-term liquidity.

Revenue for the analyzed period totaled $${totalRevenue.toLocaleString()}, generating net income of $${totalNetIncome.toLocaleString()} for a net profit margin of ${profitMargin}%. ${parseFloat(profitMargin) >= 10 ? 'Profitability remains healthy and competitive.' : parseFloat(profitMargin) >= 5 ? 'Profitability is moderate with room for improvement.' : 'Profitability requires immediate attention and cost optimization.'}

Cash flow analysis reveals total inflows of $${totalCashInflow.toLocaleString()} against outflows of $${totalCashOutflow.toLocaleString()}, resulting in net cash ${(totalCashInflow - totalCashOutflow) >= 0 ? 'generation' : 'usage'} of $${Math.abs(totalCashInflow - totalCashOutflow).toLocaleString()}. ${(totalCashInflow - totalCashOutflow) >= 0 ? 'The positive cash flow supports ongoing operations and growth initiatives.' : 'Negative cash flow warrants review of working capital management.'}

KEY METRICS AT A GLANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Gross Margin: ${grossMargin}%
• Operating Margin: ${operatingMargin}%
• Net Profit Margin: ${profitMargin}%
• Current Ratio: ${currentRatio}
• Debt-to-Equity: ${debtToEquity}
• Return on Equity: ${roe}%
• KPIs On Target: ${kpis.rows.filter(k => parseFloat(k.current_value) >= parseFloat(k.target_value)).length}/${kpis.rows.length}
• Compliance Score: ${compliance.rows.length > 0 ? (compliance.rows.reduce((sum, c) => sum + parseFloat(c.score || 0), 0) / compliance.rows.length).toFixed(0) : 'N/A'}%`;

    const report = {
      title: `${reportTitles[report_type] || 'Financial Report'} - ${period}`,
      company_name: company.name,
      company_id: company_id,
      period: period,
      report_type: report_type,
      generated_at: new Date().toISOString(),
      executive_summary: executiveSummary,
      sections: sections,
      ai_insights: aiInsights
    };

    res.json(report);
  } catch (error) {
    console.error('Error generating final report:', error);
    res.status(500).json({ error: 'Failed to generate final report' });
  }
});

module.exports = router;
