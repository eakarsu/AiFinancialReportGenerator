const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all AI insights
router.get('/', async (req, res) => {
  try {
    const { company_id, insight_type, impact_level, status } = req.query;
    let query = `
      SELECT ai.*, c.name as company_name
      FROM ai_insights ai
      LEFT JOIN companies c ON ai.company_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (company_id) {
      params.push(company_id);
      query += ` AND ai.company_id = $${params.length}`;
    }
    if (insight_type) {
      params.push(insight_type);
      query += ` AND ai.insight_type = $${params.length}`;
    }
    if (impact_level) {
      params.push(impact_level);
      query += ` AND ai.impact_level = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND ai.status = $${params.length}`;
    }

    query += ' ORDER BY ai.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching AI insights:', error);
    res.status(500).json({ error: 'Failed to fetch AI insights' });
  }
});

// Get AI insight by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT ai.*, c.name as company_name
      FROM ai_insights ai
      LEFT JOIN companies c ON ai.company_id = c.id
      WHERE ai.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'AI insight not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching AI insight:', error);
    res.status(500).json({ error: 'Failed to fetch AI insight' });
  }
});

// Create AI insight
router.post('/', async (req, res) => {
  try {
    const { company_id, insight_type, title, description, impact_level, confidence_score, data_sources, recommendations, action_items, status } = req.body;
    const result = await pool.query(
      `INSERT INTO ai_insights (company_id, insight_type, title, description, impact_level, confidence_score, data_sources, recommendations, action_items, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [company_id, insight_type, title, description, impact_level, confidence_score, data_sources, recommendations, JSON.stringify(action_items), status || 'new']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating AI insight:', error);
    res.status(500).json({ error: 'Failed to create AI insight' });
  }
});

// Update AI insight
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { insight_type, title, description, impact_level, confidence_score, data_sources, recommendations, action_items, status, acknowledged_by } = req.body;
    const result = await pool.query(
      `UPDATE ai_insights SET insight_type = $1, title = $2, description = $3, impact_level = $4, confidence_score = $5, data_sources = $6, recommendations = $7, action_items = $8, status = $9, acknowledged_by = $10, updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 RETURNING *`,
      [insight_type, title, description, impact_level, confidence_score, data_sources, recommendations, JSON.stringify(action_items), status, acknowledged_by, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'AI insight not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating AI insight:', error);
    res.status(500).json({ error: 'Failed to update AI insight' });
  }
});

// Delete AI insight
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM ai_insights WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'AI insight not found' });
    }
    res.json({ message: 'AI insight deleted successfully' });
  } catch (error) {
    console.error('Error deleting AI insight:', error);
    res.status(500).json({ error: 'Failed to delete AI insight' });
  }
});

module.exports = router;
