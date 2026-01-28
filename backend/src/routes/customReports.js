const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all custom reports
router.get('/', async (req, res) => {
  try {
    const { company_id, report_type } = req.query;
    let query = `
      SELECT cr.*, c.name as company_name, u.name as created_by_name
      FROM custom_reports cr
      LEFT JOIN companies c ON cr.company_id = c.id
      LEFT JOIN users u ON cr.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (company_id) {
      params.push(company_id);
      query += ` AND cr.company_id = $${params.length}`;
    }
    if (report_type) {
      params.push(report_type);
      query += ` AND cr.report_type = $${params.length}`;
    }

    query += ' ORDER BY cr.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching custom reports:', error);
    res.status(500).json({ error: 'Failed to fetch custom reports' });
  }
});

// Get custom report by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT cr.*, c.name as company_name, u.name as created_by_name
      FROM custom_reports cr
      LEFT JOIN companies c ON cr.company_id = c.id
      LEFT JOIN users u ON cr.created_by = u.id
      WHERE cr.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Custom report not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching custom report:', error);
    res.status(500).json({ error: 'Failed to fetch custom report' });
  }
});

// Create custom report
router.post('/', async (req, res) => {
  try {
    const { company_id, report_name, report_type, description, query_config, chart_config, filters, schedule, recipients, ai_generated, created_by } = req.body;
    // Convert empty strings to null for UUID columns
    const companyIdValue = company_id && company_id.trim() !== '' ? company_id : null;
    const createdByValue = created_by && created_by.trim() !== '' ? created_by : null;
    const result = await pool.query(
      `INSERT INTO custom_reports (company_id, report_name, report_type, description, query_config, chart_config, filters, schedule, recipients, ai_generated, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [companyIdValue, report_name, report_type, description, JSON.stringify(query_config), JSON.stringify(chart_config), JSON.stringify(filters), schedule, recipients, ai_generated || false, createdByValue]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating custom report:', error);
    res.status(500).json({ error: 'Failed to create custom report' });
  }
});

// Update custom report
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { report_name, report_type, description, query_config, chart_config, filters, schedule, recipients, ai_generated } = req.body;
    const result = await pool.query(
      `UPDATE custom_reports SET report_name = $1, report_type = $2, description = $3, query_config = $4, chart_config = $5, filters = $6, schedule = $7, recipients = $8, ai_generated = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 RETURNING *`,
      [report_name, report_type, description, JSON.stringify(query_config), JSON.stringify(chart_config), JSON.stringify(filters), schedule, recipients, ai_generated, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Custom report not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating custom report:', error);
    res.status(500).json({ error: 'Failed to update custom report' });
  }
});

// Delete custom report
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM custom_reports WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Custom report not found' });
    }
    res.json({ message: 'Custom report deleted successfully' });
  } catch (error) {
    console.error('Error deleting custom report:', error);
    res.status(500).json({ error: 'Failed to delete custom report' });
  }
});

module.exports = router;
