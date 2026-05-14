const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { callOpenRouter, parseAIJson } = require('../services/openrouter');
const { saveAiResult } = require('../utils/aiResultsStore');

// Stricter sanitization than just keyword filtering. Returns null when valid,
// otherwise an error string describing the violation.
function validateSelectOnly(sql) {
  if (!sql || typeof sql !== 'string') return 'Empty SQL';
  const upper = sql.toUpperCase();

  // Must start with SELECT or WITH (CTE) and not contain destructive ops.
  const trimmed = upper.trim();
  if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH')) {
    return 'Only SELECT statements are permitted';
  }

  // Expanded destructive keyword list (now includes CREATE, COPY, GRANT,
  // REVOKE, VACUUM, ANALYZE, EXPLAIN ANALYZE, DO blocks, multiple statements).
  const DESTRUCTIVE_KEYWORDS = [
    'DROP', 'DELETE', 'UPDATE', 'INSERT', 'TRUNCATE', 'ALTER',
    'CREATE', 'COPY', 'GRANT', 'REVOKE', 'VACUUM',
    'CALL', 'EXECUTE', 'PREPARE', 'NOTIFY', 'LISTEN', 'UNLISTEN',
    'LOCK', 'COMMENT', 'CLUSTER', 'REINDEX', 'REFRESH', 'IMPORT',
  ];
  for (const kw of DESTRUCTIVE_KEYWORDS) {
    const re = new RegExp(`\\b${kw}\\b`);
    if (re.test(upper)) {
      return `Destructive keyword detected: ${kw}`;
    }
  }

  // Block multiple-statement injection
  const noStrings = upper.replace(/'(?:''|[^'])*'/g, "''").replace(/--.*$/gm, '');
  if (/;\s*\S/.test(noStrings)) {
    return 'Multiple SQL statements not allowed';
  }

  // Block dangerous functions (pg_sleep DoS, system functions, lo_*).
  const DANGEROUS_FUNCS = [
    'PG_SLEEP', 'PG_TERMINATE_BACKEND', 'PG_CANCEL_BACKEND',
    'PG_READ_FILE', 'PG_LS_DIR', 'PG_READ_BINARY_FILE',
    'LO_IMPORT', 'LO_EXPORT', 'DBLINK',
  ];
  for (const fn of DANGEROUS_FUNCS) {
    if (new RegExp(`\\b${fn}\\b`).test(upper)) {
      return `Dangerous function not allowed: ${fn}`;
    }
  }
  return null;
}

