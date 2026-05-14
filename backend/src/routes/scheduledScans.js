const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// Ensure the scheduled_scans table exists exactly once (not on every request).
let initPromise = null;
function ensureTable() {
  if (initPromise) return initPromise;
  initPromise = pool.query(`
    CREATE TABLE IF NOT EXISTS scheduled_scans (
      id SERIAL PRIMARY KEY,
      scan_type VARCHAR(100) NOT NULL,
      frequency VARCHAR(50) NOT NULL DEFAULT 'weekly',
      company_id INTEGER,
      last_run TIMESTAMP,
      next_run TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE,
      created_by INTEGER,
      result_summary JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS scheduled_scans_active_idx ON scheduled_scans(is_active, next_run);
  `);
  return initPromise;
}
// Kick off init at module load (best effort).
ensureTable().catch((e) => console.warn('scheduled_scans init failed:', e.message));

// POST /api/anomalies/schedule-scan
router.post('/schedule-scan', authMiddleware, async (req, res) => {
  try {
    const { scan_type, frequency, company_id } = req.body;

    if (!scan_type) {
      return res.status(400).json({ error: 'scan_type is required' });
    }

    const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly'];
    const chosenFrequency = frequency || 'weekly';
    if (!validFrequencies.includes(chosenFrequency)) {
      return res.status(400).json({
        error: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`,
      });
    }

    // Compute initial next_run based on frequency.
    const nextRun = computeNextRun(chosenFrequency, new Date());

    const result = await pool.query(
      `INSERT INTO scheduled_scans (scan_type, frequency, company_id, created_by, next_run)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [scan_type, chosenFrequency, company_id || null, req.user?.id || null, nextRun]
    );

    res.status(201).json({
      success: true,
      scan: result.rows[0],
      message: `Anomaly scan scheduled to run ${chosenFrequency}.`,
    });
  } catch (error) {
    console.error('Schedule scan error:', error);
    res.status(500).json({ error: 'Failed to schedule anomaly scan' });
  }
});

// GET /api/anomalies/scheduled-scans (paginated)
router.get('/scheduled-scans', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { company_id } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (company_id) {
      params.push(company_id);
      where += ` AND company_id = $${params.length}`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS c FROM scheduled_scans ${where}`,
      params
    );
    const total = countResult.rows[0].c;

    params.push(limit);
    params.push(offset);
    const dataResult = await pool.query(
      `SELECT * FROM scheduled_scans ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('List scheduled scans error:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled scans' });
  }
});

// PUT /api/anomalies/scheduled-scans/:id
router.put('/scheduled-scans/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, frequency, scan_type } = req.body;

    const result = await pool.query(
      `UPDATE scheduled_scans
       SET
         is_active = COALESCE($1, is_active),
         frequency = COALESCE($2, frequency),
         scan_type = COALESCE($3, scan_type),
         updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        is_active !== undefined ? is_active : null,
        frequency || null,
        scan_type || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scheduled scan not found' });
    }

    res.json({ success: true, scan: result.rows[0] });
  } catch (error) {
    console.error('Update scheduled scan error:', error);
    res.status(500).json({ error: 'Failed to update scheduled scan' });
  }
});

// DELETE /api/anomalies/scheduled-scans/:id
router.delete('/scheduled-scans/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM scheduled_scans WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Scheduled scan removed.' });
  } catch (error) {
    console.error('Delete scheduled scan error:', error);
    res.status(500).json({ error: 'Failed to delete scheduled scan' });
  }
});

function computeNextRun(frequency, from = new Date()) {
  const next = new Date(from);
  switch (frequency) {
    case 'daily': next.setDate(next.getDate() + 1); break;
    case 'weekly': next.setDate(next.getDate() + 7); break;
    case 'monthly': next.setMonth(next.getMonth() + 1); break;
    case 'quarterly': next.setMonth(next.getMonth() + 3); break;
    default: next.setDate(next.getDate() + 7);
  }
  return next;
}

module.exports = router;
module.exports.computeNextRun = computeNextRun;
