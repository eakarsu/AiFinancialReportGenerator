const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { parseAIResponse, extractNumber, ensureArray, safeStringify, saveAIResponse } = require('../utils/aiParser');

require('dotenv').config({ path: '../../../.env' });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function callOpenRouter(messages, maxTokens = 4000) {
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

// Get all variance explanations
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ve.*, c.name as company_name
      FROM ai_variance_explanations ve
      LEFT JOIN companies c ON ve.company_id = c.id
      ORDER BY ve.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching variance explanations:', error);
    res.status(500).json({ error: 'Failed to fetch variance explanations' });
  }
});

// Get single variance explanation
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ve.*, c.name as company_name
      FROM ai_variance_explanations ve
      LEFT JOIN companies c ON ve.company_id = c.id
      WHERE ve.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Variance explanation not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching variance explanation:', error);
    res.status(500).json({ error: 'Failed to fetch variance explanation' });
  }
});

// Create variance explanation
router.post('/', async (req, res) => {
  try {
    const { company_id, title, period, department, category, budgeted_amount, actual_amount } = req.body;
    const variance_amount = actual_amount - budgeted_amount;
    const variance_percentage = budgeted_amount ? ((variance_amount / budgeted_amount) * 100).toFixed(2) : 0;
    const variance_type = variance_amount >= 0 ? 'favorable' : 'unfavorable';

    const result = await pool.query(
      `INSERT INTO ai_variance_explanations (company_id, title, period, department, category, budgeted_amount, actual_amount, variance_amount, variance_percentage, variance_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [company_id, title, period, department, category, budgeted_amount, actual_amount, variance_amount, variance_percentage, variance_type]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating variance explanation:', error);
    res.status(500).json({ error: 'Failed to create variance explanation' });
  }
});

// Update variance explanation
router.put('/:id', async (req, res) => {
  try {
    const { title, period, department, category, budgeted_amount, actual_amount, status } = req.body;
    const variance_amount = actual_amount && budgeted_amount ? actual_amount - budgeted_amount : null;
    const variance_percentage = budgeted_amount && variance_amount ? ((variance_amount / budgeted_amount) * 100).toFixed(2) : null;
    const variance_type = variance_amount >= 0 ? 'favorable' : 'unfavorable';

    const result = await pool.query(
      `UPDATE ai_variance_explanations
       SET title = COALESCE($1, title),
           period = COALESCE($2, period),
           department = COALESCE($3, department),
           category = COALESCE($4, category),
           budgeted_amount = COALESCE($5, budgeted_amount),
           actual_amount = COALESCE($6, actual_amount),
           variance_amount = COALESCE($7, variance_amount),
           variance_percentage = COALESCE($8, variance_percentage),
           variance_type = COALESCE($9, variance_type),
           status = COALESCE($10, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 RETURNING *`,
      [title, period, department, category, budgeted_amount, actual_amount, variance_amount, variance_percentage, variance_type, status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Variance explanation not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating variance explanation:', error);
    res.status(500).json({ error: 'Failed to update variance explanation' });
  }
});

// Delete variance explanation
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM ai_variance_explanations WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Variance explanation not found' });
    }
    res.json({ message: 'Variance explanation deleted successfully' });
  } catch (error) {
    console.error('Error deleting variance explanation:', error);
    res.status(500).json({ error: 'Failed to delete variance explanation' });
  }
});

// Generate AI explanation for variance
router.post('/analyze', async (req, res) => {
  try {
    const { id } = req.body;

    const result = await pool.query(`
      SELECT ve.*, c.name as company_name, c.industry
      FROM ai_variance_explanations ve
      LEFT JOIN companies c ON ve.company_id = c.id
      WHERE ve.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Variance explanation not found' });
    }

    const variance = result.rows[0];

    const messages = [
      {
        role: 'system',
        content: `You are an expert financial analyst and budget controller. Provide detailed, actionable variance analysis explanations. Return your response as a valid JSON object.`
      },
      {
        role: 'user',
        content: `Analyze this budget variance for ${variance.company_name} (${variance.industry} industry):

Department: ${variance.department}
Category: ${variance.category}
Period: ${variance.period}
Budgeted Amount: $${parseFloat(variance.budgeted_amount).toLocaleString()}
Actual Amount: $${parseFloat(variance.actual_amount).toLocaleString()}
Variance: $${parseFloat(variance.variance_amount).toLocaleString()} (${variance.variance_percentage}%)
Type: ${variance.variance_type}

Provide a comprehensive analysis as a JSON object:
{
  "executive_summary": "Brief overview of the variance",
  "variance_classification": {
    "type": "favorable/unfavorable",
    "severity": "minor/moderate/significant/critical",
    "urgency": "low/medium/high/immediate"
  },
  "root_causes": [
    {
      "cause": "Primary cause description",
      "likelihood": "percentage",
      "evidence": "Supporting data or indicators"
    }
  ],
  "impact_analysis": {
    "financial_impact": "Description of financial implications",
    "operational_impact": "Description of operational effects",
    "strategic_impact": "Description of strategic consequences",
    "risk_exposure": "Description of risk implications"
  },
  "contributing_factors": [
    "Factor 1",
    "Factor 2"
  ],
  "historical_context": "How this compares to past periods",
  "recommendations": [
    {
      "action": "Recommended action",
      "priority": "high/medium/low",
      "timeline": "Suggested timeline",
      "expected_outcome": "Expected result"
    }
  ],
  "preventive_measures": [
    "Measure 1",
    "Measure 2"
  ],
  "kpis_to_monitor": [
    "KPI 1",
    "KPI 2"
  ]
}`
      }
    ];

    const aiResponse = await callOpenRouter(messages);
    console.log('AI Variance Response received:', aiResponse.substring(0, 300));

    // Parse with robust error handling
    let analysis = parseAIResponse(aiResponse);

    if (!analysis) {
      console.log('Using fallback variance analysis structure');
      analysis = {
        executive_summary: aiResponse,
        variance_classification: { type: variance.variance_type, severity: 'moderate', urgency: 'medium' },
        root_causes: [{ cause: 'Analysis pending detailed review', likelihood: 'N/A', evidence: 'N/A' }],
        impact_analysis: { financial_impact: 'Requires manual review' },
        recommendations: [{ action: 'Review detailed financial data', priority: 'high', timeline: 'Immediate', expected_outcome: 'Better understanding of variance' }]
      };
    }

    // Normalize arrays
    const rootCauses = ensureArray(analysis.root_causes);
    const recommendations = ensureArray(analysis.recommendations);
    const impactAnalysis = analysis.impact_analysis?.financial_impact || analysis.executive_summary || 'Analysis complete';

    // Update database with analysis
    await pool.query(
      `UPDATE ai_variance_explanations
       SET root_causes = $1, impact_analysis = $2, recommendations = $3, ai_explanation = $4, status = 'analyzed', updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [safeStringify(rootCauses), impactAnalysis, safeStringify(recommendations), aiResponse, id]
    );

    // Save to AI responses table for history
    await saveAIResponse(pool, {
      company_id: variance.company_id,
      feature_type: 'variance_explainer',
      feature_name: variance.title || `${variance.department} - ${variance.category}`,
      source_record_id: id,
      prompt_summary: `Analyze variance: ${variance.department} ${variance.category} (${variance.variance_percentage}%)`,
      raw_response: aiResponse,
      parsed_response: analysis,
      response_type: 'analysis',
      model_used: OPENROUTER_MODEL
    });

    res.json({ analysis, variance_id: id });
  } catch (error) {
    console.error('Error analyzing variance:', error);
    res.status(500).json({ error: 'Failed to analyze variance' });
  }
});

// Bulk analyze variances
router.post('/bulk-analyze', async (req, res) => {
  try {
    const { company_id } = req.body;

    // Get all budget actuals for the company
    const budgetResult = await pool.query(`
      SELECT ba.*, c.name as company_name, c.industry
      FROM budget_actuals ba
      LEFT JOIN companies c ON ba.company_id = c.id
      WHERE ba.company_id = $1 AND ABS(ba.variance_percentage) > 5
      ORDER BY ABS(ba.variance_percentage) DESC
      LIMIT 10
    `, [company_id]);

    if (budgetResult.rows.length === 0) {
      return res.json({ message: 'No significant variances found', analyses: [] });
    }

    const messages = [
      {
        role: 'system',
        content: 'You are an expert financial analyst. Analyze multiple budget variances and provide insights. Return response as JSON.'
      },
      {
        role: 'user',
        content: `Analyze these budget variances for ${budgetResult.rows[0].company_name}:

${budgetResult.rows.map((ba, i) => `
${i + 1}. ${ba.department} - ${ba.category}
   Period: ${ba.period}
   Budget: $${parseFloat(ba.budgeted_amount).toLocaleString()}
   Actual: $${parseFloat(ba.actual_amount).toLocaleString()}
   Variance: ${ba.variance_percentage}%
`).join('\n')}

Provide analysis as JSON:
{
  "overall_assessment": "Summary of overall budget performance",
  "total_favorable_variance": "Total positive variances",
  "total_unfavorable_variance": "Total negative variances",
  "most_concerning": {
    "item": "Department - Category",
    "reason": "Why this is most concerning"
  },
  "patterns_identified": ["Pattern 1", "Pattern 2"],
  "systemic_issues": ["Issue 1", "Issue 2"],
  "priority_actions": [
    {
      "action": "Action description",
      "department": "Department name",
      "urgency": "high/medium/low"
    }
  ],
  "forecast_impact": "How these variances affect future forecasts"
}`
      }
    ];

    const aiResponse = await callOpenRouter(messages);

    let bulkAnalysis;
    try {
      bulkAnalysis = JSON.parse(aiResponse);
    } catch {
      bulkAnalysis = { overall_assessment: aiResponse };
    }

    res.json({ analysis: bulkAnalysis, variances_analyzed: budgetResult.rows.length });
  } catch (error) {
    console.error('Error in bulk analysis:', error);
    res.status(500).json({ error: 'Failed to perform bulk analysis' });
  }
});

module.exports = router;