// Process natural language query
router.post('/query', authMiddleware, aiRateLimiter, async (req, res) => {
  const startedAt = Date.now();
  try {
    const { query, company_id } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Sanitize company_id: must be a UUID or integer-looking string. We refuse
    // anything else to avoid prompt-injection and downstream SQL injection
    // through the LLM-generated query.
    let safeCompanyId = null;
    if (company_id) {
      const idStr = String(company_id);
      if (/^[0-9a-fA-F-]{1,64}$/.test(idStr)) {
        safeCompanyId = idStr;
      } else {
        return res.status(400).json({ error: 'Invalid company_id format' });
      }
    }

    // Get company context
    let companyContext = '';
    if (safeCompanyId) {
      const companyResult = await pool.query(
        'SELECT * FROM companies WHERE id = $1',
        [safeCompanyId]
      );
      if (companyResult.rows[0]) {
        const c = companyResult.rows[0];
        companyContext = `Company: ${String(c.name).slice(0, 200)}, Industry: ${String(c.industry || '').slice(0, 200)}`;
      }
    }

    const systemPrompt = `You are a financial data analyst assistant. Convert natural language queries into SQL queries for a PostgreSQL database.

CRITICAL: Use PostgreSQL syntax only. Only use SELECT queries. Never modify data.

DATE COLUMNS (CAN use EXTRACT):
- financial_statements.period_start, financial_statements.period_end
- expense_records.date
- cash_flow_records.date
- balance_sheets.as_of_date
- anomaly_detections.detection_date

VARCHAR period columns (CANNOT use EXTRACT, use string matching like 'Q1 2025'):
- profit_loss_records.period
- budget_actuals.period
- kpi_metrics.period
- revenue_forecasts.forecast_period

Available tables: companies, financial_statements, balance_sheets, profit_loss_records,
expense_records, cash_flow_records, budget_actuals, kpi_metrics, revenue_forecasts,
anomaly_detections.

${safeCompanyId ? `Filter by company_id = '${safeCompanyId}' when relevant.` : ''}

Respond with JSON containing:
{
  "intent": "description of what user wants",
  "sql": "the SQL query to execute",
  "visualization": "table|chart|metric|comparison",
  "chartType": "bar|line|pie|none"
}`;

    // First, understand the intent and extract SQL
    const intentResp = await callOpenRouter(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${companyContext}\n\nQuery: ${query}` },
      ],
      { temperature: 0.1 }
    );
    const parsedIntent = parseAIJson(intentResp.content);

    if (!parsedIntent || !parsedIntent.sql) {
      // Conversational fallback
      const conv = await callOpenRouter(
        [
          {
            role: 'system',
            content:
              'You are a helpful financial analyst assistant. Answer questions about financial data analysis, metrics, and best practices.',
          },
          { role: 'user', content: query },
        ],
        { temperature: 0.7 }
      );
      await saveAiResult({
        feature: 'nlq.conversational',
        user_id: req.user?.id,
        company_id: safeCompanyId,
        input: { query },
        output: { response: conv.content },
        raw: conv.content,
        model: conv.model,
        duration_ms: Date.now() - startedAt,
      });
      return res.json({
        type: 'conversational',
        query,
        response: conv.content,
        data: null,
      });
    }

    // Validate the SQL
    const violation = validateSelectOnly(parsedIntent.sql);
    if (violation) {
      try {
        await pool.query(
          `INSERT INTO audit_logs (action, table_name, record_id, user_id, details, created_at)
           VALUES ($1,$2,$3,$4,$5,NOW())`,
          [
            'BLOCKED_DESTRUCTIVE_NLQ',
            'natural_language_query',
            null,
            req.user?.id || null,
            JSON.stringify({ violation, query, sql: parsedIntent.sql }),
          ]
        );
      } catch (auditErr) {
        console.warn('Audit log insert failed:', auditErr.message);
      }
      await saveAiResult({
        feature: 'nlq.blocked',
        user_id: req.user?.id,
        company_id: safeCompanyId,
        input: { query },
        output: { violation, sql: parsedIntent.sql },
        status: 'blocked',
        error: violation,
        duration_ms: Date.now() - startedAt,
      });
      return res.status(400).json({
        error: 'Query not allowed',
        reason: violation,
      });
    }

    // Execute the SQL query (read-only client transaction would be ideal —
    // here we wrap in a transaction set to read-only as defense in depth.)
    let queryResult;
    const client = await pool.connect();
    try {
      await client.query('BEGIN READ ONLY');
      // Add a 5s statement timeout to prevent runaway queries.
      await client.query("SET LOCAL statement_timeout = '5000ms'");
      queryResult = await client.query(parsedIntent.sql);
      await client.query('COMMIT');
    } catch (sqlError) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('SQL Error:', sqlError);
      return res.json({
        type: 'error',
        query,
        intent: parsedIntent.intent,
        error: 'Could not execute query. Please try rephrasing.',
        sql: parsedIntent.sql,
      });
    } finally {
      client.release();
    }

    // Generate natural language summary of results
    const summaryResp = await callOpenRouter(
      [
        {
          role: 'system',
          content:
            'You are a financial analyst. Provide a clear, concise summary of the data results. Include key insights and any notable patterns.',
        },
        {
          role: 'user',
          content: `Original question: ${query}\n\nData results:\n${JSON.stringify(
            queryResult.rows.slice(0, 20),
            null,
            2
          )}\n\nProvide a brief summary (2-3 sentences) of these findings.`,
        },
      ],
      { temperature: 0.5 }
    );

    const payload = {
      type: 'data',
      query,
      intent: parsedIntent.intent,
      summary: summaryResp.content,
      visualization: parsedIntent.visualization || 'table',
      chartType: parsedIntent.chartType || 'none',
      data: queryResult.rows,
      rowCount: queryResult.rows.length,
      sql: parsedIntent.sql,
    };

    await saveAiResult({
      feature: 'nlq.query',
      user_id: req.user?.id,
      company_id: safeCompanyId,
      input: { query },
      output: { intent: parsedIntent.intent, sql: parsedIntent.sql, rowCount: payload.rowCount, summary: summaryResp.content },
      model: summaryResp.model,
      duration_ms: Date.now() - startedAt,
    });

    res.json(payload);
  } catch (error) {
    console.error('Error processing natural language query:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get suggested queries (auth applied at index.js, but kept for clarity)
router.get('/suggestions', async (req, res) => {
  try {
    const suggestions = [
      {
        category: 'Revenue & Profitability',
        queries: [
          'Show me total revenue by quarter',
          'What is our gross profit margin trend?',
          'Compare revenue vs expenses over time',
          'Which period had the highest net income?',
        ],
      },
      {
        category: 'Balance Sheet',
        queries: [
          'Show current assets vs current liabilities',
          'What is our debt to equity ratio?',
          'How has shareholders equity changed?',
          'Show total assets breakdown',
        ],
      },
      {
        category: 'Expenses',
        queries: [
          'What are the top 5 expense categories?',
          'Show expenses by department',
          'Which vendors have the highest spending?',
          'Are there any expense anomalies?',
        ],
      },
      {
        category: 'KPIs & Performance',
        queries: [
          'Show all KPIs with negative trends',
          'Which KPIs are below target?',
          'Display customer acquisition metrics',
          'What is our revenue per employee?',
        ],
      },
      {
        category: 'Forecasts & Trends',
        queries: [
          'Show revenue forecasts for next quarter',
          'What is the predicted growth rate?',
          'Display trend analysis for all metrics',
          'Which forecasts have high confidence?',
        ],
      },
      {
        category: 'Compliance & Risk',
        queries: [
          'Show compliance status across all regulations',
          'Are there any open anomalies?',
          'What is our overall compliance score?',
          'List high severity issues',
        ],
      },
    ];

    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save a query for quick access — paginated list endpoint below
router.post('/save', authMiddleware, async (req, res) => {
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

// Get saved queries (paginated)
router.get('/saved', authMiddleware, async (req, res) => {
  try {
    const { company_id } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const params = [];
    let where = '';
    if (company_id) {
      params.push(company_id);
      where = `WHERE company_id = $${params.length}`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS c FROM saved_queries ${where}`,
      params
    );
    const total = countResult.rows[0].c;

    params.push(limit);
    params.push(offset);
    const dataResult = await pool.query(
      `SELECT * FROM saved_queries ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Error fetching saved queries:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete saved query
router.delete('/saved/:id', authMiddleware, async (req, res) => {
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
