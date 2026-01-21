const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all companies
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM companies ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Get company by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

// Create company
router.post('/', async (req, res) => {
  try {
    const { name, industry, fiscal_year_end, currency } = req.body;
    const result = await pool.query(
      'INSERT INTO companies (name, industry, fiscal_year_end, currency) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, industry, fiscal_year_end || 'December', currency || 'USD']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// Update company
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, industry, fiscal_year_end, currency } = req.body;
    const result = await pool.query(
      'UPDATE companies SET name = $1, industry = $2, fiscal_year_end = $3, currency = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [name, industry, fiscal_year_end, currency, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

// Delete company
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM companies WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

module.exports = router;
