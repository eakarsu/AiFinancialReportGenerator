// Predictive cash flow: forecast cash position based on AR/AP aging.
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/predictive-cash-flow/:company_id?weeks=13
router.get('/:company_id', async (req, res) => {
  try {
    const { company_id } = req.params;
    const weeks = Math.min(parseInt(req.query.weeks) || 13, 52);
    const cf = await pool.query(`SELECT current_cash FROM cash_flow WHERE company_id = $1 ORDER BY reporting_date DESC LIMIT 1`, [company_id]).catch(() => ({ rows: [] }));
    const ar = await pool.query(`SELECT due_date, amount FROM accounts_receivable WHERE company_id = $1 AND status = 'open'`, [company_id]).catch(() => ({ rows: [] }));
    const ap = await pool.query(`SELECT due_date, amount FROM accounts_payable WHERE company_id = $1 AND status = 'open'`, [company_id]).catch(() => ({ rows: [] }));

    let cash = Number(cf.rows[0]?.current_cash || 0);
    const projection = [];
    const now = new Date();
    for (let w = 0; w < weeks; w++) {
      const weekStart = new Date(now.getTime() + w * 7 * 86400000);
      const weekEnd = new Date(now.getTime() + (w + 1) * 7 * 86400000);
      const inflow = ar.rows.filter(r => new Date(r.due_date) >= weekStart && new Date(r.due_date) < weekEnd).reduce((a, b) => a + Number(b.amount), 0) * 0.9;
      const outflow = ap.rows.filter(r => new Date(r.due_date) >= weekStart && new Date(r.due_date) < weekEnd).reduce((a, b) => a + Number(b.amount), 0);
      cash = cash + inflow - outflow;
      projection.push({ week: w + 1, week_start: weekStart.toISOString().slice(0, 10), inflow: Math.round(inflow), outflow: Math.round(outflow), projected_cash: Math.round(cash) });
    }
    return res.json({ company_id, weeks, projection });
  } catch (e) {
    return res.status(500).json({ error: 'cash flow failed' });
  }
});

module.exports = router;
