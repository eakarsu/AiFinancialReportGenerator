const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all KPI metrics
router.get('/', async (req, res) => {
  try {
    const { company_id, metric_category, period } = req.query;
    let query = `
      SELECT km.*, c.name as company_name
      FROM kpi_metrics km
      LEFT JOIN companies c ON km.company_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (company_id) {
      params.push(company_id);
      query += ` AND km.company_id = $${params.length}`;
    }
    if (metric_category) {
      params.push(metric_category);
      query += ` AND km.metric_category = $${params.length}`;
    }
    if (period) {
      params.push(period);
      query += ` AND km.period = $${params.length}`;
    }

    query += ' ORDER BY km.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching KPI metrics:', error);
    res.status(500).json({ error: 'Failed to fetch KPI metrics' });
  }
});

// Get KPI metric by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT km.*, c.name as company_name
      FROM kpi_metrics km
      LEFT JOIN companies c ON km.company_id = c.id
      WHERE km.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KPI metric not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching KPI metric:', error);
    res.status(500).json({ error: 'Failed to fetch KPI metric' });
  }
});

// Create KPI metric
router.post('/', async (req, res) => {
  try {
    const { company_id, metric_name, metric_category, current_value, target_value, previous_value, unit, trend, period, ai_recommendation } = req.body;
    const result = await pool.query(
      `INSERT INTO kpi_metrics (company_id, metric_name, metric_category, current_value, target_value, previous_value, unit, trend, period, ai_recommendation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [company_id, metric_name, metric_category, current_value, target_value, previous_value, unit, trend, period, ai_recommendation]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating KPI metric:', error);
    res.status(500).json({ error: 'Failed to create KPI metric' });
  }
});

// Update KPI metric
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { metric_name, metric_category, current_value, target_value, previous_value, unit, trend, period, ai_recommendation } = req.body;
    const result = await pool.query(
      `UPDATE kpi_metrics SET metric_name = $1, metric_category = $2, current_value = $3, target_value = $4, previous_value = $5, unit = $6, trend = $7, period = $8, ai_recommendation = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 RETURNING *`,
      [metric_name, metric_category, current_value, target_value, previous_value, unit, trend, period, ai_recommendation, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KPI metric not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating KPI metric:', error);
    res.status(500).json({ error: 'Failed to update KPI metric' });
  }
});

// Delete KPI metric
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM kpi_metrics WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KPI metric not found' });
    }
    res.json({ message: 'KPI metric deleted successfully' });
  } catch (error) {
    console.error('Error deleting KPI metric:', error);
    res.status(500).json({ error: 'Failed to delete KPI metric' });
  }
});

module.exports = router;
