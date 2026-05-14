// Audit support: auto-generate audit schedules, workpapers, findings.
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// POST /api/audit-support/schedule { company_id, period, areas:["revenue","cash","ar","ap","equity"] }
router.post('/schedule', async (req, res) => {
  try {
    const { company_id, period, areas = ['revenue', 'cash', 'ar', 'ap', 'equity'] } = req.body || {};
    if (!company_id) return res.status(400).json({ error: 'company_id required' });
    const items = areas.map(a => ({ area: a, status: 'planned', deadline: null, workpaper_url: null }));
    try {
      const r = await pool.query(`INSERT INTO audit_schedules (company_id, period, items, created_at) VALUES ($1,$2,$3,NOW()) RETURNING id`, [company_id, period || null, JSON.stringify(items)]);
      return res.json({ id: r.rows[0].id, company_id, period, count: items.length });
    } catch (e) {
      return res.status(500).json({ error: 'audit_schedules table missing' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'schedule failed' });
  }
});

// GET /api/audit-support/findings/:company_id?period=2024-Q4
router.get('/findings/:company_id', async (req, res) => {
  try {
    const anomalies = await pool.query(`SELECT * FROM anomaly_detections WHERE company_id = $1 ORDER BY detected_at DESC LIMIT 50`, [req.params.company_id]).catch(() => ({ rows: [] }));
    const findings = anomalies.rows.map(a => ({ id: a.id, area: a.area || 'general', severity: a.severity, description: a.description }));
    return res.json({ company_id: req.params.company_id, findings });
  } catch (e) {
    return res.status(500).json({ error: 'findings failed' });
  }
});

module.exports = router;
