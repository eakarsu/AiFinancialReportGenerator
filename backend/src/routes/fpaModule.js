// FP&A module: financial planning and analysis workflows, multi-scenario.
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// POST /api/fpa/budget-build { company_id, period, assumptions:{revenue_growth_pct, opex_growth_pct, capex_usd} }
router.post('/budget-build', async (req, res) => {
  try {
    const { company_id, period, assumptions = {} } = req.body || {};
    if (!company_id) return res.status(400).json({ error: 'company_id required' });
    const baseline = await pool.query(`SELECT revenue, operating_expense FROM profit_loss WHERE company_id = $1 ORDER BY reporting_date DESC LIMIT 1`, [company_id]).catch(() => ({ rows: [{}] }));
    const lastRev = Number(baseline.rows[0]?.revenue || 0);
    const lastOpex = Number(baseline.rows[0]?.operating_expense || 0);
    const projection = {
      revenue: Math.round(lastRev * (1 + Number(assumptions.revenue_growth_pct || 0.1))),
      opex: Math.round(lastOpex * (1 + Number(assumptions.opex_growth_pct || 0.05))),
      capex: Number(assumptions.capex_usd || 0),
    };
    projection.operating_income = projection.revenue - projection.opex;
    projection.fcf_estimate = projection.operating_income - projection.capex;
    try { await pool.query(`INSERT INTO budget_actuals (company_id, period, budget, created_at) VALUES ($1,$2,$3,NOW())`, [company_id, period || null, JSON.stringify(projection)]); } catch {}
    return res.json({ company_id, period: period || null, assumptions, projection });
  } catch (e) {
    return res.status(500).json({ error: 'budget-build failed' });
  }
});

// POST /api/fpa/scenarios { company_id, scenarios:[{name, assumptions}] }
router.post('/scenarios', async (req, res) => {
  const { scenarios = [] } = req.body || {};
  const results = scenarios.map(s => ({ name: s.name, assumptions: s.assumptions, ...s.assumptions }));
  return res.json({ scenarios: results });
});

module.exports = router;
