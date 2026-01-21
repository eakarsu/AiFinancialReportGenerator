const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all compliance reports
router.get('/', async (req, res) => {
  try {
    const { company_id, regulation_type, compliance_status } = req.query;
    let query = `
      SELECT cr.*, c.name as company_name
      FROM compliance_reports cr
      LEFT JOIN companies c ON cr.company_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (company_id) {
      params.push(company_id);
      query += ` AND cr.company_id = $${params.length}`;
    }
    if (regulation_type) {
      params.push(regulation_type);
      query += ` AND cr.regulation_type = $${params.length}`;
    }
    if (compliance_status) {
      params.push(compliance_status);
      query += ` AND cr.compliance_status = $${params.length}`;
    }

    query += ' ORDER BY cr.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching compliance reports:', error);
    res.status(500).json({ error: 'Failed to fetch compliance reports' });
  }
});

// Get compliance report by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT cr.*, c.name as company_name
      FROM compliance_reports cr
      LEFT JOIN companies c ON cr.company_id = c.id
      WHERE cr.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance report not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching compliance report:', error);
    res.status(500).json({ error: 'Failed to fetch compliance report' });
  }
});

// Create compliance report
router.post('/', async (req, res) => {
  try {
    const { company_id, regulation_type, report_period, compliance_status, score, findings, remediation_items, due_date, submitted_date, ai_compliance_check, reviewer } = req.body;
    const result = await pool.query(
      `INSERT INTO compliance_reports (company_id, regulation_type, report_period, compliance_status, score, findings, remediation_items, due_date, submitted_date, ai_compliance_check, reviewer)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [company_id, regulation_type, report_period, compliance_status, score, JSON.stringify(findings), JSON.stringify(remediation_items), due_date, submitted_date, ai_compliance_check, reviewer]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating compliance report:', error);
    res.status(500).json({ error: 'Failed to create compliance report' });
  }
});

// Update compliance report
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { regulation_type, report_period, compliance_status, score, findings, remediation_items, due_date, submitted_date, ai_compliance_check, reviewer } = req.body;
    const result = await pool.query(
      `UPDATE compliance_reports SET regulation_type = $1, report_period = $2, compliance_status = $3, score = $4, findings = $5, remediation_items = $6, due_date = $7, submitted_date = $8, ai_compliance_check = $9, reviewer = $10, updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 RETURNING *`,
      [regulation_type, report_period, compliance_status, score, JSON.stringify(findings), JSON.stringify(remediation_items), due_date, submitted_date, ai_compliance_check, reviewer, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance report not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating compliance report:', error);
    res.status(500).json({ error: 'Failed to update compliance report' });
  }
});

// Delete compliance report
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM compliance_reports WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance report not found' });
    }
    res.json({ message: 'Compliance report deleted successfully' });
  } catch (error) {
    console.error('Error deleting compliance report:', error);
    res.status(500).json({ error: 'Failed to delete compliance report' });
  }
});

module.exports = router;
