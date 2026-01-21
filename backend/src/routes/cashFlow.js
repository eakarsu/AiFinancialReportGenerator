const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all cash flow records
router.get('/', async (req, res) => {
  try {
    const { company_id, record_type, category } = req.query;
    let query = `
      SELECT cf.*, c.name as company_name
      FROM cash_flow_records cf
      LEFT JOIN companies c ON cf.company_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (company_id) {
      params.push(company_id);
      query += ` AND cf.company_id = $${params.length}`;
    }
    if (record_type) {
      params.push(record_type);
      query += ` AND cf.record_type = $${params.length}`;
    }
    if (category) {
      params.push(category);
      query += ` AND cf.category = $${params.length}`;
    }

    query += ' ORDER BY cf.date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cash flow records:', error);
    res.status(500).json({ error: 'Failed to fetch cash flow records' });
  }
});

// Get cash flow record by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT cf.*, c.name as company_name
      FROM cash_flow_records cf
      LEFT JOIN companies c ON cf.company_id = c.id
      WHERE cf.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cash flow record not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching cash flow record:', error);
    res.status(500).json({ error: 'Failed to fetch cash flow record' });
  }
});

// Create cash flow record
router.post('/', async (req, res) => {
  try {
    const { company_id, record_type, category, amount, date, description, source, ai_classification } = req.body;
    const result = await pool.query(
      `INSERT INTO cash_flow_records (company_id, record_type, category, amount, date, description, source, ai_classification)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [company_id, record_type, category, amount, date, description, source, ai_classification]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating cash flow record:', error);
    res.status(500).json({ error: 'Failed to create cash flow record' });
  }
});

// Update cash flow record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { record_type, category, amount, date, description, source, ai_classification } = req.body;
    const result = await pool.query(
      `UPDATE cash_flow_records SET record_type = $1, category = $2, amount = $3, date = $4, description = $5, source = $6, ai_classification = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [record_type, category, amount, date, description, source, ai_classification, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cash flow record not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating cash flow record:', error);
    res.status(500).json({ error: 'Failed to update cash flow record' });
  }
});

// Delete cash flow record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM cash_flow_records WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cash flow record not found' });
    }
    res.json({ message: 'Cash flow record deleted successfully' });
  } catch (error) {
    console.error('Error deleting cash flow record:', error);
    res.status(500).json({ error: 'Failed to delete cash flow record' });
  }
});

// Get cash flow summary
router.get('/summary/overview', async (req, res) => {
  try {
    const { company_id } = req.query;
    let query = `
      SELECT
        record_type,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as inflows,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as outflows,
        SUM(amount) as net_flow
      FROM cash_flow_records
      WHERE 1=1
    `;
    const params = [];

    if (company_id) {
      params.push(company_id);
      query += ` AND company_id = $${params.length}`;
    }

    query += ' GROUP BY record_type';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cash flow summary:', error);
    res.status(500).json({ error: 'Failed to fetch cash flow summary' });
  }
});

module.exports = router;
