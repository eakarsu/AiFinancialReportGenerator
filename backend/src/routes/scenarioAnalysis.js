const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all scenarios for a company
router.get('/', async (req, res) => {
  try {
    const { company_id } = req.query;
    let query = `
      SELECT s.*, c.name as company_name
      FROM scenario_analyses s
      LEFT JOIN companies c ON s.company_id = c.id
    `;
    const params = [];

    if (company_id) {
      query += ' WHERE s.company_id = $1';
      params.push(company_id);
    }

    query += ' ORDER BY s.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single scenario
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT s.*, c.name as company_name
       FROM scenario_analyses s
       LEFT JOIN companies c ON s.company_id = c.id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching scenario:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new scenario
router.post('/', async (req, res) => {
  try {
    const {
      company_id,
      scenario_name,
      scenario_type,
      base_values,
      assumptions,
      variables
    } = req.body;

    // Calculate projected values based on assumptions
    const projectedValues = calculateProjections(base_values, assumptions, variables);

    const result = await pool.query(
      `INSERT INTO scenario_analyses
       (company_id, scenario_name, scenario_type, base_values, assumptions, variables, projected_values, impact_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        company_id,
        scenario_name,
        scenario_type,
        JSON.stringify(base_values),
        JSON.stringify(assumptions),
        JSON.stringify(variables),
        JSON.stringify(projectedValues),
        JSON.stringify(generateImpactSummary(base_values, projectedValues))
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating scenario:', error);
    res.status(500).json({ error: error.message });
  }
});

// Run what-if analysis
router.post('/analyze', async (req, res) => {
  try {
    const { company_id, base_scenario, what_if_changes } = req.body;

    // Get company financial data
    const [balanceSheet, profitLoss] = await Promise.all([
      pool.query(
        'SELECT * FROM balance_sheets WHERE company_id = $1 ORDER BY as_of_date DESC LIMIT 1',
        [company_id]
      ),
      pool.query(
        'SELECT * FROM profit_loss_records WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1',
        [company_id]
      )
    ]);

    const bs = balanceSheet.rows[0] || {};
    const pl = profitLoss.rows[0] || {};

    // Base values from actual data
    const baseValues = {
      revenue: parseFloat(pl.revenue) || base_scenario?.revenue || 1000000,
      cogs: parseFloat(pl.cost_of_goods_sold) || base_scenario?.cogs || 400000,
      operatingExpenses: parseFloat(pl.operating_expenses) || base_scenario?.operatingExpenses || 300000,
      totalAssets: parseFloat(bs.total_assets) || base_scenario?.totalAssets || 5000000,
      totalLiabilities: parseFloat(bs.total_liabilities) || base_scenario?.totalLiabilities || 2000000,
      interestRate: base_scenario?.interestRate || 5,
      taxRate: base_scenario?.taxRate || 25
    };

    // Apply what-if changes
    const scenarios = [];

    // Best case scenario
    const bestCase = applyChanges(baseValues, {
      revenueChange: what_if_changes?.bestCase?.revenueChange || 20,
      cogsChange: what_if_changes?.bestCase?.cogsChange || -5,
      expenseChange: what_if_changes?.bestCase?.expenseChange || -10
    });
    scenarios.push({ name: 'Best Case', ...bestCase });

    // Base case (current)
    const baseCase = applyChanges(baseValues, { revenueChange: 0, cogsChange: 0, expenseChange: 0 });
    scenarios.push({ name: 'Base Case', ...baseCase });

    // Worst case scenario
    const worstCase = applyChanges(baseValues, {
      revenueChange: what_if_changes?.worstCase?.revenueChange || -15,
      cogsChange: what_if_changes?.worstCase?.cogsChange || 10,
      expenseChange: what_if_changes?.worstCase?.expenseChange || 15
    });
    scenarios.push({ name: 'Worst Case', ...worstCase });

    // Custom scenario if provided
    if (what_if_changes?.custom) {
      const customCase = applyChanges(baseValues, what_if_changes.custom);
      scenarios.push({ name: 'Custom Scenario', ...customCase });
    }

    // AI Analysis
    const OpenAI = require('openai');
    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
      messages: [
        {
          role: 'system',
          content: 'You are a financial analyst expert in scenario analysis and risk assessment.'
        },
        {
          role: 'user',
          content: `Analyze these financial scenarios and provide insights:

${scenarios.map(s => `
${s.name}:
- Revenue: $${typeof s.revenue === 'number' ? s.revenue.toLocaleString() : 'N/A'}
- Gross Profit: $${typeof s.grossProfit === 'number' ? s.grossProfit.toLocaleString() : 'N/A'}
- Operating Income: $${typeof s.operatingIncome === 'number' ? s.operatingIncome.toLocaleString() : 'N/A'}
- Net Income: $${typeof s.netIncome === 'number' ? s.netIncome.toLocaleString() : 'N/A'}
- Profit Margin: ${typeof s.profitMargin === 'number' ? s.profitMargin.toFixed(2) : 'N/A'}%
- ROA: ${typeof s.roa === 'number' ? s.roa.toFixed(2) : 'N/A'}%
`).join('\n')}

Provide analysis as JSON with keys: summary, risks, opportunities, recommendations`
        }
      ],
      temperature: 0.3,
    });

    let aiAnalysis;
    try {
      const jsonMatch = response.choices[0].message.content.match(/\{[\s\S]*\}/);
      aiAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: response.choices[0].message.content };
    } catch {
      aiAnalysis = { raw: response.choices[0].message.content };
    }

    res.json({
      baseValues,
      scenarios,
      aiAnalysis,
      analyzedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error running scenario analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

// Compare multiple scenarios
router.post('/compare', async (req, res) => {
  try {
    const { scenario_ids } = req.body;

    const result = await pool.query(
      `SELECT * FROM scenario_analyses WHERE id = ANY($1)`,
      [scenario_ids]
    );

    const scenarios = result.rows.map(s => ({
      ...s,
      base_values: typeof s.base_values === 'string' ? JSON.parse(s.base_values) : s.base_values,
      projected_values: typeof s.projected_values === 'string' ? JSON.parse(s.projected_values) : s.projected_values
    }));

    res.json({
      scenarios,
      comparison: generateComparison(scenarios)
    });
  } catch (error) {
    console.error('Error comparing scenarios:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete scenario
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM scenario_analyses WHERE id = $1', [id]);
    res.json({ message: 'Scenario deleted successfully' });
  } catch (error) {
    console.error('Error deleting scenario:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
function applyChanges(baseValues, changes) {
  const revenue = baseValues.revenue * (1 + (changes.revenueChange || 0) / 100);
  const cogs = baseValues.cogs * (1 + (changes.cogsChange || 0) / 100);
  const operatingExpenses = baseValues.operatingExpenses * (1 + (changes.expenseChange || 0) / 100);
  const grossProfit = revenue - cogs;
  const operatingIncome = grossProfit - operatingExpenses;
  const interestExpense = baseValues.totalLiabilities * (baseValues.interestRate / 100);
  const ebt = operatingIncome - interestExpense;
  const taxes = ebt > 0 ? ebt * (baseValues.taxRate / 100) : 0;
  const netIncome = ebt - taxes;

  return {
    revenue,
    cogs,
    grossProfit,
    operatingExpenses,
    operatingIncome,
    interestExpense,
    ebt,
    taxes,
    netIncome,
    profitMargin: (netIncome / revenue) * 100,
    grossMargin: (grossProfit / revenue) * 100,
    roa: (netIncome / baseValues.totalAssets) * 100,
    roe: (netIncome / (baseValues.totalAssets - baseValues.totalLiabilities)) * 100
  };
}

function calculateProjections(baseValues, assumptions, variables) {
  const projections = [];
  const years = assumptions?.projectionYears || 5;

  for (let year = 1; year <= years; year++) {
    const growthRate = assumptions?.revenueGrowth || 5;
    const revenue = (baseValues?.revenue || 1000000) * Math.pow(1 + growthRate / 100, year);
    const expenses = revenue * ((assumptions?.expenseRatio || 70) / 100);

    projections.push({
      year,
      revenue,
      expenses,
      netIncome: revenue - expenses,
      growthRate
    });
  }

  return projections;
}

function generateImpactSummary(baseValues, projectedValues) {
  if (!projectedValues || projectedValues.length === 0) return {};

  const lastProjection = projectedValues[projectedValues.length - 1];
  return {
    revenueChange: ((lastProjection.revenue - (baseValues?.revenue || 0)) / (baseValues?.revenue || 1)) * 100,
    netIncomeChange: ((lastProjection.netIncome - (baseValues?.netIncome || 0)) / (baseValues?.netIncome || 1)) * 100,
    projectedROI: (lastProjection.netIncome / (baseValues?.revenue || 1)) * 100
  };
}

function generateComparison(scenarios) {
  return {
    revenueRange: {
      min: Math.min(...scenarios.map(s => s.projected_values?.revenue || 0)),
      max: Math.max(...scenarios.map(s => s.projected_values?.revenue || 0))
    },
    profitRange: {
      min: Math.min(...scenarios.map(s => s.projected_values?.netIncome || 0)),
      max: Math.max(...scenarios.map(s => s.projected_values?.netIncome || 0))
    }
  };
}

module.exports = router;
