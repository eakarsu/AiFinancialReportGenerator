const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Process natural language query
router.post('/query', async (req, res) => {
  try {
    const { query, company_id } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const OpenAI = require('openai');
    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    // Get company context
    let companyContext = '';
    if (company_id) {
      const companyResult = await pool.query(
        'SELECT * FROM companies WHERE id = $1',
        [company_id]
      );
      if (companyResult.rows[0]) {
        companyContext = `Company: ${companyResult.rows[0].name}, Industry: ${companyResult.rows[0].industry}`;
      }
    }

    // First, understand the intent and extract SQL
    const intentResponse = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
      messages: [
        {
          role: 'system',
          content: `You are a financial data analyst assistant. Convert natural language queries into SQL queries for a PostgreSQL database.

CRITICAL: Use PostgreSQL syntax only.

**CRITICAL WARNING - READ CAREFULLY:**
NEVER use EXTRACT() on VARCHAR/TEXT columns! It will cause an error.
- EXTRACT() only works on DATE/TIMESTAMP columns
- For VARCHAR period columns like 'period', use string matching (=, LIKE)

COLUMN TYPES - MEMORIZE THIS:

DATE COLUMNS (CAN use EXTRACT):
- financial_statements.period_start, financial_statements.period_end
- expense_records.date
- cash_flow_records.date
- balance_sheets.as_of_date
- anomaly_detections.detection_date

VARCHAR COLUMNS (CANNOT use EXTRACT - use string matching):
- profit_loss_records.period → contains strings like 'Q1 2025'
- budget_actuals.period → contains strings like 'Q1 2025'
- kpi_metrics.period → contains strings like 'Q1 2025'
- revenue_forecasts.forecast_period → contains strings like 'Q1 2025'

CORRECT EXAMPLES:
- profit_loss_records query for Q2 2025: WHERE period = 'Q2 2025'
- profit_loss_records query for 2025: WHERE period LIKE '%2025%'
- expense_records query for Q2 2025: WHERE EXTRACT(QUARTER FROM date) = 2 AND EXTRACT(YEAR FROM date) = 2025

WRONG (will cause error):
- WHERE EXTRACT(QUARTER FROM period) = 2  ← WRONG! period is VARCHAR not DATE

Available tables (with column types noted for period/date columns):
- companies (id, name, industry, fiscal_year_end, currency)
- financial_statements (id, company_id, statement_type, period_start DATE, period_end DATE, total_revenue, total_expenses, net_income, status)
- balance_sheets (id, company_id, as_of_date DATE, total_assets, current_assets, fixed_assets, total_liabilities, current_liabilities, long_term_liabilities, shareholders_equity, retained_earnings)
- profit_loss_records (id, company_id, period VARCHAR like 'Q1 2025', revenue, cost_of_goods_sold, gross_profit, operating_expenses, operating_income, net_income, earnings_per_share)
- expense_records (id, company_id, category, subcategory, amount, date DATE, vendor, description, status)
- cash_flow_records (id, company_id, record_type, category, amount, date DATE, description)
- budget_actuals (id, company_id, department, category, period VARCHAR like 'Q1 2025', budgeted_amount, actual_amount, variance, variance_percentage)
- kpi_metrics (id, company_id, metric_name, metric_category, current_value, target_value, previous_value, unit, trend, period VARCHAR like 'Q1 2025')
- revenue_forecasts (id, company_id, forecast_name, forecast_period VARCHAR like 'Q1 2025', predicted_revenue, confidence_level, model_used)
- anomaly_detections (id, company_id, anomaly_type, severity, description, affected_metric, expected_value, actual_value, deviation_percentage, resolution_status)

${company_id ? `Filter by company_id = '${company_id}' when relevant.` : ''}

Respond with JSON containing:
{
  "intent": "description of what user wants",
  "sql": "the SQL query to execute",
  "visualization": "table|chart|metric|comparison",
  "chartType": "bar|line|pie|none"
}

Only use SELECT queries. Never modify data.`
        },
        {
          role: 'user',
          content: `${companyContext}\n\nQuery: ${query}`
        }
      ],
      temperature: 0.1,
    });

    const intentText = intentResponse.choices[0].message.content;
    let parsedIntent;

    try {
      const jsonMatch = intentText.match(/\{[\s\S]*\}/);
      parsedIntent = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      parsedIntent = null;
    }

    if (!parsedIntent || !parsedIntent.sql) {
      // If we can't parse SQL, provide a conversational response
      const conversationalResponse = await openai.chat.completions.create({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful financial analyst assistant. Answer questions about financial data analysis, metrics, and best practices.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.7,
      });

      return res.json({
        type: 'conversational',
        query: query,
        response: conversationalResponse.choices[0].message.content,
        data: null
      });
    }

    // Execute the SQL query
    let queryResult;
    try {
      // Add safety check - only allow SELECT
      if (!parsedIntent.sql.trim().toUpperCase().startsWith('SELECT')) {
        throw new Error('Only SELECT queries are allowed');
      }

      queryResult = await pool.query(parsedIntent.sql);
    } catch (sqlError) {
      console.error('SQL Error:', sqlError);
      return res.json({
        type: 'error',
        query: query,
        intent: parsedIntent.intent,
        error: 'Could not execute query. Please try rephrasing.',
        sql: parsedIntent.sql
      });
    }

    // Generate natural language summary of results
    const summaryResponse = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
      messages: [
        {
          role: 'system',
          content: 'You are a financial analyst. Provide a clear, concise summary of the data results. Include key insights and any notable patterns.'
        },
        {
          role: 'user',
          content: `Original question: ${query}\n\nData results:\n${JSON.stringify(queryResult.rows.slice(0, 20), null, 2)}\n\nProvide a brief summary (2-3 sentences) of these findings.`
        }
      ],
      temperature: 0.5,
    });

    res.json({
      type: 'data',
      query: query,
      intent: parsedIntent.intent,
      summary: summaryResponse.choices[0].message.content,
      visualization: parsedIntent.visualization || 'table',
      chartType: parsedIntent.chartType || 'none',
      data: queryResult.rows,
      rowCount: queryResult.rows.length,
      sql: parsedIntent.sql
    });
  } catch (error) {
    console.error('Error processing natural language query:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get suggested queries
router.get('/suggestions', async (req, res) => {
  try {
    const suggestions = [
      {
        category: 'Revenue & Profitability',
        queries: [
          'Show me total revenue by quarter',
          'What is our gross profit margin trend?',
          'Compare revenue vs expenses over time',
          'Which period had the highest net income?'
        ]
      },
      {
        category: 'Balance Sheet',
        queries: [
          'Show current assets vs current liabilities',
          'What is our debt to equity ratio?',
          'How has shareholders equity changed?',
          'Show total assets breakdown'
        ]
      },
      {
        category: 'Expenses',
        queries: [
          'What are the top 5 expense categories?',
          'Show expenses by department',
          'Which vendors have the highest spending?',
          'Are there any expense anomalies?'
        ]
      },
      {
        category: 'KPIs & Performance',
        queries: [
          'Show all KPIs with negative trends',
          'Which KPIs are below target?',
          'Display customer acquisition metrics',
          'What is our revenue per employee?'
        ]
      },
      {
        category: 'Forecasts & Trends',
        queries: [
          'Show revenue forecasts for next quarter',
          'What is the predicted growth rate?',
          'Display trend analysis for all metrics',
          'Which forecasts have high confidence?'
        ]
      },
      {
        category: 'Compliance & Risk',
        queries: [
          'Show compliance status across all regulations',
          'Are there any open anomalies?',
          'What is our overall compliance score?',
          'List high severity issues'
        ]
      }
    ];

    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save a query for quick access
router.post('/save', async (req, res) => {
  try {
    const { company_id, query_name, query_text, visualization_type } = req.body;

    const result = await pool.query(
      `INSERT INTO saved_queries (company_id, query_name, query_text, visualization_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [company_id, query_name, query_text, visualization_type || 'table']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving query:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get saved queries
router.get('/saved', async (req, res) => {
  try {
    const { company_id } = req.query;

    let query = 'SELECT * FROM saved_queries';
    const params = [];

    if (company_id) {
      query += ' WHERE company_id = $1';
      params.push(company_id);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching saved queries:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete saved query
router.delete('/saved/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM saved_queries WHERE id = $1', [id]);
    res.json({ message: 'Query deleted successfully' });
  } catch (error) {
    console.error('Error deleting saved query:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
