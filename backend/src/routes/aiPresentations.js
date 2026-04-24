const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { parseAIResponse, ensureArray, safeStringify, saveAIResponse } = require('../utils/aiParser');
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

// Get all presentations
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.name as company_name
      FROM ai_presentations p
      LEFT JOIN companies c ON p.company_id = c.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching presentations:', error);
    res.status(500).json({ error: 'Failed to fetch presentations' });
  }
});

// Get single presentation
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.name as company_name
      FROM ai_presentations p
      LEFT JOIN companies c ON p.company_id = c.id
      WHERE p.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Presentation not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching presentation:', error);
    res.status(500).json({ error: 'Failed to fetch presentation' });
  }
});

// Create presentation
router.post('/', async (req, res) => {
  try {
    const { company_id, title, description, source_type, source_id, theme } = req.body;
    const result = await pool.query(
      `INSERT INTO ai_presentations (company_id, title, description, source_type, source_id, theme)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [company_id, title, description, source_type, source_id, theme || 'professional']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating presentation:', error);
    res.status(500).json({ error: 'Failed to create presentation' });
  }
});

// Update presentation
router.put('/:id', async (req, res) => {
  try {
    const { title, description, slides, theme, status } = req.body;
    const result = await pool.query(
      `UPDATE ai_presentations
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           slides = COALESCE($3, slides),
           theme = COALESCE($4, theme),
           status = COALESCE($5, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`,
      [title, description, slides, theme, status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Presentation not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating presentation:', error);
    res.status(500).json({ error: 'Failed to update presentation' });
  }
});

// Delete presentation
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM ai_presentations WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Presentation not found' });
    }
    res.json({ message: 'Presentation deleted successfully' });
  } catch (error) {
    console.error('Error deleting presentation:', error);
    res.status(500).json({ error: 'Failed to delete presentation' });
  }
});

// Generate presentation with AI
router.post('/generate', async (req, res) => {
  try {
    const { company_id, title, source_type, source_data, theme, num_slides } = req.body;

    const companyResult = await pool.query('SELECT * FROM companies WHERE id = $1', [company_id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const company = companyResult.rows[0];

    const messages = [
      {
        role: 'system',
        content: `You are an expert presentation designer and financial analyst. Create professional, visually appealing presentation slides from financial data. Return your response as a valid JSON object.`
      },
      {
        role: 'user',
        content: `Create EXACTLY ${num_slides || 8} slides for a presentation for ${company.name} with title "${title}".

IMPORTANT: You MUST generate exactly ${num_slides || 8} slides. Do not generate fewer slides.

Source Data Type: ${source_type}
Source Data: ${JSON.stringify(source_data)}
Theme: ${theme || 'professional'}

Generate a JSON object with this structure. Each slide should have slideNumber from 1 to ${num_slides || 8}:
{
  "slides": [
    {"slideNumber": 1, "title": "Title Slide", "type": "title", "content": {"mainTitle": "...", "subtitle": "...", "date": "..."}},
    {"slideNumber": 2, "title": "Executive Summary", "type": "summary", "content": {"keyPoints": ["point 1", "point 2", "point 3"]}},
    {"slideNumber": 3, "title": "Key Financial Metrics", "type": "metrics", "content": {"metrics": [{"name": "Revenue", "value": "..."}, {"name": "Profit", "value": "..."}]}},
    {"slideNumber": 4, "title": "Performance Analysis", "type": "analysis", "content": {"keyPoints": ["insight 1", "insight 2"]}},
    {"slideNumber": 5, "title": "Trends & Insights", "type": "chart", "content": {"keyPoints": ["trend 1", "trend 2"]}},
    {"slideNumber": 6, "title": "Challenges & Risks", "type": "analysis", "content": {"keyPoints": ["risk 1", "risk 2"]}},
    {"slideNumber": 7, "title": "Strategic Recommendations", "type": "recommendation", "content": {"recommendations": [{"title": "...", "description": "..."}]}},
    {"slideNumber": 8, "title": "Conclusion & Next Steps", "type": "conclusion", "content": {"keyPoints": ["conclusion 1", "conclusion 2"]}}
  ],
  "metadata": {"totalSlides": ${num_slides || 8}, "theme": "${theme || 'professional'}"}
}

Generate ALL ${num_slides || 8} slides with relevant financial content based on the source data provided.`
      }
    ];

    // Use higher token limit to ensure all slides are generated
    const aiResponse = await callOpenRouter(messages, 8000);
    console.log('AI Presentation received (length):', aiResponse.length);
    console.log('AI Presentation first 500 chars:', aiResponse.substring(0, 500));

    // Parse with robust error handling
    let slides = parseAIResponse(aiResponse);

    console.log('Parsed slides object:', slides ? 'success' : 'null');
    if (slides && slides.slides) {
      console.log('Number of slides parsed:', slides.slides.length);
    }

    if (!slides) {
      console.log('Using fallback presentation structure');
      slides = {
        slides: [
          { slideNumber: 1, title: 'Title', type: 'title', content: { mainTitle: title, subtitle: company.name } },
          { slideNumber: 2, title: 'Summary', type: 'summary', content: { keyPoints: [aiResponse.substring(0, 500)] } }
        ],
        metadata: { totalSlides: 2, theme: theme || 'professional', generatedAt: new Date().toISOString() },
        rawAnalysis: aiResponse
      };
    }

    // Ensure slides array exists
    if (!slides.slides) {
      slides = { slides: ensureArray(slides), metadata: { totalSlides: 1, theme: theme || 'professional' } };
    }

    // Save to database
    const result = await pool.query(
      `INSERT INTO ai_presentations (company_id, title, description, source_type, slides, theme, ai_generated, status)
       VALUES ($1, $2, $3, $4, $5, $6, true, 'generated') RETURNING *`,
      [company_id, title, `AI-generated presentation from ${source_type}`, source_type, safeStringify(slides), theme || 'professional']
    );

    // Save to AI responses table for history
    await saveAIResponse(pool, {
      company_id,
      feature_type: 'presentation_generator',
      feature_name: title,
      source_record_id: result.rows[0].id,
      prompt_summary: `Generate presentation from ${source_type}`,
      raw_response: aiResponse,
      parsed_response: slides,
      response_type: 'presentation',
      model_used: OPENROUTER_MODEL
    });

    res.json({ presentation: result.rows[0], slides });
  } catch (error) {
    console.error('Error generating presentation:', error);
    res.status(500).json({ error: 'Failed to generate presentation' });
  }
});

module.exports = router;
