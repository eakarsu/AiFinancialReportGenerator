const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { parseAIResponse, ensureArray, safeStringify, saveAIResponse } = require('../utils/aiParser');
require('dotenv').config({ path: '../../../.env' });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function callOpenRouter(messages, maxTokens = 6000) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Financial Report Generator'
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
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

// Get all board reports
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT br.*, c.name as company_name
      FROM ai_board_reports br
      LEFT JOIN companies c ON br.company_id = c.id
      ORDER BY br.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching board reports:', error);
    res.status(500).json({ error: 'Failed to fetch board reports' });
  }
});

// Get single board report
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT br.*, c.name as company_name
      FROM ai_board_reports br
      LEFT JOIN companies c ON br.company_id = c.id
      WHERE br.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Board report not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching board report:', error);
    res.status(500).json({ error: 'Failed to fetch board report' });
  }
});

// Create board report
router.post('/', async (req, res) => {
  try {
    const { company_id, report_title, report_period, status } = req.body;
    const result = await pool.query(
      `INSERT INTO ai_board_reports (company_id, report_title, report_period, status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [company_id, report_title, report_period, status || 'draft']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating board report:', error);
    res.status(500).json({ error: 'Failed to create board report' });
  }
});

// Update board report
router.put('/:id', async (req, res) => {
  try {
    const { report_title, report_period, executive_summary, status, presented_date } = req.body;
    const result = await pool.query(
      `UPDATE ai_board_reports
       SET report_title = COALESCE($1, report_title),
           report_period = COALESCE($2, report_period),
           executive_summary = COALESCE($3, executive_summary),
           status = COALESCE($4, status),
           presented_date = COALESCE($5, presented_date),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`,
      [report_title, report_period, executive_summary, status, presented_date, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Board report not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating board report:', error);
    res.status(500).json({ error: 'Failed to update board report' });
  }
});

// Delete board report
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM ai_board_reports WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Board report not found' });
    }
    res.json({ message: 'Board report deleted successfully' });
  } catch (error) {
    console.error('Error deleting board report:', error);
    res.status(500).json({ error: 'Failed to delete board report' });
  }
});

// Generate comprehensive board report
router.post('/generate', async (req, res) => {
  try {
    const { company_id, report_title, report_period } = req.body;

    const companyResult = await pool.query('SELECT * FROM companies WHERE id = $1', [company_id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const company = companyResult.rows[0];

    // Gather all financial data
    const [balanceSheets, profitLoss, cashFlow, kpis, forecasts, compliance, anomalies] = await Promise.all([
      pool.query('SELECT * FROM balance_sheets WHERE company_id = $1 ORDER BY as_of_date DESC LIMIT 4', [company_id]),
      pool.query('SELECT * FROM profit_loss_records WHERE company_id = $1 ORDER BY created_at DESC LIMIT 4', [company_id]),
      pool.query('SELECT * FROM cash_flow_records WHERE company_id = $1 ORDER BY date DESC LIMIT 20', [company_id]),
      pool.query('SELECT * FROM kpi_metrics WHERE company_id = $1 ORDER BY created_at DESC LIMIT 15', [company_id]),
      pool.query('SELECT * FROM revenue_forecasts WHERE company_id = $1 ORDER BY created_at DESC LIMIT 4', [company_id]),
      pool.query('SELECT * FROM compliance_reports WHERE company_id = $1 ORDER BY created_at DESC LIMIT 4', [company_id]),
      pool.query('SELECT * FROM anomaly_detections WHERE company_id = $1 AND severity IN (\'high\', \'critical\') ORDER BY detection_date DESC LIMIT 5', [company_id])
    ]);

    // Calculate key metrics
    const latestBS = balanceSheets.rows[0] || {};
    const latestPL = profitLoss.rows[0] || {};
    const totalRevenue = profitLoss.rows.reduce((sum, r) => sum + parseFloat(r.revenue || 0), 0);
    const totalNetIncome = profitLoss.rows.reduce((sum, r) => sum + parseFloat(r.net_income || 0), 0);

    const messages = [
      {
        role: 'system',
        content: `You are an expert CFO preparing a board report for executive leadership. Create a comprehensive, professional board report with strategic insights. Return your response as a valid JSON object.`
      },
      {
        role: 'user',
        content: `Generate a comprehensive board report for ${company.name} (${company.industry} industry) for ${report_period}:

FINANCIAL DATA:
Balance Sheet:
- Total Assets: $${parseFloat(latestBS.total_assets || 0).toLocaleString()}
- Total Liabilities: $${parseFloat(latestBS.total_liabilities || 0).toLocaleString()}
- Shareholders Equity: $${parseFloat(latestBS.shareholders_equity || 0).toLocaleString()}

Profit & Loss:
- Total Revenue (${profitLoss.rows.length} periods): $${totalRevenue.toLocaleString()}
- Total Net Income: $${totalNetIncome.toLocaleString()}

KPIs: ${JSON.stringify(kpis.rows.slice(0, 10))}

Forecasts: ${JSON.stringify(forecasts.rows)}

Compliance Status: ${compliance.rows.length} reports, ${compliance.rows.filter(c => c.compliance_status === 'compliant').length} compliant

High-Risk Anomalies: ${anomalies.rows.length}

Generate a board report as JSON:
{
  "executive_summary": {
    "overview": "2-3 paragraph executive overview",
    "period_performance": "Summary of period performance",
    "key_achievements": ["Achievement 1", "Achievement 2", "Achievement 3"],
    "key_challenges": ["Challenge 1", "Challenge 2"],
    "outlook_statement": "Forward-looking statement"
  },
  "financial_highlights": {
    "revenue": {
      "current": ${totalRevenue},
      "previous": 0,
      "change_percent": 0,
      "commentary": "Revenue analysis"
    },
    "profitability": {
      "net_income": ${totalNetIncome},
      "margin": "${(totalNetIncome / totalRevenue * 100).toFixed(2)}%",
      "commentary": "Profitability analysis"
    },
    "liquidity": {
      "current_ratio": 0,
      "working_capital": 0,
      "commentary": "Liquidity analysis"
    },
    "leverage": {
      "debt_to_equity": 0,
      "interest_coverage": 0,
      "commentary": "Leverage analysis"
    }
  },
  "key_metrics": [
    {
      "metric": "Metric name",
      "value": "Current value",
      "target": "Target value",
      "status": "on_track/at_risk/behind",
      "trend": "up/down/stable",
      "commentary": "Brief analysis"
    }
  ],
  "strategic_initiatives": [
    {
      "initiative": "Initiative name",
      "status": "on_track/delayed/completed",
      "progress_percent": 75,
      "key_milestones": ["Milestone 1", "Milestone 2"],
      "next_steps": ["Next step 1"],
      "budget_status": "on_budget/over_budget/under_budget",
      "risks": ["Risk 1"]
    }
  ],
  "risk_assessment": {
    "overall_risk_rating": "low/medium/high",
    "top_risks": [
      {
        "risk": "Risk description",
        "category": "financial/operational/strategic/compliance",
        "likelihood": "low/medium/high",
        "impact": "low/medium/high",
        "mitigation": "Mitigation strategy",
        "owner": "Risk owner"
      }
    ],
    "emerging_risks": ["Emerging risk 1"],
    "risk_trend": "improving/stable/worsening"
  },
  "outlook": {
    "short_term": "Next quarter outlook",
    "medium_term": "Next 6-12 months outlook",
    "long_term": "Strategic direction",
    "key_assumptions": ["Assumption 1", "Assumption 2"],
    "growth_drivers": ["Driver 1", "Driver 2"],
    "headwinds": ["Headwind 1"]
  },
  "recommendations": [
    {
      "recommendation": "Specific recommendation",
      "rationale": "Why this is recommended",
      "expected_impact": "Expected outcome",
      "priority": "high/medium/low",
      "timeline": "Implementation timeline",
      "resources_required": "Resources needed",
      "board_action_required": true/false
    }
  ],
  "appendices": {
    "detailed_financials": "Summary of detailed financial tables",
    "glossary": ["Term 1: Definition", "Term 2: Definition"],
    "methodology_notes": "Notes on calculations and methodologies"
  }
}`
      }
    ];

    const aiResponse = await callOpenRouter(messages);
    console.log('AI Board Report received:', aiResponse.substring(0, 300));

    // Parse with robust error handling
    let report = parseAIResponse(aiResponse);

    if (!report) {
      console.log('Using fallback board report structure');
      report = {
        executive_summary: {
          overview: aiResponse,
          key_achievements: [],
          key_challenges: []
        },
        financial_highlights: {},
        key_metrics: [],
        strategic_initiatives: [],
        risk_assessment: {},
        outlook: {},
        recommendations: [],
        appendices: {}
      };
    }

    // Create clean executive summary - store as JSON for structured display
    const executiveSummary = report.executive_summary
      ? JSON.stringify(report.executive_summary)
      : (report.summary || 'Board report generated');

    // Create clean outlook - store as JSON for structured display
    const outlookData = report.outlook
      ? JSON.stringify(report.outlook)
      : '';

    // Save to database with normalized data
    const result = await pool.query(
      `INSERT INTO ai_board_reports (company_id, report_title, report_period, executive_summary, financial_highlights, key_metrics, strategic_initiatives, risk_assessment, outlook, recommendations, appendices, ai_generated, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, 'generated') RETURNING *`,
      [
        company_id,
        report_title || `Board Report - ${report_period}`,
        report_period,
        executiveSummary,
        safeStringify(report.financial_highlights || {}),
        safeStringify(report.key_metrics || []),
        safeStringify(report.strategic_initiatives || []),
        safeStringify(report.risk_assessment || {}),
        outlookData,
        safeStringify(report.recommendations || []),
        safeStringify(report.appendices || {})
      ]
    );

    // Save to AI responses table for history
    await saveAIResponse(pool, {
      company_id,
      feature_type: 'board_report_writer',
      feature_name: report_title || `Board Report - ${report_period}`,
      source_record_id: result.rows[0].id,
      prompt_summary: `Generate board report for ${report_period}`,
      raw_response: aiResponse,
      parsed_response: report,
      response_type: 'report',
      model_used: OPENROUTER_MODEL
    });

    res.json({ board_report: result.rows[0], report });
  } catch (error) {
    console.error('Error generating board report:', error);
    res.status(500).json({ error: 'Failed to generate board report' });
  }
});

// Analyze existing board report
router.post('/analyze', async (req, res) => {
  try {
    const { id } = req.body;

    const result = await pool.query(`
      SELECT br.*, c.name as company_name
      FROM ai_board_reports br
      LEFT JOIN companies c ON br.company_id = c.id
      WHERE br.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Board report not found' });
    }

    const report = result.rows[0];

    const messages = [
      {
        role: 'system',
        content: 'You are a board advisor. Analyze the board report and provide improvement suggestions. Return response as JSON.'
      },
      {
        role: 'user',
        content: `Analyze this board report for ${report.company_name}:

Title: ${report.report_title}
Period: ${report.report_period}
Executive Summary: ${report.executive_summary}
Financial Highlights: ${JSON.stringify(report.financial_highlights)}
Recommendations: ${JSON.stringify(report.recommendations)}

Provide analysis as JSON:
{
  "report_quality_score": 85,
  "strengths": ["Strength 1", "Strength 2"],
  "areas_for_improvement": ["Area 1", "Area 2"],
  "missing_elements": ["Element 1"],
  "presentation_tips": ["Tip 1", "Tip 2"],
  "board_questions_to_anticipate": ["Question 1", "Question 2"],
  "supporting_data_needed": ["Data 1", "Data 2"]
}`
      }
    ];

    const aiResponse = await callOpenRouter(messages);
    console.log('AI Board Report Analysis received:', aiResponse.substring(0, 200));

    // Parse with robust error handling
    let analysis = parseAIResponse(aiResponse);

    if (!analysis) {
      analysis = {
        report_quality_score: 75,
        strengths: [aiResponse],
        areas_for_improvement: [],
        missing_elements: []
      };
    }

    res.json({ analysis, report_id: id });
  } catch (error) {
    console.error('Error analyzing board report:', error);
    res.status(500).json({ error: 'Failed to analyze board report' });
  }
});

module.exports = router;
