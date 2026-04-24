const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { parseAIResponse, extractNumber, normalizePredictions, safeStringify, saveAIResponse } = require('../utils/aiParser');
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

// Get all forecasts
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.*, c.name as company_name
      FROM ai_forecasts f
      LEFT JOIN companies c ON f.company_id = c.id
      ORDER BY f.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching forecasts:', error);
    res.status(500).json({ error: 'Failed to fetch forecasts' });
  }
});

// Get single forecast
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.*, c.name as company_name
      FROM ai_forecasts f
      LEFT JOIN companies c ON f.company_id = c.id
      WHERE f.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Forecast not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching forecast:', error);
    res.status(500).json({ error: 'Failed to fetch forecast' });
  }
});

// Create forecast
router.post('/', async (req, res) => {
  try {
    const { company_id, forecast_name, forecast_type, metric_name, time_horizon, methodology } = req.body;
    const result = await pool.query(
      `INSERT INTO ai_forecasts (company_id, forecast_name, forecast_type, metric_name, time_horizon, methodology)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [company_id, forecast_name, forecast_type, metric_name, time_horizon, methodology]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating forecast:', error);
    res.status(500).json({ error: 'Failed to create forecast' });
  }
});

// Update forecast
router.put('/:id', async (req, res) => {
  try {
    const { forecast_name, forecast_type, metric_name, time_horizon, methodology, status } = req.body;
    const result = await pool.query(
      `UPDATE ai_forecasts
       SET forecast_name = COALESCE($1, forecast_name),
           forecast_type = COALESCE($2, forecast_type),
           metric_name = COALESCE($3, metric_name),
           time_horizon = COALESCE($4, time_horizon),
           methodology = COALESCE($5, methodology),
           status = COALESCE($6, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [forecast_name, forecast_type, metric_name, time_horizon, methodology, status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Forecast not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating forecast:', error);
    res.status(500).json({ error: 'Failed to update forecast' });
  }
});

// Delete forecast
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM ai_forecasts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Forecast not found' });
    }
    res.json({ message: 'Forecast deleted successfully' });
  } catch (error) {
    console.error('Error deleting forecast:', error);
    res.status(500).json({ error: 'Failed to delete forecast' });
  }
});

