const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all DCF valuations for a company
router.get('/', async (req, res) => {
  try {
    const { company_id } = req.query;
    let query = `
      SELECT d.*, c.name as company_name
      FROM dcf_valuations d
      LEFT JOIN companies c ON d.company_id = c.id
    `;
    const params = [];

    if (company_id) {
      query += ' WHERE d.company_id = $1';
      params.push(company_id);
    }

    query += ' ORDER BY d.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching DCF valuations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Calculate DCF valuation
router.post('/calculate', async (req, res) => {
  try {
    const {
      company_id,
      valuation_name,
      // Cash flow inputs
      initial_fcf,
      growth_rates, // Array of growth rates for each projection year
      projection_years,
      // Discount rate inputs
      risk_free_rate,
      market_risk_premium,
      beta,
      cost_of_debt,
      tax_rate,
      debt_weight,
      equity_weight,
      // Terminal value inputs
      terminal_growth_rate,
      // Optional: use company data
      use_company_data
    } = req.body;

    let fcf = initial_fcf;

    // If using company data, fetch from database
    if (use_company_data && company_id) {
      const [cashFlow, profitLoss, balanceSheet] = await Promise.all([
        pool.query(
          `SELECT SUM(CASE WHEN record_type = 'operating' THEN amount ELSE 0 END) as operating_cf
           FROM cash_flow_records WHERE company_id = $1`,
          [company_id]
        ),
        pool.query(
          'SELECT * FROM profit_loss_records WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1',
          [company_id]
        ),
        pool.query(
          'SELECT * FROM balance_sheets WHERE company_id = $1 ORDER BY as_of_date DESC LIMIT 1',
          [company_id]
        )
      ]);

      const pl = profitLoss.rows[0] || {};
      const bs = balanceSheet.rows[0] || {};
      const ocf = parseFloat(cashFlow.rows[0]?.operating_cf) || 0;

      // Estimate FCF = Operating Income * (1 - Tax Rate) + Depreciation - CapEx - Change in Working Capital
      // Simplified: use net income as proxy
      fcf = parseFloat(pl.net_income) || initial_fcf || 1000000;
    }

    // Calculate WACC (Weighted Average Cost of Capital)
    const costOfEquity = (risk_free_rate || 3) + (beta || 1.2) * (market_risk_premium || 5);
    const afterTaxCostOfDebt = (cost_of_debt || 5) * (1 - (tax_rate || 25) / 100);
    const wacc = (equity_weight || 70) / 100 * costOfEquity + (debt_weight || 30) / 100 * afterTaxCostOfDebt;

    // Project free cash flows
    const years = projection_years || 5;
    const projectedCashFlows = [];
    let currentFCF = fcf;

    for (let year = 1; year <= years; year++) {
      const growthRate = Array.isArray(growth_rates) && growth_rates[year - 1]
        ? growth_rates[year - 1]
        : (growth_rates || 10);

      currentFCF = currentFCF * (1 + growthRate / 100);
      const discountFactor = Math.pow(1 + wacc / 100, year);
      const presentValue = currentFCF / discountFactor;

      projectedCashFlows.push({
        year,
        fcf: currentFCF,
        growthRate,
        discountFactor,
        presentValue
      });
    }

    // Calculate Terminal Value using Gordon Growth Model
    const terminalGrowth = terminal_growth_rate || 2.5;
    const terminalFCF = currentFCF * (1 + terminalGrowth / 100);
    const terminalValue = terminalFCF / ((wacc - terminalGrowth) / 100);
    const terminalPV = terminalValue / Math.pow(1 + wacc / 100, years);

    // Sum of present values
    const sumOfPVs = projectedCashFlows.reduce((sum, cf) => sum + cf.presentValue, 0);
    const enterpriseValue = sumOfPVs + terminalPV;

    // Get debt and cash for equity value calculation
    let netDebt = 0;
    if (company_id) {
      const bsResult = await pool.query(
        'SELECT total_liabilities, current_assets FROM balance_sheets WHERE company_id = $1 ORDER BY as_of_date DESC LIMIT 1',
        [company_id]
      );
      if (bsResult.rows[0]) {
        const totalDebt = parseFloat(bsResult.rows[0].total_liabilities) || 0;
        const cash = parseFloat(bsResult.rows[0].current_assets) * 0.3 || 0; // Estimate cash as 30% of current assets
        netDebt = totalDebt - cash;
      }
    }

    const equityValue = enterpriseValue - netDebt;

    // Sensitivity analysis
    const sensitivityMatrix = calculateSensitivity(fcf, years, terminalGrowth, wacc, netDebt);

    // Save valuation
    const result = await pool.query(
      `INSERT INTO dcf_valuations
       (company_id, valuation_name, initial_fcf, projection_years, growth_rates, wacc, terminal_growth_rate,
        projected_cash_flows, terminal_value, enterprise_value, equity_value, sensitivity_matrix, assumptions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        company_id,
        valuation_name || 'DCF Valuation',
        fcf,
        years,
        JSON.stringify(growth_rates || [10, 10, 8, 8, 6]),
        wacc,
        terminalGrowth,
        JSON.stringify(projectedCashFlows),
        terminalValue,
        enterpriseValue,
        equityValue,
        JSON.stringify(sensitivityMatrix),
        JSON.stringify({
          risk_free_rate: risk_free_rate || 3,
          market_risk_premium: market_risk_premium || 5,
          beta: beta || 1.2,
          cost_of_debt: cost_of_debt || 5,
          tax_rate: tax_rate || 25,
          debt_weight: debt_weight || 30,
          equity_weight: equity_weight || 70,
          cost_of_equity: costOfEquity
        })
      ]
    );

    res.json({
      valuation: result.rows[0],
      summary: {
        initialFCF: fcf,
        projectedCashFlows,
        wacc,
        terminalValue,
        terminalPV,
        sumOfPVs,
        enterpriseValue,
        netDebt,
        equityValue,
        sensitivityMatrix
      }
    });
  } catch (error) {
    console.error('Error calculating DCF:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI-powered DCF analysis
router.post('/analyze', async (req, res) => {
  try {
    const { valuation_id, company_id, summary } = req.body;

    let valuation;
    if (valuation_id) {
      const result = await pool.query(
        'SELECT * FROM dcf_valuations WHERE id = $1',
        [valuation_id]
      );
      valuation = result.rows[0];
    }

    // Use summary from frontend if no valuation found
    if (!valuation && summary) {
      valuation = {
        initial_fcf: summary.initialFCF,
        projection_years: summary.projectedCashFlows?.length || 5,
        wacc: summary.wacc,
        terminal_growth_rate: 2.5,
        terminal_value: summary.terminalValue,
        enterprise_value: summary.enterpriseValue,
        equity_value: summary.equityValue,
        assumptions: {}
      };
    }

    let company = null;
    if (company_id) {
      const companyResult = await pool.query(
        'SELECT * FROM companies WHERE id = $1',
        [company_id]
      );
      company = companyResult.rows[0];
    }

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
          content: 'You are an expert financial analyst specializing in company valuation and DCF analysis.'
        },
        {
          role: 'user',
          content: `Analyze this DCF valuation for ${company?.name || 'the company'} (${company?.industry || 'Industry'}):

Initial Free Cash Flow: $${parseFloat(valuation?.initial_fcf)?.toLocaleString() || 'N/A'}
Projection Years: ${valuation?.projection_years || 5}
WACC: ${parseFloat(valuation?.wacc)?.toFixed(2) || 'N/A'}%
Terminal Growth Rate: ${parseFloat(valuation?.terminal_growth_rate)?.toFixed(2) || 'N/A'}%
Terminal Value: $${parseFloat(valuation?.terminal_value)?.toLocaleString() || 'N/A'}
Enterprise Value: $${parseFloat(valuation?.enterprise_value)?.toLocaleString() || 'N/A'}
Equity Value: $${parseFloat(valuation?.equity_value)?.toLocaleString() || 'N/A'}

Assumptions: ${JSON.stringify(valuation?.assumptions || {})}

Provide analysis as JSON with keys:
- valuationAssessment (string)
- keyDrivers (array)
- risks (array)
- assumptions_review (object with conservative, reasonable, aggressive ratings)
- recommendation (string)
- fairValueRange (object with low, mid, high)`
        }
      ],
      temperature: 0.3,
    });

    let analysis;
    try {
      const jsonMatch = response.choices[0].message.content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: response.choices[0].message.content };
    } catch {
      analysis = { raw: response.choices[0].message.content };
    }

    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing DCF:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single valuation
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT d.*, c.name as company_name
       FROM dcf_valuations d
       LEFT JOIN companies c ON d.company_id = c.id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Valuation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching valuation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete valuation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM dcf_valuations WHERE id = $1', [id]);
    res.json({ message: 'Valuation deleted successfully' });
  } catch (error) {
    console.error('Error deleting valuation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function for sensitivity analysis
function calculateSensitivity(initialFCF, years, terminalGrowth, baseWACC, netDebt) {
  const waccRange = [-2, -1, 0, 1, 2]; // WACC variations
  const growthRange = [-1, -0.5, 0, 0.5, 1]; // Terminal growth variations

  const matrix = [];

  for (const waccDelta of waccRange) {
    const row = [];
    const wacc = baseWACC + waccDelta;

    for (const growthDelta of growthRange) {
      const growth = terminalGrowth + growthDelta;

      // Simple DCF calculation
      let fcf = initialFCF;
      let pvSum = 0;

      for (let year = 1; year <= years; year++) {
        fcf = fcf * 1.08; // 8% average growth
        pvSum += fcf / Math.pow(1 + wacc / 100, year);
      }

      const terminalFCF = fcf * (1 + growth / 100);
      const terminalValue = terminalFCF / ((wacc - growth) / 100);
      const terminalPV = terminalValue / Math.pow(1 + wacc / 100, years);

      const enterpriseValue = pvSum + terminalPV;
      const equityValue = enterpriseValue - netDebt;

      row.push({
        wacc: wacc.toFixed(1),
        terminalGrowth: growth.toFixed(1),
        equityValue: Math.round(equityValue)
      });
    }

    matrix.push(row);
  }

  return {
    waccRange: waccRange.map(d => (baseWACC + d).toFixed(1)),
    growthRange: growthRange.map(d => (terminalGrowth + d).toFixed(1)),
    values: matrix
  };
}

module.exports = router;
