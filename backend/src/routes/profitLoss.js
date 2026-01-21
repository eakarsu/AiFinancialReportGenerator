const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all profit & loss records
router.get('/', async (req, res) => {
  try {
    const { company_id, period } = req.query;
    let query = `
      SELECT pl.*, c.name as company_name
      FROM profit_loss_records pl
      LEFT JOIN companies c ON pl.company_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (company_id) {
      params.push(company_id);
      query += ` AND pl.company_id = $${params.length}`;
    }
    if (period) {
      params.push(period);
      query += ` AND pl.period = $${params.length}`;
    }

    query += ' ORDER BY pl.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching profit loss records:', error);
    res.status(500).json({ error: 'Failed to fetch profit loss records' });
  }
});

// Get profit & loss record by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT pl.*, c.name as company_name
      FROM profit_loss_records pl
      LEFT JOIN companies c ON pl.company_id = c.id
      WHERE pl.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profit loss record not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching profit loss record:', error);
    res.status(500).json({ error: 'Failed to fetch profit loss record' });
  }
});

// Create profit & loss record
router.post('/', async (req, res) => {
  try {
    const { company_id, period, revenue, cost_of_goods_sold, operating_expenses, earnings_per_share, ai_insights } = req.body;
    const gross_profit = revenue - (cost_of_goods_sold || 0);
    const operating_income = gross_profit - (operating_expenses || 0);
    const net_income = operating_income;

    const result = await pool.query(
      `INSERT INTO profit_loss_records (company_id, period, revenue, cost_of_goods_sold, gross_profit, operating_expenses, operating_income, net_income, earnings_per_share, ai_insights)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [company_id, period, revenue, cost_of_goods_sold, gross_profit, operating_expenses, operating_income, net_income, earnings_per_share, ai_insights]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating profit loss record:', error);
    res.status(500).json({ error: 'Failed to create profit loss record' });
  }
});

// Update profit & loss record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { period, revenue, cost_of_goods_sold, operating_expenses, earnings_per_share, ai_insights } = req.body;
    const gross_profit = revenue - (cost_of_goods_sold || 0);
    const operating_income = gross_profit - (operating_expenses || 0);
    const net_income = operating_income;

    const result = await pool.query(
      `UPDATE profit_loss_records SET period = $1, revenue = $2, cost_of_goods_sold = $3, gross_profit = $4, operating_expenses = $5, operating_income = $6, net_income = $7, earnings_per_share = $8, ai_insights = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 RETURNING *`,
      [period, revenue, cost_of_goods_sold, gross_profit, operating_expenses, operating_income, net_income, earnings_per_share, ai_insights, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profit loss record not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating profit loss record:', error);
    res.status(500).json({ error: 'Failed to update profit loss record' });
  }
});

// Delete profit & loss record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM profit_loss_records WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profit loss record not found' });
    }
    res.json({ message: 'Profit loss record deleted successfully' });
  } catch (error) {
    console.error('Error deleting profit loss record:', error);
    res.status(500).json({ error: 'Failed to delete profit loss record' });
  }
});

module.exports = router;
