const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { parseAIResponse, ensureArray, safeStringify, saveAIResponse } = require('../utils/aiParser');

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

// Get all expense categorizations
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ec.*, c.name as company_name
      FROM ai_expense_categorizations ec
      LEFT JOIN companies c ON ec.company_id = c.id
      ORDER BY ec.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching expense categorizations:', error);
    res.status(500).json({ error: 'Failed to fetch expense categorizations' });
  }
});

// Get single expense categorization
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ec.*, c.name as company_name
      FROM ai_expense_categorizations ec
      LEFT JOIN companies c ON ec.company_id = c.id
      WHERE ec.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense categorization not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching expense categorization:', error);
    res.status(500).json({ error: 'Failed to fetch expense categorization' });
  }
});

// Create expense categorization
router.post('/', async (req, res) => {
  try {
    const { company_id, expense_description, amount, vendor, date, receipt_text } = req.body;

    const result = await pool.query(
      `INSERT INTO ai_expense_categorizations (company_id, expense_description, amount, vendor, date, receipt_text, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
      [company_id, expense_description, amount, vendor, date, receipt_text]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating expense categorization:', error);
    res.status(500).json({ error: 'Failed to create expense categorization' });
  }
});

// Update expense categorization
router.put('/:id', async (req, res) => {
  try {
    const { expense_description, amount, vendor, date, receipt_text, category, subcategory, confidence_score, status } = req.body;

    const result = await pool.query(
      `UPDATE ai_expense_categorizations
       SET expense_description = COALESCE($1, expense_description),
           amount = COALESCE($2, amount),
           vendor = COALESCE($3, vendor),
           date = COALESCE($4, date),
           receipt_text = COALESCE($5, receipt_text),
           category = COALESCE($6, category),
           subcategory = COALESCE($7, subcategory),
           confidence_score = COALESCE($8, confidence_score),
           status = COALESCE($9, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 RETURNING *`,
      [expense_description, amount, vendor, date, receipt_text, category, subcategory, confidence_score, status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense categorization not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating expense categorization:', error);
    res.status(500).json({ error: 'Failed to update expense categorization' });
  }
});

// Delete expense categorization
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM ai_expense_categorizations WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense categorization not found' });
    }
    res.json({ message: 'Expense categorization deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense categorization:', error);
    res.status(500).json({ error: 'Failed to delete expense categorization' });
  }
});

// AI Categorize expense
router.post('/categorize', async (req, res) => {
  try {
    const { id } = req.body;

    const result = await pool.query(`
      SELECT ec.*, c.name as company_name, c.industry
      FROM ai_expense_categorizations ec
      LEFT JOIN companies c ON ec.company_id = c.id
      WHERE ec.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const expense = result.rows[0];

    const messages = [
      {
        role: 'system',
        content: `You are an expert financial analyst and expense categorization specialist. Analyze expenses and categorize them accurately for accounting purposes. Return your response as a valid JSON object.`
      },
      {
        role: 'user',
        content: `Categorize this expense for ${expense.company_name} (${expense.industry} industry):

Expense Description: ${expense.expense_description}
Amount: $${parseFloat(expense.amount).toLocaleString()}
Vendor: ${expense.vendor || 'Unknown'}
Date: ${expense.date}
${expense.receipt_text ? `Receipt Details: ${expense.receipt_text}` : ''}

Provide a comprehensive categorization as a JSON object:
{
  "category": "Main category (e.g., Travel, Marketing, Technology, Office Supplies, Professional Services, Utilities, etc.)",
  "subcategory": "Specific subcategory",
  "confidence_score": 85,
  "tax_deductible": true,
  "deduction_type": "Business expense type for tax purposes",
  "gl_account_suggestion": "Suggested General Ledger account",
  "cost_center_suggestion": "Suggested cost center",
  "reasoning": "Brief explanation of why this categorization was chosen",
  "policy_compliance": {
    "is_compliant": true,
    "policy_notes": "Notes about expense policy compliance",
    "approval_required": false,
    "approval_level": "manager/director/vp/cfo"
  },
  "similar_expenses_pattern": "Description of similar expense patterns",
  "budget_impact": {
    "category_budget_status": "within_budget/over_budget/approaching_limit",
    "recommendation": "Budget-related recommendation"
  },
  "fraud_risk_assessment": {
    "risk_level": "low/medium/high",
    "risk_factors": ["factor1", "factor2"],
    "recommended_actions": ["action1", "action2"]
  },
  "optimization_suggestions": [
    {
      "suggestion": "Cost-saving suggestion",
      "potential_savings": "Estimated savings",
      "implementation": "How to implement"
    }
  ],
  "tags": ["tag1", "tag2", "tag3"]
}`
      }
    ];

    const aiResponse = await callOpenRouter(messages);
    console.log('AI Expense Categorization Response received:', aiResponse.substring(0, 300));

    let analysis = parseAIResponse(aiResponse);

    if (!analysis) {
      console.log('Using fallback categorization structure');
      analysis = {
        category: 'Uncategorized',
        subcategory: 'Pending Review',
        confidence_score: 50,
        reasoning: aiResponse,
        tax_deductible: false,
        policy_compliance: { is_compliant: true, policy_notes: 'Requires manual review' },
        fraud_risk_assessment: { risk_level: 'low', risk_factors: [], recommended_actions: ['Manual review recommended'] },
        optimization_suggestions: [],
        tags: ['pending-review']
      };
    }

    // Update database with categorization
    await pool.query(
      `UPDATE ai_expense_categorizations
       SET category = $1, subcategory = $2, confidence_score = $3, tax_deductible = $4,
           gl_account = $5, cost_center = $6, policy_compliance = $7, fraud_risk = $8,
           optimization_suggestions = $9, ai_reasoning = $10, tags = $11, status = 'categorized', updated_at = CURRENT_TIMESTAMP
       WHERE id = $12`,
      [
        analysis.category,
        analysis.subcategory,
        analysis.confidence_score,
        analysis.tax_deductible,
        analysis.gl_account_suggestion,
        analysis.cost_center_suggestion,
        safeStringify(analysis.policy_compliance),
        safeStringify(analysis.fraud_risk_assessment),
        safeStringify(analysis.optimization_suggestions),
        aiResponse,
        analysis.tags,
        id
      ]
    );

    // Save to AI responses table for history
    await saveAIResponse(pool, {
      company_id: expense.company_id,
      feature_type: 'expense_categorizer',
      feature_name: expense.expense_description || `${expense.vendor} expense`,
      source_record_id: id,
      prompt_summary: `Categorize expense: ${expense.expense_description} ($${expense.amount})`,
      raw_response: aiResponse,
      parsed_response: analysis,
      response_type: 'categorization',
      model_used: OPENROUTER_MODEL
    });

    res.json({ analysis, expense_id: id });
  } catch (error) {
    console.error('Error categorizing expense:', error);
    res.status(500).json({ error: 'Failed to categorize expense' });
  }
});

// Bulk categorize expenses
router.post('/bulk-categorize', async (req, res) => {
  try {
    const { company_id } = req.body;

    // Get uncategorized expenses
    const expensesResult = await pool.query(`
      SELECT ec.*, c.name as company_name, c.industry
      FROM ai_expense_categorizations ec
      LEFT JOIN companies c ON ec.company_id = c.id
      WHERE ec.company_id = $1 AND ec.status = 'pending'
      ORDER BY ec.date DESC
      LIMIT 10
    `, [company_id]);

    if (expensesResult.rows.length === 0) {
      return res.json({ message: 'No pending expenses to categorize', results: [] });
    }

    const messages = [
      {
        role: 'system',
        content: 'You are an expert expense categorization AI. Categorize multiple expenses accurately for accounting. Return response as JSON.'
      },
      {
        role: 'user',
        content: `Categorize these expenses for ${expensesResult.rows[0].company_name}:

${expensesResult.rows.map((exp, i) => `
${i + 1}. Description: ${exp.expense_description}
   Amount: $${parseFloat(exp.amount).toLocaleString()}
   Vendor: ${exp.vendor || 'Unknown'}
   Date: ${exp.date}
`).join('\n')}

Provide categorizations as JSON:
{
  "categorizations": [
    {
      "index": 1,
      "category": "Main category",
      "subcategory": "Subcategory",
      "confidence": 85,
      "tax_deductible": true,
      "reasoning": "Brief explanation"
    }
  ],
  "summary": {
    "total_amount": 0,
    "by_category": {"Category": 0},
    "tax_deductible_total": 0,
    "recommendations": ["recommendation1"]
  }
}`
      }
    ];

    const aiResponse = await callOpenRouter(messages);
    let bulkAnalysis;
    try {
      bulkAnalysis = parseAIResponse(aiResponse);
    } catch {
      bulkAnalysis = { categorizations: [], summary: { recommendations: [aiResponse] } };
    }

    res.json({
      analysis: bulkAnalysis,
      expenses_processed: expensesResult.rows.length,
      expenses: expensesResult.rows
    });
  } catch (error) {
    console.error('Error in bulk categorization:', error);
    res.status(500).json({ error: 'Failed to perform bulk categorization' });
  }
});

// Get expense statistics
router.get('/stats/:company_id', async (req, res) => {
  try {
    const { company_id } = req.params;

    const stats = await pool.query(`
      SELECT
        COUNT(*) as total_expenses,
        COUNT(CASE WHEN status = 'categorized' THEN 1 END) as categorized,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        SUM(amount) as total_amount,
        SUM(CASE WHEN tax_deductible = true THEN amount ELSE 0 END) as tax_deductible_amount,
        AVG(confidence_score) as avg_confidence
      FROM ai_expense_categorizations
      WHERE company_id = $1
    `, [company_id]);

    const byCategory = await pool.query(`
      SELECT category, COUNT(*) as count, SUM(amount) as total
      FROM ai_expense_categorizations
      WHERE company_id = $1 AND category IS NOT NULL
      GROUP BY category
      ORDER BY total DESC
    `, [company_id]);

    res.json({
      overview: stats.rows[0],
      by_category: byCategory.rows
    });
  } catch (error) {
    console.error('Error fetching expense stats:', error);
    res.status(500).json({ error: 'Failed to fetch expense statistics' });
  }
});

module.exports = router;
