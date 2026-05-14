// Agentic CFO: "I have a board meeting in 2 days" → generates board package.
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

async function callLLM(messages) {
  const key = process.env.OPENROUTER_API_KEY; // TODO: configure credentials
  if (!key) return null;
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022', messages, max_tokens: 2500 }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.choices?.[0]?.message?.content;
}

// POST /api/agentic-cfo/board-package { company_id, period }
router.post('/board-package', async (req, res) => {
  try {
    const { company_id, period } = req.body || {};
    if (!company_id) return res.status(400).json({ error: 'company_id required' });
    const pl = await pool.query(`SELECT * FROM profit_loss WHERE company_id = $1 ORDER BY reporting_date DESC LIMIT 4`, [company_id]).catch(() => ({ rows: [] }));
    const cf = await pool.query(`SELECT * FROM cash_flow WHERE company_id = $1 ORDER BY reporting_date DESC LIMIT 4`, [company_id]).catch(() => ({ rows: [] }));
    const kpis = await pool.query(`SELECT * FROM kpi_metrics WHERE company_id = $1 ORDER BY reporting_date DESC LIMIT 20`, [company_id]).catch(() => ({ rows: [] }));
    const system = 'Compose a board-package summary. Output JSON {"highlights":["..."],"variances":[{"line":"...","delta_pct":num}],"risks":["..."],"recommendations":["..."]}.';
    const raw = await callLLM([
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify({ period, pl: pl.rows, cf: cf.rows, kpis: kpis.rows }).slice(0, 8000) },
    ]);
    if (!raw) return res.status(503).json({ error: 'OPENROUTER_API_KEY missing' });
    let parsed;
    try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw); } catch { parsed = { raw }; }
    return res.json({ company_id, period: period || null, board_package: parsed });
  } catch (e) {
    return res.status(500).json({ error: 'board-package failed' });
  }
});

module.exports = router;
