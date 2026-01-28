const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all simulations for a company
router.get('/', async (req, res) => {
  try {
    const { company_id } = req.query;
    let query = `
      SELECT m.*, c.name as company_name
      FROM monte_carlo_simulations m
      LEFT JOIN companies c ON m.company_id = c.id
    `;
    const params = [];

    if (company_id) {
      query += ' WHERE m.company_id = $1';
      params.push(company_id);
    }

    query += ' ORDER BY m.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching simulations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Run Monte Carlo simulation
router.post('/run', async (req, res) => {
  try {
    const {
      company_id,
      simulation_name,
      simulation_type, // 'revenue', 'profit', 'cash_flow', 'valuation'
      num_simulations,
      // Variable distributions
      variables,
      // Time horizon
      projection_years
    } = req.body;

    const iterations = num_simulations || 10000;
    const years = projection_years || 5;

    // Default variable distributions if not provided
    const vars = variables || {
      revenue_growth: { mean: 10, std: 5, min: -10, max: 30 },
      cost_ratio: { mean: 65, std: 5, min: 50, max: 80 },
      operating_expense_growth: { mean: 5, std: 3, min: -5, max: 15 },
      discount_rate: { mean: 10, std: 2, min: 6, max: 15 }
    };

    // Get base values from company data
    let baseValues = {
      revenue: 1000000,
      costs: 650000,
      operatingExpenses: 200000
    };

    if (company_id) {
      const plResult = await pool.query(
        'SELECT * FROM profit_loss_records WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1',
        [company_id]
      );
      if (plResult.rows[0]) {
        const pl = plResult.rows[0];
        baseValues = {
          revenue: parseFloat(pl.revenue) || 1000000,
          costs: parseFloat(pl.cost_of_goods_sold) || 650000,
          operatingExpenses: parseFloat(pl.operating_expenses) || 200000
        };
      }
    }

    // Run simulations
    const results = [];
    const finalValues = {
      revenue: [],
      netIncome: [],
      profitMargin: [],
      npv: []
    };

    for (let i = 0; i < iterations; i++) {
      const simulation = runSingleSimulation(baseValues, vars, years);
      results.push(simulation);

      finalValues.revenue.push(simulation.finalRevenue);
      finalValues.netIncome.push(simulation.finalNetIncome);
      finalValues.profitMargin.push(simulation.finalProfitMargin);
      finalValues.npv.push(simulation.npv);
    }

    // Calculate statistics
    const statistics = {
      revenue: calculateStatistics(finalValues.revenue),
      netIncome: calculateStatistics(finalValues.netIncome),
      profitMargin: calculateStatistics(finalValues.profitMargin),
      npv: calculateStatistics(finalValues.npv)
    };

    // Calculate percentiles
    const percentiles = {
      revenue: calculatePercentiles(finalValues.revenue),
      netIncome: calculatePercentiles(finalValues.netIncome),
      npv: calculatePercentiles(finalValues.npv)
    };

    // Create histogram data
    const histograms = {
      revenue: createHistogram(finalValues.revenue, 50),
      netIncome: createHistogram(finalValues.netIncome, 50),
      npv: createHistogram(finalValues.npv, 50)
    };

    // Calculate probability of outcomes
    const probabilities = {
      profitProbability: finalValues.netIncome.filter(v => v > 0).length / iterations * 100,
      positiveNPVProbability: finalValues.npv.filter(v => v > 0).length / iterations * 100,
      targetRevenueProbability: finalValues.revenue.filter(v => v > baseValues.revenue * Math.pow(1.1, years)).length / iterations * 100
    };

    // Value at Risk (VaR)
    const sortedNetIncome = [...finalValues.netIncome].sort((a, b) => a - b);
    const var95 = sortedNetIncome[Math.floor(iterations * 0.05)];
    const var99 = sortedNetIncome[Math.floor(iterations * 0.01)];

    // Save simulation
    const result = await pool.query(
      `INSERT INTO monte_carlo_simulations
       (company_id, simulation_name, simulation_type, num_simulations, variables, projection_years,
        statistics, percentiles, probabilities, var_95, var_99)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        company_id,
        simulation_name || 'Monte Carlo Simulation',
        simulation_type || 'profit',
        iterations,
        JSON.stringify(vars),
        years,
        JSON.stringify(statistics),
        JSON.stringify(percentiles),
        JSON.stringify(probabilities),
        var95,
        var99
      ]
    );

    res.json({
      simulation: result.rows[0],
      summary: {
        iterations,
        years,
        baseValues,
        statistics,
        percentiles,
        probabilities,
        riskMetrics: {
          var95,
          var99,
          expectedShortfall: calculateExpectedShortfall(sortedNetIncome, 0.05)
        },
        histograms
      }
    });
  } catch (error) {
    console.error('Error running simulation:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI analysis of simulation results
router.post('/analyze', async (req, res) => {
  try {
    const { simulation_id, company_id } = req.body;

    let simulation;
    if (simulation_id) {
      const result = await pool.query(
        'SELECT * FROM monte_carlo_simulations WHERE id = $1',
        [simulation_id]
      );
      simulation = result.rows[0];
    }

    const companyResult = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [company_id]
    );
    const company = companyResult.rows[0];

    const stats = typeof simulation?.statistics === 'string'
      ? JSON.parse(simulation.statistics)
      : simulation?.statistics || {};
    const probs = typeof simulation?.probabilities === 'string'
      ? JSON.parse(simulation.probabilities)
      : simulation?.probabilities || {};

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
          content: 'You are an expert financial risk analyst specializing in Monte Carlo simulation interpretation.'
        },
        {
          role: 'user',
          content: `Analyze this Monte Carlo simulation for ${company?.name || 'the company'}:

Simulation: ${typeof simulation?.num_simulations === 'number' ? simulation.num_simulations.toLocaleString() : '10,000'} iterations over ${simulation?.projection_years || 5} years

Net Income Statistics:
- Mean: $${typeof stats.netIncome?.mean === 'number' ? stats.netIncome.mean.toLocaleString() : 'N/A'}
- Median: $${typeof stats.netIncome?.median === 'number' ? stats.netIncome.median.toLocaleString() : 'N/A'}
- Std Dev: $${typeof stats.netIncome?.stdDev === 'number' ? stats.netIncome.stdDev.toLocaleString() : 'N/A'}
- Min: $${typeof stats.netIncome?.min === 'number' ? stats.netIncome.min.toLocaleString() : 'N/A'}
- Max: $${typeof stats.netIncome?.max === 'number' ? stats.netIncome.max.toLocaleString() : 'N/A'}

Probabilities:
- Probability of Profit: ${typeof probs.profitProbability === 'number' ? probs.profitProbability.toFixed(1) : 'N/A'}%
- Positive NPV Probability: ${typeof probs.positiveNPVProbability === 'number' ? probs.positiveNPVProbability.toFixed(1) : 'N/A'}%

Risk Metrics:
- VaR (95%): $${typeof simulation?.var_95 === 'number' ? simulation.var_95.toLocaleString() : (simulation?.var_95 || 'N/A')}
- VaR (99%): $${typeof simulation?.var_99 === 'number' ? simulation.var_99.toLocaleString() : (simulation?.var_99 || 'N/A')}

Provide analysis as JSON with keys:
- riskAssessment (string: low/medium/high/very_high)
- keyFindings (array of strings)
- riskFactors (array of objects with factor and impact)
- opportunities (array)
- recommendations (array)
- confidenceLevel (string)`
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
    console.error('Error analyzing simulation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single simulation
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT m.*, c.name as company_name
       FROM monte_carlo_simulations m
       LEFT JOIN companies c ON m.company_id = c.id
       WHERE m.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Simulation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching simulation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete simulation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM monte_carlo_simulations WHERE id = $1', [id]);
    res.json({ message: 'Simulation deleted successfully' });
  } catch (error) {
    console.error('Error deleting simulation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
function generateNormalRandom(mean, std) {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

function generateBoundedNormalRandom(mean, std, min, max) {
  let value;
  do {
    value = generateNormalRandom(mean, std);
  } while (value < min || value > max);
  return value;
}

function runSingleSimulation(baseValues, vars, years) {
  let revenue = baseValues.revenue;
  let costs = baseValues.costs;
  let opExpenses = baseValues.operatingExpenses;
  const yearlyResults = [];
  let totalPV = 0;

  for (let year = 1; year <= years; year++) {
    // Generate random values for this year
    const revenueGrowth = generateBoundedNormalRandom(
      vars.revenue_growth.mean,
      vars.revenue_growth.std,
      vars.revenue_growth.min,
      vars.revenue_growth.max
    );

    const costRatio = generateBoundedNormalRandom(
      vars.cost_ratio.mean,
      vars.cost_ratio.std,
      vars.cost_ratio.min,
      vars.cost_ratio.max
    );

    const opExpenseGrowth = generateBoundedNormalRandom(
      vars.operating_expense_growth.mean,
      vars.operating_expense_growth.std,
      vars.operating_expense_growth.min,
      vars.operating_expense_growth.max
    );

    const discountRate = generateBoundedNormalRandom(
      vars.discount_rate.mean,
      vars.discount_rate.std,
      vars.discount_rate.min,
      vars.discount_rate.max
    );

    // Calculate values
    revenue = revenue * (1 + revenueGrowth / 100);
    costs = revenue * (costRatio / 100);
    opExpenses = opExpenses * (1 + opExpenseGrowth / 100);

    const grossProfit = revenue - costs;
    const operatingIncome = grossProfit - opExpenses;
    const netIncome = operatingIncome * 0.75; // After 25% tax

    // Present value
    const pv = netIncome / Math.pow(1 + discountRate / 100, year);
    totalPV += pv;

    yearlyResults.push({
      year,
      revenue,
      costs,
      grossProfit,
      operatingIncome,
      netIncome,
      presentValue: pv
    });
  }

  const finalYear = yearlyResults[yearlyResults.length - 1];

  return {
    yearlyResults,
    finalRevenue: finalYear.revenue,
    finalNetIncome: finalYear.netIncome,
    finalProfitMargin: (finalYear.netIncome / finalYear.revenue) * 100,
    npv: totalPV
  };
}

function calculateStatistics(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;

  return {
    mean: Math.round(mean),
    median: Math.round(sorted[Math.floor(n / 2)]),
    stdDev: Math.round(Math.sqrt(variance)),
    min: Math.round(sorted[0]),
    max: Math.round(sorted[n - 1]),
    skewness: calculateSkewness(values, mean, Math.sqrt(variance))
  };
}

function calculateSkewness(values, mean, stdDev) {
  const n = values.length;
  const sum = values.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0);
  return (sum / n).toFixed(3);
}

function calculatePercentiles(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = values.length;

  return {
    p5: Math.round(sorted[Math.floor(n * 0.05)]),
    p10: Math.round(sorted[Math.floor(n * 0.10)]),
    p25: Math.round(sorted[Math.floor(n * 0.25)]),
    p50: Math.round(sorted[Math.floor(n * 0.50)]),
    p75: Math.round(sorted[Math.floor(n * 0.75)]),
    p90: Math.round(sorted[Math.floor(n * 0.90)]),
    p95: Math.round(sorted[Math.floor(n * 0.95)])
  };
}

function calculateExpectedShortfall(sortedValues, alpha) {
  const cutoff = Math.floor(sortedValues.length * alpha);
  const tailValues = sortedValues.slice(0, cutoff);
  return Math.round(tailValues.reduce((a, b) => a + b, 0) / tailValues.length);
}

function createHistogram(values, bins) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binWidth = (max - min) / bins;

  const histogram = Array(bins).fill(0).map((_, i) => ({
    binStart: min + i * binWidth,
    binEnd: min + (i + 1) * binWidth,
    count: 0,
    frequency: 0
  }));

  values.forEach(value => {
    const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1);
    histogram[binIndex].count++;
  });

  histogram.forEach(bin => {
    bin.frequency = (bin.count / values.length) * 100;
  });

  return histogram;
}

module.exports = router;
