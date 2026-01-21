const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all balance sheets
router.get('/', async (req, res) => {
  try {
    const { company_id } = req.query;
    let query = `
      SELECT bs.*, c.name as company_name
      FROM balance_sheets bs
      LEFT JOIN companies c ON bs.company_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (company_id) {
      params.push(company_id);
      query += ` AND bs.company_id = $${params.length}`;
    }

    query += ' ORDER BY bs.as_of_date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching balance sheets:', error);
    res.status(500).json({ error: 'Failed to fetch balance sheets' });
  }
});

// Get balance sheet by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT bs.*, c.name as company_name
      FROM balance_sheets bs
      LEFT JOIN companies c ON bs.company_id = c.id
      WHERE bs.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Balance sheet not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching balance sheet:', error);
    res.status(500).json({ error: 'Failed to fetch balance sheet' });
  }
});

// Create balance sheet
router.post('/', async (req, res) => {
  try {
    const { company_id, as_of_date, total_assets, current_assets, fixed_assets, total_liabilities, current_liabilities, long_term_liabilities, shareholders_equity, retained_earnings, ai_health_score, ai_analysis } = req.body;
    const result = await pool.query(
      `INSERT INTO balance_sheets (company_id, as_of_date, total_assets, current_assets, fixed_assets, total_liabilities, current_liabilities, long_term_liabilities, shareholders_equity, retained_earnings, ai_health_score, ai_analysis)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [company_id, as_of_date, total_assets, current_assets, fixed_assets, total_liabilities, current_liabilities, long_term_liabilities, shareholders_equity, retained_earnings, ai_health_score, ai_analysis]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating balance sheet:', error);
    res.status(500).json({ error: 'Failed to create balance sheet' });
  }
});

// Update balance sheet
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { as_of_date, total_assets, current_assets, fixed_assets, total_liabilities, current_liabilities, long_term_liabilities, shareholders_equity, retained_earnings, ai_health_score, ai_analysis } = req.body;
    const result = await pool.query(
      `UPDATE balance_sheets SET as_of_date = $1, total_assets = $2, current_assets = $3, fixed_assets = $4, total_liabilities = $5, current_liabilities = $6, long_term_liabilities = $7, shareholders_equity = $8, retained_earnings = $9, ai_health_score = $10, ai_analysis = $11, updated_at = CURRENT_TIMESTAMP
       WHERE id = $12 RETURNING *`,
      [as_of_date, total_assets, current_assets, fixed_assets, total_liabilities, current_liabilities, long_term_liabilities, shareholders_equity, retained_earnings, ai_health_score, ai_analysis, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Balance sheet not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating balance sheet:', error);
    res.status(500).json({ error: 'Failed to update balance sheet' });
  }
});

// Delete balance sheet
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM balance_sheets WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Balance sheet not found' });
    }
    res.json({ message: 'Balance sheet deleted successfully' });
  } catch (error) {
    console.error('Error deleting balance sheet:', error);
    res.status(500).json({ error: 'Failed to delete balance sheet' });
  }
});

module.exports = router;
