const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all anomaly detections
router.get('/', async (req, res) => {
  try {
    const { company_id, anomaly_type, severity, resolution_status } = req.query;
    let query = `
      SELECT ad.*, c.name as company_name
      FROM anomaly_detections ad
      LEFT JOIN companies c ON ad.company_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (company_id) {
      params.push(company_id);
      query += ` AND ad.company_id = $${params.length}`;
    }
    if (anomaly_type) {
      params.push(anomaly_type);
      query += ` AND ad.anomaly_type = $${params.length}`;
    }
    if (severity) {
      params.push(severity);
      query += ` AND ad.severity = $${params.length}`;
    }
    if (resolution_status) {
      params.push(resolution_status);
      query += ` AND ad.resolution_status = $${params.length}`;
    }

    query += ' ORDER BY ad.detection_date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching anomaly detections:', error);
    res.status(500).json({ error: 'Failed to fetch anomaly detections' });
  }
});

// Get anomaly detection by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT ad.*, c.name as company_name
      FROM anomaly_detections ad
      LEFT JOIN companies c ON ad.company_id = c.id
      WHERE ad.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Anomaly detection not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching anomaly detection:', error);
    res.status(500).json({ error: 'Failed to fetch anomaly detection' });
  }
});

// Create anomaly detection
router.post('/', async (req, res) => {
  try {
    const { company_id, anomaly_type, severity, description, affected_metric, expected_value, actual_value, deviation_percentage, detection_date, ai_explanation, resolution_status } = req.body;
    const result = await pool.query(
      `INSERT INTO anomaly_detections (company_id, anomaly_type, severity, description, affected_metric, expected_value, actual_value, deviation_percentage, detection_date, ai_explanation, resolution_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [company_id, anomaly_type, severity, description, affected_metric, expected_value, actual_value, deviation_percentage, detection_date, ai_explanation, resolution_status || 'open']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating anomaly detection:', error);
    res.status(500).json({ error: 'Failed to create anomaly detection' });
  }
});

// Update anomaly detection
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { anomaly_type, severity, description, affected_metric, expected_value, actual_value, deviation_percentage, ai_explanation, resolution_status, resolved_by, resolution_notes } = req.body;
    const result = await pool.query(
      `UPDATE anomaly_detections SET anomaly_type = $1, severity = $2, description = $3, affected_metric = $4, expected_value = $5, actual_value = $6, deviation_percentage = $7, ai_explanation = $8, resolution_status = $9, resolved_by = $10, resolution_notes = $11, updated_at = CURRENT_TIMESTAMP
       WHERE id = $12 RETURNING *`,
      [anomaly_type, severity, description, affected_metric, expected_value, actual_value, deviation_percentage, ai_explanation, resolution_status, resolved_by, resolution_notes, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Anomaly detection not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating anomaly detection:', error);
    res.status(500).json({ error: 'Failed to update anomaly detection' });
  }
});

// Delete anomaly detection
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM anomaly_detections WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Anomaly detection not found' });
    }
    res.json({ message: 'Anomaly detection deleted successfully' });
  } catch (error) {
    console.error('Error deleting anomaly detection:', error);
    res.status(500).json({ error: 'Failed to delete anomaly detection' });
  }
});

module.exports = router;