// Generate AI forecast
router.post('/generate', async (req, res) => {
  try {
    const { company_id, forecast_name, forecast_type, metric_name, time_horizon, historical_data } = req.body;

    const companyResult = await pool.query('SELECT * FROM companies WHERE id = $1', [company_id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const company = companyResult.rows[0];

    // Get historical financial data if not provided
    let histData = historical_data;
    if (!histData) {
      const financialResult = await pool.query(`
        SELECT * FROM profit_loss_records WHERE company_id = $1 ORDER BY created_at DESC LIMIT 12
      `, [company_id]);
      histData = financialResult.rows;
    }

    const messages = [
      {
        role: 'system',
        content: `You are an expert financial forecasting analyst with expertise in predictive modeling. Generate accurate, data-driven forecasts with confidence intervals. Return your response as a valid JSON object.`
      },
      {
        role: 'user',
        content: `Generate a ${forecast_type} forecast for ${company.name} (${company.industry} industry):

Forecast Name: ${forecast_name}
Metric: ${metric_name || 'Revenue'}
Time Horizon: ${time_horizon || '12 months'}
Historical Data: ${JSON.stringify(histData)}

Provide a comprehensive forecast as JSON:
{
  "forecast_summary": {
    "metric": "${metric_name || 'Revenue'}",
    "time_horizon": "${time_horizon || '12 months'}",
    "methodology": "Methodology used (e.g., ARIMA, Prophet, ML Ensemble)",
    "base_scenario": "Most likely outcome description"
  },
  "predictions": [
    {
      "period": "Q1 2025",
      "predicted_value": 1000000,
      "growth_rate": 5.2,
      "confidence": 85
    },
    {
      "period": "Q2 2025",
      "predicted_value": 1050000,
      "growth_rate": 5.0,
      "confidence": 80
    }
  ],
  "confidence_intervals": {
    "lower_bound": "10th percentile values",
    "upper_bound": "90th percentile values",
    "confidence_level": 80
  },
  "scenarios": {
    "optimistic": {
      "description": "Best case scenario",
      "probability": 20,
      "key_drivers": ["Driver 1", "Driver 2"],
      "total_value": 1200000
    },
    "base": {
      "description": "Most likely scenario",
      "probability": 60,
      "key_drivers": ["Driver 1", "Driver 2"],
      "total_value": 1000000
    },
    "pessimistic": {
      "description": "Worst case scenario",
      "probability": 20,
      "key_drivers": ["Driver 1", "Driver 2"],
      "total_value": 800000
    }
  },
  "assumptions": [
    {
      "assumption": "Market conditions remain stable",
      "impact": "Moderate impact on forecast accuracy",
      "sensitivity": "high/medium/low"
    }
  ],
  "risk_factors": [
    {
      "risk": "Economic downturn",
      "probability": 25,
      "potential_impact": "Could reduce revenue by 15-20%",
      "mitigation": "Diversify revenue streams"
    }
  ],
  "accuracy_metrics": {
    "historical_accuracy": 85,
    "model_confidence": 80,
    "data_quality_score": 90
  },
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2"
  ],
  "key_insights": [
    "Insight 1",
    "Insight 2"
  ]
}`
      }
    ];

    const aiResponse = await callOpenRouter(messages);
    console.log('AI Response received:', aiResponse.substring(0, 500));

    // Parse AI response with robust error handling
    let forecast = parseAIResponse(aiResponse);

    // If parsing failed, create a structured fallback
    if (!forecast) {
      console.log('Using fallback forecast structure');
      forecast = {
        forecast_summary: {
          metric: metric_name || 'Revenue',
          time_horizon: time_horizon || '12 months',
          methodology: 'AI Analysis'
        },
        predictions: [],
        confidence_intervals: { confidence_level: 75 },
        assumptions: [],
        risk_factors: [],
        accuracy_metrics: { historical_accuracy: 75, model_confidence: 70, data_quality_score: 80 },
        ai_analysis: aiResponse
      };
    }

    // Normalize predictions to ensure proper format
    const normalizedPredictions = normalizePredictions(forecast.predictions);
    console.log('Normalized predictions:', JSON.stringify(normalizedPredictions));

    // Extract accuracy score safely
    const accuracyScore = extractNumber(
      forecast.accuracy_metrics?.model_confidence ||
      forecast.accuracy_metrics?.confidence ||
      forecast.confidence_level,
      75
    );

    // Save to database with normalized data
    const result = await pool.query(
      `INSERT INTO ai_forecasts (company_id, forecast_name, forecast_type, metric_name, time_horizon, historical_data, predictions, confidence_intervals, methodology, assumptions, risk_factors, ai_analysis, accuracy_score, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'generated') RETURNING *`,
      [
        company_id,
        forecast_name,
        forecast_type,
        metric_name || 'Revenue',
        time_horizon || '12 months',
        safeStringify(histData),
        safeStringify(normalizedPredictions),
        safeStringify(forecast.confidence_intervals || { confidence_level: 75 }),
        forecast.forecast_summary?.methodology || forecast.methodology || 'AI Analysis',
        safeStringify(forecast.assumptions || []),
        safeStringify(forecast.risk_factors || []),
        aiResponse,
        accuracyScore
      ]
    );

    // Save to AI responses table for history
    await saveAIResponse(pool, {
      company_id,
      feature_type: 'forecast_generator',
      feature_name: forecast_name,
      source_record_id: result.rows[0].id,
      prompt_summary: `Generate ${forecast_type} forecast for ${metric_name || 'Revenue'}`,
      raw_response: aiResponse,
      parsed_response: forecast,
      response_type: 'forecast',
      model_used: OPENROUTER_MODEL
    });

    res.json({ forecast: result.rows[0], analysis: forecast });
  } catch (error) {
    console.error('Error generating forecast:', error);
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
});

// Analyze existing forecast
router.post('/analyze', async (req, res) => {
  try {
    const { id } = req.body;

    const result = await pool.query(`
      SELECT f.*, c.name as company_name, c.industry
      FROM ai_forecasts f
      LEFT JOIN companies c ON f.company_id = c.id
      WHERE f.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Forecast not found' });
    }

    const forecast = result.rows[0];

    const messages = [
      {
        role: 'system',
        content: 'You are an expert financial analyst. Analyze the forecast and provide strategic insights. Return response as JSON.'
      },
      {
        role: 'user',
        content: `Analyze this forecast for ${forecast.company_name}:

Forecast: ${forecast.forecast_name}
Type: ${forecast.forecast_type}
Metric: ${forecast.metric_name}
Time Horizon: ${forecast.time_horizon}
Predictions: ${JSON.stringify(forecast.predictions)}

Provide analysis as JSON:
{
  "analysis_summary": "Overall assessment of the forecast",
  "trend_analysis": "Description of predicted trends",
  "growth_trajectory": "Expected growth path",
  "inflection_points": ["Key turning points to watch"],
  "strategic_implications": ["Implication 1", "Implication 2"],
  "resource_planning": "Recommendations for resource allocation",
  "contingency_planning": ["Plan A", "Plan B"],
  "monitoring_kpis": ["KPI 1", "KPI 2"]
}`
      }
    ];

    const aiResponse = await callOpenRouter(messages);
    console.log('AI Forecast Analysis received:', aiResponse.substring(0, 200));

    // Parse with robust error handling
    let analysis = parseAIResponse(aiResponse);

    if (!analysis) {
      analysis = {
        analysis_summary: aiResponse,
        strategic_implications: [],
        monitoring_kpis: []
      };
    }

    // Update database
    await pool.query(
      `UPDATE ai_forecasts SET ai_analysis = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [aiResponse, id]
    );

    res.json({ analysis, forecast_id: id });
  } catch (error) {
    console.error('Error analyzing forecast:', error);
    res.status(500).json({ error: 'Failed to analyze forecast' });
  }
});

module.exports = router;
