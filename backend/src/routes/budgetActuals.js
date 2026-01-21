const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all budget vs actuals
router.get('/', async (req, res) => {
  try {
    const { company_id, department, status, period } = req.query;
    let query = `
      SELECT ba.*, c.name as company_name
      FROM budget_actuals ba
      LEFT JOIN companies c ON ba.company_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (company_id) {
      params.push(company_id);
      query += ` AND ba.company_id = $${params.length}`;
    }
    if (department) {
      params.push(department);
      query += ` AND ba.department = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND ba.status = $${params.length}`;
    }
    if (period) {
      params.push(period);
      query += ` AND ba.period = $${params.length}`;
    }

    query += ' ORDER BY ba.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching budget actuals:', error);
    res.status(500).json({ error: 'Failed to fetch budget actuals' });
  }
});

// Get budget actual by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT ba.*, c.name as company_name
      FROM budget_actuals ba
      LEFT JOIN companies c ON ba.company_id = c.id
      WHERE ba.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget actual not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching budget actual:', error);
    res.status(500).json({ error: 'Failed to fetch budget actual' });
  }
});

// Create budget actual
router.post('/', async (req, res) => {
  try {
    const { company_id, department, category, period, budgeted_amount, actual_amount, ai_explanation, status } = req.body;
    const variance = actual_amount ? actual_amount - budgeted_amount : null;
    const variance_percentage = actual_amount && budgeted_amount ? ((actual_amount - budgeted_amount) / budgeted_amount * 100) : null;

    const result = await pool.query(
      `INSERT INTO budget_actuals (company_id, department, category, period, budgeted_amount, actual_amount, variance, variance_percentage, ai_explanation, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [company_id, department, category, period, budgeted_amount, actual_amount, variance, variance_percentage, ai_explanation, status || 'on_track']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating budget actual:', error);
    res.status(500).json({ error: 'Failed to create budget actual' });
  }
});

// Update budget actual
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { department, category, period, budgeted_amount, actual_amount, ai_explanation, status } = req.body;
    const variance = actual_amount ? actual_amount - budgeted_amount : null;
    const variance_percentage = actual_amount && budgeted_amount ? ((actual_amount - budgeted_amount) / budgeted_amount * 100) : null;

    const result = await pool.query(
      `UPDATE budget_actuals SET department = $1, category = $2, period = $3, budgeted_amount = $4, actual_amount = $5, variance = $6, variance_percentage = $7, ai_explanation = $8, status = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 RETURNING *`,
      [department, category, period, budgeted_amount, actual_amount, variance, variance_percentage, ai_explanation, status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget actual not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating budget actual:', error);
    res.status(500).json({ error: 'Failed to update budget actual' });
  }
});

// Delete budget actual
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM budget_actuals WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget actual not found' });
    }
    res.json({ message: 'Budget actual deleted successfully' });
  } catch (error) {
    console.error('Error deleting budget actual:', error);
    res.status(500).json({ error: 'Failed to delete budget actual' });
  }
});

module.exports = router;
