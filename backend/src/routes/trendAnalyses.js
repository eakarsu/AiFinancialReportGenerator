const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all trend analyses
router.get('/', async (req, res) => {
  try {
    const { company_id, metric_name, trend_direction } = req.query;
    let query = `
      SELECT ta.*, c.name as company_name
      FROM trend_analyses ta
      LEFT JOIN companies c ON ta.company_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (company_id) {
      params.push(company_id);
      query += ` AND ta.company_id = $${params.length}`;
    }
    if (metric_name) {
      params.push(metric_name);
      query += ` AND ta.metric_name = $${params.length}`;
    }
    if (trend_direction) {
      params.push(trend_direction);
      query += ` AND ta.trend_direction = $${params.length}`;
    }

    query += ' ORDER BY ta.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching trend analyses:', error);
    res.status(500).json({ error: 'Failed to fetch trend analyses' });
  }
});

// Get trend analysis by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT ta.*, c.name as company_name
      FROM trend_analyses ta
      LEFT JOIN companies c ON ta.company_id = c.id
      WHERE ta.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trend analysis not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching trend analysis:', error);
    res.status(500).json({ error: 'Failed to fetch trend analysis' });
  }
});

// Create trend analysis
router.post('/', async (req, res) => {
  try {
    const { company_id, metric_name, analysis_period, trend_direction, growth_rate, data_points, seasonality_detected, forecast_next_period, ai_narrative } = req.body;
    const result = await pool.query(
      `INSERT INTO trend_analyses (company_id, metric_name, analysis_period, trend_direction, growth_rate, data_points, seasonality_detected, forecast_next_period, ai_narrative)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [company_id, metric_name, analysis_period, trend_direction, growth_rate, JSON.stringify(data_points), seasonality_detected, forecast_next_period, ai_narrative]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating trend analysis:', error);
    res.status(500).json({ error: 'Failed to create trend analysis' });
  }
});

// Update trend analysis
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { metric_name, analysis_period, trend_direction, growth_rate, data_points, seasonality_detected, forecast_next_period, ai_narrative } = req.body;
    const result = await pool.query(
      `UPDATE trend_analyses SET metric_name = $1, analysis_period = $2, trend_direction = $3, growth_rate = $4, data_points = $5, seasonality_detected = $6, forecast_next_period = $7, ai_narrative = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 RETURNING *`,
      [metric_name, analysis_period, trend_direction, growth_rate, JSON.stringify(data_points), seasonality_detected, forecast_next_period, ai_narrative, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trend analysis not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating trend analysis:', error);
    res.status(500).json({ error: 'Failed to update trend analysis' });
  }
});

// Delete trend analysis
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM trend_analyses WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trend analysis not found' });
    }
    res.json({ message: 'Trend analysis deleted successfully' });
  } catch (error) {
    console.error('Error deleting trend analysis:', error);
    res.status(500).json({ error: 'Failed to delete trend analysis' });
  }
});

module.exports = router;
