const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all revenue forecasts
router.get('/', async (req, res) => {
  try {
    const { company_id, status } = req.query;
    let query = `
      SELECT rf.*, c.name as company_name
      FROM revenue_forecasts rf
      LEFT JOIN companies c ON rf.company_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (company_id) {
      params.push(company_id);
      query += ` AND rf.company_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND rf.status = $${params.length}`;
    }

    query += ' ORDER BY rf.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching revenue forecasts:', error);
    res.status(500).json({ error: 'Failed to fetch revenue forecasts' });
  }
});

// Get revenue forecast by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT rf.*, c.name as company_name
      FROM revenue_forecasts rf
      LEFT JOIN companies c ON rf.company_id = c.id
      WHERE rf.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Revenue forecast not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching revenue forecast:', error);
    res.status(500).json({ error: 'Failed to fetch revenue forecast' });
  }
});

// Create revenue forecast
router.post('/', async (req, res) => {
  try {
    const { company_id, forecast_name, forecast_period, predicted_revenue, confidence_level, model_used, assumptions, ai_analysis, status, created_by } = req.body;
    const result = await pool.query(
      `INSERT INTO revenue_forecasts (company_id, forecast_name, forecast_period, predicted_revenue, confidence_level, model_used, assumptions, ai_analysis, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [company_id, forecast_name, forecast_period, predicted_revenue, confidence_level, model_used, assumptions, ai_analysis, status || 'pending', created_by]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating revenue forecast:', error);
    res.status(500).json({ error: 'Failed to create revenue forecast' });
  }
});

// Update revenue forecast
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { forecast_name, forecast_period, predicted_revenue, confidence_level, model_used, assumptions, ai_analysis, status } = req.body;
    const result = await pool.query(
      `UPDATE revenue_forecasts SET forecast_name = $1, forecast_period = $2, predicted_revenue = $3, confidence_level = $4, model_used = $5, assumptions = $6, ai_analysis = $7, status = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 RETURNING *`,
      [forecast_name, forecast_period, predicted_revenue, confidence_level, model_used, assumptions, ai_analysis, status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Revenue forecast not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating revenue forecast:', error);
    res.status(500).json({ error: 'Failed to update revenue forecast' });
  }
});

// Delete revenue forecast
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM revenue_forecasts WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Revenue forecast not found' });
    }
    res.json({ message: 'Revenue forecast deleted successfully' });
  } catch (error) {
    console.error('Error deleting revenue forecast:', error);
    res.status(500).json({ error: 'Failed to delete revenue forecast' });
  }
});

module.exports = router;
