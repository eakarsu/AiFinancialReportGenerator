const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { parseAIResponse, safeStringify } = require('../utils/aiParser');
require('dotenv').config({ path: '../../../.env' });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function callOpenRouter(messages, maxTokens = 4000) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Financial Report Generator'
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Get all AI responses with pagination
router.get('/', async (req, res) => {
  try {
    const { company_id, feature_type, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT ar.*, c.name as company_name
      FROM ai_responses ar
      LEFT JOIN companies c ON ar.company_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (company_id) {
      params.push(company_id);
      query += ` AND ar.company_id = $${params.length}`;
    }

    if (feature_type) {
      params.push(feature_type);
      query += ` AND ar.feature_type = $${params.length}`;
    }

    query += ` ORDER BY ar.created_at DESC`;

    params.push(parseInt(limit));
    query += ` LIMIT $${params.length}`;

    params.push(parseInt(offset));
    query += ` OFFSET $${params.length}`;

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM ai_responses WHERE 1=1`;
    const countParams = [];
    if (company_id) {
      countParams.push(company_id);
      countQuery += ` AND company_id = $${countParams.length}`;
    }
    if (feature_type) {
      countParams.push(feature_type);
      countQuery += ` AND feature_type = $${countParams.length}`;
    }
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      responses: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching AI responses:', error);
    res.status(500).json({ error: 'Failed to fetch AI responses' });
  }
});

// Get single AI response
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ar.*, c.name as company_name
      FROM ai_responses ar
      LEFT JOIN companies c ON ar.company_id = c.id
      WHERE ar.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'AI response not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching AI response:', error);
    res.status(500).json({ error: 'Failed to fetch AI response' });
  }
});

// Get AI response statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { company_id } = req.query;
    const params = company_id ? [company_id] : [];
    const whereClause = company_id ? 'WHERE company_id = $1' : '';

    const [totalResult, byFeatureResult, recentResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM ai_responses ${whereClause}`, params),
      pool.query(`
        SELECT feature_type, COUNT(*) as count,
               AVG(processing_time_ms) as avg_processing_time
        FROM ai_responses ${whereClause}
        GROUP BY feature_type
        ORDER BY count DESC
      `, params),
      pool.query(`
        SELECT id, feature_type, feature_name, created_at, status
        FROM ai_responses ${whereClause}
        ORDER BY created_at DESC LIMIT 10
      `, params)
    ]);

    res.json({
      total: parseInt(totalResult.rows[0].total),
      byFeature: byFeatureResult.rows,
      recent: recentResult.rows
    });
  } catch (error) {
    console.error('Error fetching AI response stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get feature types
router.get('/meta/feature-types', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT feature_type, COUNT(*) as count
      FROM ai_responses
      GROUP BY feature_type
      ORDER BY feature_type
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching feature types:', error);
    res.status(500).json({ error: 'Failed to fetch feature types' });
  }
});

// Delete AI response
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM ai_responses WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'AI response not found' });
    }
    res.json({ message: 'AI response deleted successfully' });
  } catch (error) {
    console.error('Error deleting AI response:', error);
    res.status(500).json({ error: 'Failed to delete AI response' });
  }
});

