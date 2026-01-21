const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all tax reports
router.get('/', async (req, res) => {
  try {
    const { company_id, tax_type, filing_status } = req.query;
    let query = `
      SELECT tr.*, c.name as company_name
      FROM tax_reports tr
      LEFT JOIN companies c ON tr.company_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (company_id) {
      params.push(company_id);
      query += ` AND tr.company_id = $${params.length}`;
    }
    if (tax_type) {
      params.push(tax_type);
      query += ` AND tr.tax_type = $${params.length}`;
    }
    if (filing_status) {
      params.push(filing_status);
      query += ` AND tr.filing_status = $${params.length}`;
    }

    query += ' ORDER BY tr.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tax reports:', error);
    res.status(500).json({ error: 'Failed to fetch tax reports' });
  }
});

// Get tax report by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT tr.*, c.name as company_name
      FROM tax_reports tr
      LEFT JOIN companies c ON tr.company_id = c.id
      WHERE tr.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tax report not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching tax report:', error);
    res.status(500).json({ error: 'Failed to fetch tax report' });
  }
});

// Create tax report
router.post('/', async (req, res) => {
  try {
    const { company_id, tax_type, tax_period, taxable_income, tax_liability, deductions, credits, effective_rate, filing_status, due_date, ai_optimization_suggestions } = req.body;
    const result = await pool.query(
      `INSERT INTO tax_reports (company_id, tax_type, tax_period, taxable_income, tax_liability, deductions, credits, effective_rate, filing_status, due_date, ai_optimization_suggestions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [company_id, tax_type, tax_period, taxable_income, tax_liability, deductions, credits, effective_rate, filing_status || 'pending', due_date, ai_optimization_suggestions]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating tax report:', error);
    res.status(500).json({ error: 'Failed to create tax report' });
  }
});

// Update tax report
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tax_type, tax_period, taxable_income, tax_liability, deductions, credits, effective_rate, filing_status, due_date, ai_optimization_suggestions } = req.body;
    const result = await pool.query(
      `UPDATE tax_reports SET tax_type = $1, tax_period = $2, taxable_income = $3, tax_liability = $4, deductions = $5, credits = $6, effective_rate = $7, filing_status = $8, due_date = $9, ai_optimization_suggestions = $10, updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 RETURNING *`,
      [tax_type, tax_period, taxable_income, tax_liability, deductions, credits, effective_rate, filing_status, due_date, ai_optimization_suggestions, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tax report not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating tax report:', error);
    res.status(500).json({ error: 'Failed to update tax report' });
  }
});

// Delete tax report
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tax_reports WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tax report not found' });
    }
    res.json({ message: 'Tax report deleted successfully' });
  } catch (error) {
    console.error('Error deleting tax report:', error);
    res.status(500).json({ error: 'Failed to delete tax report' });
  }
});

module.exports = router;
