const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all financial statements
router.get('/', async (req, res) => {
  try {
    const { company_id, statement_type, status } = req.query;
    let query = `
      SELECT fs.*, c.name as company_name
      FROM financial_statements fs
      LEFT JOIN companies c ON fs.company_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (company_id) {
      params.push(company_id);
      query += ` AND fs.company_id = $${params.length}`;
    }
    if (statement_type) {
      params.push(statement_type);
      query += ` AND fs.statement_type = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND fs.status = $${params.length}`;
    }

    query += ' ORDER BY fs.period_end DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching financial statements:', error);
    res.status(500).json({ error: 'Failed to fetch financial statements' });
  }
});

// Get financial statement by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT fs.*, c.name as company_name
      FROM financial_statements fs
      LEFT JOIN companies c ON fs.company_id = c.id
      WHERE fs.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Financial statement not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching financial statement:', error);
    res.status(500).json({ error: 'Failed to fetch financial statement' });
  }
});

// Create financial statement
router.post('/', async (req, res) => {
  try {
    const { company_id, statement_type, period_start, period_end, total_revenue, total_expenses, net_income, status, ai_summary, created_by } = req.body;
    const result = await pool.query(
      `INSERT INTO financial_statements (company_id, statement_type, period_start, period_end, total_revenue, total_expenses, net_income, status, ai_summary, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [company_id, statement_type, period_start, period_end, total_revenue, total_expenses, net_income, status || 'draft', ai_summary, created_by]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating financial statement:', error);
    res.status(500).json({ error: 'Failed to create financial statement' });
  }
});

// Update financial statement
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { statement_type, period_start, period_end, total_revenue, total_expenses, net_income, status, ai_summary } = req.body;
    const result = await pool.query(
      `UPDATE financial_statements SET statement_type = $1, period_start = $2, period_end = $3, total_revenue = $4, total_expenses = $5, net_income = $6, status = $7, ai_summary = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 RETURNING *`,
      [statement_type, period_start, period_end, total_revenue, total_expenses, net_income, status, ai_summary, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Financial statement not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating financial statement:', error);
    res.status(500).json({ error: 'Failed to update financial statement' });
  }
});

// Delete financial statement
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM financial_statements WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Financial statement not found' });
    }
    res.json({ message: 'Financial statement deleted successfully' });
  } catch (error) {
    console.error('Error deleting financial statement:', error);
    res.status(500).json({ error: 'Failed to delete financial statement' });
  }
});

module.exports = router;
