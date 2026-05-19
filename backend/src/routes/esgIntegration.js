// ESG integration: link financial metrics to ESG performance.
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/esg-integration/:company_id
router.get('/:company_id', async (req, res) => {
  try {
    const { company_id } = req.params;
    const pl = await pool.query(`SELECT revenue, operating_expense FROM profit_loss WHERE company_id = $1 ORDER BY reporting_date DESC LIMIT 1`, [company_id]).catch(() => ({ rows: [{}] }));
    const esg = await pool.query(`SELECT * FROM esg_metrics WHERE company_id = $1 ORDER BY reporting_date DESC LIMIT 1`, [company_id]).catch(() => ({ rows: [{}] }));
    const rev = Number(pl.rows[0]?.revenue || 0);
    const e = esg.rows[0] || {};
    return res.json({
      company_id,
      revenue: rev,
      esg_metrics: e,
      co2_intensity_t_per_$m: rev ? Math.round((Number(e.scope1_2_co2_t || 0) / (rev / 1e6)) * 100) / 100 : null,
      women_in_leadership_pct: Number(e.women_in_leadership_pct || 0),
      employee_turnover_pct: Number(e.employee_turnover_pct || 0),
      board_independence_pct: Number(e.board_independence_pct || 0),
    });
  } catch (err) {
    return res.status(500).json({ error: 'esg integration failed' });
  }
});

module.exports = router;
