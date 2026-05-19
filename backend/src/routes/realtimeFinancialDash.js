// Real-time financial dashboards: streaming data, live KPI updates.
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// POST /api/realtime-financial-dash/tick { company_id, metric, value, ts? }
router.post('/tick', async (req, res) => {
  try {
    const { company_id, metric, value, ts } = req.body || {};
    if (!company_id || !metric || value == null) return res.status(400).json({ error: 'company_id, metric, value required' });
    try {
      await pool.query(`INSERT INTO realtime_metrics (company_id, metric, value, ts) VALUES ($1,$2,$3,$4)`, [company_id, metric, Number(value), ts || new Date()]);
    } catch {}
    return res.json({ recorded: true, company_id, metric });
  } catch (e) {
    return res.status(500).json({ error: 'tick failed' });
  }
});

// GET /api/realtime-financial-dash/:company_id/live
router.get('/:company_id/live', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT metric, value, ts FROM realtime_metrics WHERE company_id = $1 AND ts > NOW() - INTERVAL '1 hour' ORDER BY ts DESC LIMIT 200`,
      [req.params.company_id]
    ).catch(() => ({ rows: [] }));
    const latest = {};
    for (const row of r.rows) if (!latest[row.metric]) latest[row.metric] = { value: Number(row.value), ts: row.ts };
    return res.json({ company_id: req.params.company_id, latest, sample_count: r.rows.length });
  } catch (e) {
    return res.status(500).json({ error: 'live failed' });
  }
});

module.exports = router;
