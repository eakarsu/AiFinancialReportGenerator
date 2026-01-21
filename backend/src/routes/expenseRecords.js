const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all expense records
router.get('/', async (req, res) => {
  try {
    const { company_id, category, status, start_date, end_date } = req.query;
    let query = `
      SELECT er.*, c.name as company_name
      FROM expense_records er
      LEFT JOIN companies c ON er.company_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (company_id) {
      params.push(company_id);
      query += ` AND er.company_id = $${params.length}`;
    }
    if (category) {
      params.push(category);
      query += ` AND er.category = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND er.status = $${params.length}`;
    }
    if (start_date) {
      params.push(start_date);
      query += ` AND er.date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      query += ` AND er.date <= $${params.length}`;
    }

    query += ' ORDER BY er.date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching expense records:', error);
    res.status(500).json({ error: 'Failed to fetch expense records' });
  }
});

// Get expense record by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT er.*, c.name as company_name
      FROM expense_records er
      LEFT JOIN companies c ON er.company_id = c.id
      WHERE er.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense record not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching expense record:', error);
    res.status(500).json({ error: 'Failed to fetch expense record' });
  }
});

// Create expense record
router.post('/', async (req, res) => {
  try {
    const { company_id, category, subcategory, amount, date, vendor, description, receipt_url, approved_by, status, ai_categorization } = req.body;
    const result = await pool.query(
      `INSERT INTO expense_records (company_id, category, subcategory, amount, date, vendor, description, receipt_url, approved_by, status, ai_categorization)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [company_id, category, subcategory, amount, date, vendor, description, receipt_url, approved_by, status || 'pending', ai_categorization]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating expense record:', error);
    res.status(500).json({ error: 'Failed to create expense record' });
  }
});

// Update expense record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category, subcategory, amount, date, vendor, description, receipt_url, approved_by, status, ai_categorization } = req.body;
    const result = await pool.query(
      `UPDATE expense_records SET category = $1, subcategory = $2, amount = $3, date = $4, vendor = $5, description = $6, receipt_url = $7, approved_by = $8, status = $9, ai_categorization = $10, updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 RETURNING *`,
      [category, subcategory, amount, date, vendor, description, receipt_url, approved_by, status, ai_categorization, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense record not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating expense record:', error);
    res.status(500).json({ error: 'Failed to update expense record' });
  }
});

// Delete expense record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM expense_records WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense record not found' });
    }
    res.json({ message: 'Expense record deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense record:', error);
    res.status(500).json({ error: 'Failed to delete expense record' });
  }
});

// Get expense summary
router.get('/summary/by-category', async (req, res) => {
  try {
    const { company_id, start_date, end_date } = req.query;
    let query = `
      SELECT category, SUM(amount) as total_amount, COUNT(*) as count
      FROM expense_records
      WHERE 1=1
    `;
    const params = [];

    if (company_id) {
      params.push(company_id);
      query += ` AND company_id = $${params.length}`;
    }
    if (start_date) {
      params.push(start_date);
      query += ` AND date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      query += ` AND date <= $${params.length}`;
    }

    query += ' GROUP BY category ORDER BY total_amount DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching expense summary:', error);
    res.status(500).json({ error: 'Failed to fetch expense summary' });
  }
});

module.exports = router;
