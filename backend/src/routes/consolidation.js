// Consolidation: multi-subsidiary consolidation, eliminate intercompany.
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// POST /api/consolidation/run { parent_company_id, period }
router.post('/run', async (req, res) => {
  try {
    const { parent_company_id, period } = req.body || {};
    if (!parent_company_id) return res.status(400).json({ error: 'parent_company_id required' });
    const subs = await pool.query(`SELECT id FROM companies WHERE parent_id = $1`, [parent_company_id]).catch(() => ({ rows: [] }));
    const allIds = [parent_company_id, ...subs.rows.map(s => s.id)];
    const pl = await pool.query(`SELECT company_id, revenue, operating_expense FROM profit_loss WHERE company_id = ANY($1) ORDER BY reporting_date DESC`, [allIds]).catch(() => ({ rows: [] }));
    let totalRev = 0, totalOpex = 0;
    for (const row of pl.rows) { totalRev += Number(row.revenue || 0); totalOpex += Number(row.operating_expense || 0); }
    const intercompany = await pool.query(`SELECT SUM(amount) AS total FROM intercompany_transactions WHERE seller_id = ANY($1) AND buyer_id = ANY($1)`, [allIds]).catch(() => ({ rows: [{ total: 0 }] }));
    const elim = Number(intercompany.rows[0]?.total || 0);
    return res.json({
      parent_company_id,
      period: period || null,
      subsidiaries: subs.rows.length,
      gross_revenue: Math.round(totalRev),
      intercompany_elimination: Math.round(elim),
      consolidated_revenue: Math.round(totalRev - elim),
      consolidated_opex: Math.round(totalOpex),
    });
  } catch (e) {
    return res.status(500).json({ error: 'consolidation failed' });
  }
});

module.exports = router;