// Analyze AI response history with AI
router.post('/analyze', async (req, res) => {
  try {
    const { company_id, feature_type, days = 30 } = req.body;

    // Get recent AI responses
    let query = `
      SELECT ar.*, c.name as company_name
      FROM ai_responses ar
      LEFT JOIN companies c ON ar.company_id = c.id
      WHERE ar.created_at >= NOW() - INTERVAL '${days} days'
    `;
    const params = [];

    if (company_id) {
      params.push(company_id);
      query += ` AND ar.company_id = $${params.length}`;
    }
    if (feature_type && feature_type !== 'all') {
      params.push(feature_type);
      query += ` AND ar.feature_type = $${params.length}`;
    }

    query += ` ORDER BY ar.created_at DESC LIMIT 50`;

    const responsesResult = await pool.query(query, params);

    if (responsesResult.rows.length === 0) {
      return res.json({
        analysis: {
          summary: 'No AI responses found for the selected criteria.',
          insights: [],
          recommendations: []
        }
      });
    }

    // Get statistics
    const statsQuery = `
      SELECT
        feature_type,
        COUNT(*) as count,
        AVG(processing_time_ms) as avg_time,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM ai_responses
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      ${company_id ? `AND company_id = $1` : ''}
      GROUP BY feature_type
    `;
    const statsResult = await pool.query(statsQuery, company_id ? [company_id] : []);

    const messages = [
      {
        role: 'system',
        content: `You are an AI analytics expert. Analyze AI usage patterns and provide insights. Return your response as a valid JSON object.`
      },
      {
        role: 'user',
        content: `Analyze the following AI response history for the past ${days} days:

STATISTICS BY FEATURE:
${JSON.stringify(statsResult.rows, null, 2)}

RECENT RESPONSES (${responsesResult.rows.length} total):
${responsesResult.rows.slice(0, 20).map(r => `- ${r.feature_type}: ${r.feature_name} (${r.status}) - ${r.created_at}`).join('\n')}

SAMPLE PARSED RESPONSES:
${responsesResult.rows.slice(0, 5).map(r => `Feature: ${r.feature_type}\nResponse: ${JSON.stringify(r.parsed_response)?.substring(0, 500)}`).join('\n\n')}

Provide comprehensive analysis as JSON:
{
  "executive_summary": "2-3 sentence overview of AI usage patterns",
  "usage_insights": [
    {
      "insight": "Key observation about usage",
      "impact": "high/medium/low",
      "category": "usage/performance/quality"
    }
  ],
  "feature_analysis": [
    {
      "feature": "Feature name",
      "usage_trend": "increasing/stable/decreasing",
      "quality_score": 85,
      "observations": "Specific observations"
    }
  ],
  "patterns_detected": [
    {
      "pattern": "Pattern description",
      "frequency": "How often",
      "significance": "Why it matters"
    }
  ],
  "recommendations": [
    {
      "recommendation": "Specific suggestion",
      "priority": "high/medium/low",
      "expected_benefit": "What improvement to expect"
    }
  ],
  "performance_summary": {
    "total_requests": ${responsesResult.rows.length},
    "success_rate": "percentage",
    "avg_response_quality": "assessment",
    "most_used_feature": "feature name",
    "improvement_areas": ["Area 1", "Area 2"]
  }
}`
      }
    ];

    const aiResponse = await callOpenRouter(messages);
    console.log('AI History Analysis received:', aiResponse.substring(0, 300));

    let analysis = parseAIResponse(aiResponse);

    if (!analysis) {
      analysis = {
        executive_summary: aiResponse,
        usage_insights: [],
        recommendations: [],
        performance_summary: {
          total_requests: responsesResult.rows.length
        }
      };
    }

    res.json({
      analysis,
      stats: statsResult.rows,
      total_responses: responsesResult.rows.length,
      period_days: days
    });
  } catch (error) {
    console.error('Error analyzing AI history:', error);
    res.status(500).json({ error: 'Failed to analyze AI history' });
  }
});

// Get AI-powered summary of a specific response
router.post('/summarize/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ar.*, c.name as company_name
      FROM ai_responses ar
      LEFT JOIN companies c ON ar.company_id = c.id
      WHERE ar.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'AI response not found' });
    }

    const response = result.rows[0];

    const messages = [
      {
        role: 'system',
        content: 'You are an expert at summarizing AI outputs. Provide clear, concise summaries. Return response as JSON.'
      },
      {
        role: 'user',
        content: `Summarize this AI response:

Feature: ${response.feature_type}
Name: ${response.feature_name}
Raw Response: ${response.raw_response?.substring(0, 3000)}

Provide summary as JSON:
{
  "summary": "2-3 sentence summary of what this AI response contains",
  "key_points": ["Point 1", "Point 2", "Point 3"],
  "data_quality": "high/medium/low",
  "actionable_insights": ["Insight 1", "Insight 2"],
  "suggested_next_steps": ["Step 1", "Step 2"]
}`
      }
    ];

    const aiResponse = await callOpenRouter(messages, 2000);
    let summary = parseAIResponse(aiResponse);

    if (!summary) {
      summary = {
        summary: aiResponse,
        key_points: [],
        data_quality: 'medium'
      };
    }

    res.json({ summary, response_id: req.params.id });
  } catch (error) {
    console.error('Error summarizing AI response:', error);
    res.status(500).json({ error: 'Failed to summarize response' });
  }
});

module.exports = router;
