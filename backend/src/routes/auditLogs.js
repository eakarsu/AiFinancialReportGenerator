const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all audit logs
router.get('/', async (req, res) => {
  try {
    const { company_id, action, entity_type, risk_level, start_date, end_date } = req.query;
    let query = `
      SELECT al.*, c.name as company_name, u.name as user_name
      FROM audit_logs al
      LEFT JOIN companies c ON al.company_id = c.id
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (company_id) {
      params.push(company_id);
      query += ` AND al.company_id = $${params.length}`;
    }
    if (action) {
      params.push(action);
      query += ` AND al.action = $${params.length}`;
    }
    if (entity_type) {
      params.push(entity_type);
      query += ` AND al.entity_type = $${params.length}`;
    }
    if (risk_level) {
      params.push(risk_level);
      query += ` AND al.risk_level = $${params.length}`;
    }
    if (start_date) {
      params.push(start_date);
      query += ` AND al.created_at >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      query += ` AND al.created_at <= $${params.length}`;
    }

    query += ' ORDER BY al.created_at DESC LIMIT 1000';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get audit log by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT al.*, c.name as company_name, u.name as user_name
      FROM audit_logs al
      LEFT JOIN companies c ON al.company_id = c.id
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit log not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// Create audit log
router.post('/', async (req, res) => {
  try {
    const { company_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, risk_level, ai_risk_assessment } = req.body;
    const result = await pool.query(
      `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, risk_level, ai_risk_assessment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [company_id, user_id, action, entity_type, entity_id, JSON.stringify(old_values), JSON.stringify(new_values), ip_address, user_agent, risk_level || 'low', ai_risk_assessment]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ error: 'Failed to create audit log' });
  }
});

module.exports = router;
