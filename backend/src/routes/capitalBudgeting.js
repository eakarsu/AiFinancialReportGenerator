const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all capital projects for a company
router.get('/projects', async (req, res) => {
  try {
    const { company_id } = req.query;
    let query = `
      SELECT cp.*, c.name as company_name
      FROM capital_projects cp
      LEFT JOIN companies c ON cp.company_id = c.id
    `;
    const params = [];

    if (company_id) {
      query += ' WHERE cp.company_id = $1';
      params.push(company_id);
    }

    query += ' ORDER BY cp.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Calculate NPV, IRR, Payback Period
router.post('/calculate', async (req, res) => {
  try {
    const {
      company_id,
      project_name,
      initial_investment,
      cash_flows, // Array of annual cash flows
      discount_rate,
      project_life,
      salvage_value,
      // Optional tax and depreciation
      tax_rate,
      depreciation_method // 'straight_line', 'declining_balance', 'macrs'
    } = req.body;

    const investment = initial_investment || 1000000;
    const rate = (discount_rate || 10) / 100;
    const years = project_life || cash_flows?.length || 5;
    const salvage = salvage_value || 0;
    const tax = (tax_rate || 25) / 100;

    // Generate cash flows if not provided
    let flows = cash_flows;
    if (!flows || flows.length === 0) {
      flows = Array(years).fill(investment * 0.25); // Default: 25% of investment per year
    }

    // Calculate depreciation
    const depreciation = calculateDepreciation(investment, salvage, years, depreciation_method || 'straight_line');

    // Calculate after-tax cash flows
    const afterTaxFlows = flows.map((cf, i) => {
      const taxableIncome = cf - depreciation[i];
      const taxes = taxableIncome > 0 ? taxableIncome * tax : 0;
      return cf - taxes;
    });

    // Add salvage value in final year
    afterTaxFlows[afterTaxFlows.length - 1] += salvage;

    // NPV Calculation
    let npv = -investment;
    const npvBreakdown = [];
    afterTaxFlows.forEach((cf, year) => {
      const discountFactor = Math.pow(1 + rate, year + 1);
      const pv = cf / discountFactor;
      npv += pv;
      npvBreakdown.push({
        year: year + 1,
        cashFlow: cf,
        discountFactor: discountFactor.toFixed(4),
        presentValue: pv
      });
    });

    // IRR Calculation (using Newton-Raphson method)
    const irr = calculateIRR([-investment, ...afterTaxFlows]);

    // Payback Period
    const paybackPeriod = calculatePaybackPeriod(investment, afterTaxFlows);

    // Discounted Payback Period
    const discountedPayback = calculateDiscountedPaybackPeriod(investment, afterTaxFlows, rate);

    // Profitability Index
    const totalPV = npvBreakdown.reduce((sum, item) => sum + item.presentValue, 0);
    const profitabilityIndex = totalPV / investment;

    // Modified IRR (MIRR)
    const mirr = calculateMIRR(investment, afterTaxFlows, rate, rate);

    // Equivalent Annual Annuity (EAA)
    const eaa = npv * (rate * Math.pow(1 + rate, years)) / (Math.pow(1 + rate, years) - 1);

    // Decision recommendation
    const decision = {
      npvPositive: npv > 0,
      irrAboveHurdle: irr > rate * 100,
      piAboveOne: profitabilityIndex > 1,
      recommendation: npv > 0 && irr > rate * 100 ? 'ACCEPT' : 'REJECT',
      strength: npv > investment * 0.2 && irr > rate * 100 * 1.5 ? 'STRONG' :
                npv > 0 && irr > rate * 100 ? 'MODERATE' : 'WEAK'
    };

    // Save project
    const result = await pool.query(
      `INSERT INTO capital_projects
       (company_id, project_name, initial_investment, cash_flows, discount_rate, project_life,
        salvage_value, npv, irr, mirr, payback_period, discounted_payback, profitability_index, eaa, decision)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        company_id,
        project_name || 'Capital Project',
        investment,
        JSON.stringify(afterTaxFlows),
        rate * 100,
        years,
        salvage,
        npv,
        irr,
        mirr,
        paybackPeriod,
        discountedPayback,
        profitabilityIndex,
        eaa,
        JSON.stringify(decision)
      ]
    );

    // Build cash flow analysis for the table
    let cumulativePV = -investment;
    const cashFlowAnalysis = npvBreakdown.map((item, idx) => {
      cumulativePV += item.presentValue;
      return {
        year: item.year,
        cashFlow: item.cashFlow,
        discountFactor: 1 / Math.pow(1 + rate, item.year),
        presentValue: item.presentValue,
        cumulativePV: cumulativePV
      };
    });

    res.json({
      project: {
        ...result.rows[0],
        name: project_name || 'Capital Project',
        initialInvestment: investment,
        cashFlows: afterTaxFlows,
        discountRate: rate * 100,
        projectLife: years
      },
      metrics: {
        npv: npv,
        irr: parseFloat(irr) / 100, // Convert to decimal for formatPercent
        mirr: parseFloat(mirr) / 100, // Convert to decimal for formatPercent
        paybackPeriod: paybackPeriod,
        discountedPayback: discountedPayback,
        profitabilityIndex: profitabilityIndex,
        eaa: eaa,
        decision: {
          accept: decision.recommendation === 'ACCEPT',
          recommendation: decision.recommendation,
          strength: decision.strength
        }
      },
      cashFlowAnalysis: cashFlowAnalysis,
      interpretations: {
        npv: npv > 0 ? 'Project adds value' : 'Project destroys value',
        irr: `${irr > rate * 100 ? 'Above' : 'Below'} hurdle rate of ${(rate * 100).toFixed(1)}%`,
        mirr: 'More realistic reinvestment assumption',
        paybackPeriod: `Recovers investment in ${paybackPeriod.toFixed(2)} years`,
        discountedPayback: `Time-adjusted payback: ${discountedPayback.toFixed(2)} years`,
        profitabilityIndex: `$${profitabilityIndex.toFixed(2)} return per $1 invested`,
        eaa: 'Annual equivalent value for comparison'
      }
    });
  } catch (error) {
    console.error('Error calculating capital budget:', error);
    res.status(500).json({ error: error.message });
  }
});

// Compare multiple projects
router.post('/compare', async (req, res) => {
  try {
    const { project_ids, company_id, projects_data } = req.body;

    let projects = [];

    if (project_ids && project_ids.length > 0) {
      const result = await pool.query(
        'SELECT * FROM capital_projects WHERE id = ANY($1)',
        [project_ids]
      );
      projects = result.rows;
    } else if (projects_data) {
      // Calculate metrics for provided projects
      projects = projects_data.map(p => {
        const rate = (p.discount_rate || 10) / 100;
        const npv = calculateNPV(p.initial_investment, p.cash_flows, rate);
        const irr = calculateIRR([-p.initial_investment, ...p.cash_flows]);

        return {
          project_name: p.project_name,
          initial_investment: p.initial_investment,
          npv,
          irr,
          payback_period: calculatePaybackPeriod(p.initial_investment, p.cash_flows),
          profitability_index: calculatePI(p.initial_investment, p.cash_flows, rate)
        };
      });
    }

    // Rank projects
    const rankings = {
      byNPV: [...projects].sort((a, b) => b.npv - a.npv),
      byIRR: [...projects].sort((a, b) => b.irr - a.irr),
      byPI: [...projects].sort((a, b) => b.profitability_index - a.profitability_index),
      byPayback: [...projects].sort((a, b) => a.payback_period - b.payback_period)
    };

    // Capital rationing analysis (if budget constraint exists)
    const budgetConstraint = req.body.budget_constraint;
    let optimalPortfolio = null;

    if (budgetConstraint) {
      optimalPortfolio = selectOptimalProjects(projects, budgetConstraint);
    }

    res.json({
      projects,
      rankings,
      optimalPortfolio,
      recommendation: rankings.byNPV[0]?.project_name || 'No clear winner'
    });
  } catch (error) {
    console.error('Error comparing projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sensitivity analysis for a project
router.post('/sensitivity', async (req, res) => {
  try {
    const {
      initial_investment,
      base_cash_flow,
      discount_rate,
      project_life,
      // Variables to test
      variables // { investment: [-20, -10, 0, 10, 20], cash_flow: [...], discount_rate: [...] }
    } = req.body;

    const baseRate = (discount_rate || 10) / 100;
    const years = project_life || 5;
    const baseCF = base_cash_flow || initial_investment * 0.25;

    const results = {};

    // Investment sensitivity
    if (variables?.investment) {
      results.investment = variables.investment.map(change => {
        const newInvestment = initial_investment * (1 + change / 100);
        const flows = Array(years).fill(baseCF);
        const npv = calculateNPV(newInvestment, flows, baseRate);
        return { change, investment: newInvestment, npv };
      });
    }

    // Cash flow sensitivity
    if (variables?.cash_flow) {
      results.cashFlow = variables.cash_flow.map(change => {
        const newCF = baseCF * (1 + change / 100);
        const flows = Array(years).fill(newCF);
        const npv = calculateNPV(initial_investment, flows, baseRate);
        return { change, cashFlow: newCF, npv };
      });
    }

    // Discount rate sensitivity
    if (variables?.discount_rate) {
      results.discountRate = variables.discount_rate.map(change => {
        const newRate = (discount_rate + change) / 100;
        const flows = Array(years).fill(baseCF);
        const npv = calculateNPV(initial_investment, flows, newRate);
        return { change, discountRate: discount_rate + change, npv };
      });
    }

    // Tornado chart data (sorted by impact)
    const tornadoData = [];

    if (results.investment) {
      const range = Math.max(...results.investment.map(r => r.npv)) - Math.min(...results.investment.map(r => r.npv));
      tornadoData.push({ variable: 'Investment', range, low: Math.min(...results.investment.map(r => r.npv)), high: Math.max(...results.investment.map(r => r.npv)) });
    }

    if (results.cashFlow) {
      const range = Math.max(...results.cashFlow.map(r => r.npv)) - Math.min(...results.cashFlow.map(r => r.npv));
      tornadoData.push({ variable: 'Cash Flow', range, low: Math.min(...results.cashFlow.map(r => r.npv)), high: Math.max(...results.cashFlow.map(r => r.npv)) });
    }

    if (results.discountRate) {
      const range = Math.max(...results.discountRate.map(r => r.npv)) - Math.min(...results.discountRate.map(r => r.npv));
      tornadoData.push({ variable: 'Discount Rate', range, low: Math.min(...results.discountRate.map(r => r.npv)), high: Math.max(...results.discountRate.map(r => r.npv)) });
    }

    tornadoData.sort((a, b) => b.range - a.range);

    res.json({
      sensitivity: results,
      tornadoChart: tornadoData,
      mostSensitiveVariable: tornadoData[0]?.variable || 'Unknown'
    });
  } catch (error) {
    console.error('Error in sensitivity analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single project
router.get('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT cp.*, c.name as company_name
       FROM capital_projects cp
       LEFT JOIN companies c ON cp.company_id = c.id
       WHERE cp.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete project
router.delete('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM capital_projects WHERE id = $1', [id]);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI Analysis for capital budgeting
router.post('/analyze', async (req, res) => {
  try {
    const { project, metrics, inputs } = req.body;

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
          content: 'You are a financial analyst expert in capital budgeting and investment analysis. Provide actionable insights.'
        },
        {
          role: 'user',
          content: `Analyze this capital budgeting project and provide recommendations:

Project: ${inputs?.project_name || 'Investment Project'}
Initial Investment: $${inputs?.initial_investment?.toLocaleString()}
Project Life: ${inputs?.project_life} years
Discount Rate: ${inputs?.discount_rate}%

Key Metrics:
- NPV: $${metrics?.npv?.toLocaleString()}
- IRR: ${(metrics?.irr * 100)?.toFixed(2)}%
- MIRR: ${(metrics?.mirr * 100)?.toFixed(2)}%
- Payback Period: ${metrics?.paybackPeriod?.toFixed(2)} years
- Discounted Payback: ${metrics?.discountedPayback?.toFixed(2)} years
- Profitability Index: ${metrics?.profitabilityIndex?.toFixed(3)}

Decision: ${metrics?.decision?.recommendation} (${metrics?.decision?.strength})

Provide analysis as JSON with these exact keys:
{
  "summary": "Brief overall assessment",
  "strengths": ["strength1", "strength2"],
  "risks": ["risk1", "risk2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "sensitivityFactors": ["factor1", "factor2"],
  "alternativeConsiderations": "What else to consider"
}`
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

    res.json(aiAnalysis);
  } catch (error) {
    console.error('Error in AI analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
function calculateDepreciation(cost, salvage, years, method) {
  const depreciableAmount = cost - salvage;
  const depreciation = [];

  switch (method) {
    case 'declining_balance':
      let bookValue = cost;
      const rate = 2 / years; // Double declining
      for (let i = 0; i < years; i++) {
        const dep = Math.min(bookValue * rate, bookValue - salvage);
        depreciation.push(dep);
        bookValue -= dep;
      }
      break;

    case 'macrs':
      // 5-year MACRS rates
      const macrsRates = [0.20, 0.32, 0.192, 0.1152, 0.1152, 0.0576];
      for (let i = 0; i < years; i++) {
        depreciation.push(cost * (macrsRates[i] || macrsRates[macrsRates.length - 1]));
      }
      break;

    default: // straight_line
      const annualDep = depreciableAmount / years;
      for (let i = 0; i < years; i++) {
        depreciation.push(annualDep);
      }
  }

  return depreciation;
}

function calculateNPV(investment, cashFlows, rate) {
  let npv = -investment;
  cashFlows.forEach((cf, year) => {
    npv += cf / Math.pow(1 + rate, year + 1);
  });
  return npv;
}

function calculateIRR(cashFlows, guess = 0.1) {
  const maxIterations = 1000;
  const tolerance = 0.0001;

  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let derivative = 0;

    cashFlows.forEach((cf, year) => {
      npv += cf / Math.pow(1 + rate, year);
      derivative -= year * cf / Math.pow(1 + rate, year + 1);
    });

    const newRate = rate - npv / derivative;

    if (Math.abs(newRate - rate) < tolerance) {
      return (newRate * 100).toFixed(2);
    }

    rate = newRate;
  }

  return (rate * 100).toFixed(2);
}

function calculateMIRR(investment, cashFlows, financeRate, reinvestRate) {
  const n = cashFlows.length;

  // Future value of positive cash flows
  let fv = 0;
  cashFlows.forEach((cf, year) => {
    if (cf > 0) {
      fv += cf * Math.pow(1 + reinvestRate, n - year - 1);
    }
  });

  // Present value of negative cash flows
  let pv = investment;
  cashFlows.forEach((cf, year) => {
    if (cf < 0) {
      pv += Math.abs(cf) / Math.pow(1 + financeRate, year + 1);
    }
  });

  const mirr = Math.pow(fv / pv, 1 / n) - 1;
  return (mirr * 100).toFixed(2);
}

function calculatePaybackPeriod(investment, cashFlows) {
  let cumulative = 0;

  for (let i = 0; i < cashFlows.length; i++) {
    cumulative += cashFlows[i];
    if (cumulative >= investment) {
      // Interpolate for partial year
      const excessCF = cumulative - investment;
      const partialYear = excessCF / cashFlows[i];
      return i + 1 - partialYear;
    }
  }

  return cashFlows.length + 1; // Never pays back
}

function calculateDiscountedPaybackPeriod(investment, cashFlows, rate) {
  let cumulative = 0;

  for (let i = 0; i < cashFlows.length; i++) {
    const pv = cashFlows[i] / Math.pow(1 + rate, i + 1);
    cumulative += pv;
    if (cumulative >= investment) {
      const excessPV = cumulative - investment;
      const partialYear = excessPV / pv;
      return i + 1 - partialYear;
    }
  }

  return cashFlows.length + 1;
}

function calculatePI(investment, cashFlows, rate) {
  let totalPV = 0;
  cashFlows.forEach((cf, year) => {
    totalPV += cf / Math.pow(1 + rate, year + 1);
  });
  return totalPV / investment;
}

function selectOptimalProjects(projects, budget) {
  // Simple greedy algorithm based on PI
  const sorted = [...projects]
    .filter(p => p.initial_investment <= budget)
    .sort((a, b) => b.profitability_index - a.profitability_index);

  const selected = [];
  let remaining = budget;
  let totalNPV = 0;

  for (const project of sorted) {
    if (project.initial_investment <= remaining) {
      selected.push(project);
      remaining -= project.initial_investment;
      totalNPV += project.npv;
    }
  }

  return {
    selectedProjects: selected,
    totalInvestment: budget - remaining,
    totalNPV,
    remainingBudget: remaining
  };
}

module.exports = router;
