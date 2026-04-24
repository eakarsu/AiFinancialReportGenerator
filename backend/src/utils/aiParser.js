/**
 * Utility functions for parsing AI responses
 */

// Parse AI JSON responses with robust error handling
function parseAIResponse(response) {
  if (!response) return null;

  let jsonStr = response;

  // Remove markdown code blocks if present
  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // Try to extract JSON object
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('JSON parse error:', e.message);
    console.error('Failed to parse:', jsonStr.substring(0, 200));
    return null;
  }
}

// Extract numeric value from various formats
function extractNumber(value, defaultVal = 0) {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    // Remove currency symbols, commas, and other non-numeric characters except decimal point
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num)) return num;
  }
  return defaultVal;
}

// Extract array of numbers from a string like "Q1: 450 | Q2: 680"
function extractNumbersFromString(str) {
  if (!str) return [];
  const matches = str.match(/[\d,.]+/g);
  if (!matches) return [];
  return matches.map(m => parseFloat(m.replace(/,/g, ''))).filter(n => !isNaN(n));
}

// Normalize predictions array to ensure consistent format
function normalizePredictions(predictions) {
  if (!Array.isArray(predictions)) {
    // Try to extract from string format
    if (typeof predictions === 'string') {
      const numbers = extractNumbersFromString(predictions);
      return numbers.map((n, i) => ({
        period: `Period ${i + 1}`,
        predicted_value: n,
        growth_rate: 0,
        confidence: 75
      }));
    }
    return [];
  }

  return predictions.map((p, i) => ({
    period: p.period || p.name || `Period ${i + 1}`,
    predicted_value: extractNumber(p.predicted_value || p.value || p.amount, 0),
    growth_rate: extractNumber(p.growth_rate || p.growth, 0),
    confidence: extractNumber(p.confidence || p.confidence_level, 75)
  }));
}

// Ensure value is a valid array
function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // If it's a pipe-separated string, split it
      if (value.includes('|')) {
        return value.split('|').map(s => s.trim()).filter(Boolean);
      }
      return [value];
    }
  }
  return value ? [value] : [];
}

// Safely stringify for database storage
function safeStringify(value) {
  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return value; // Already valid JSON string
    } catch (e) {
      return JSON.stringify(value);
    }
  }
  return JSON.stringify(value || null);
}

// Save AI response to the ai_responses table
async function saveAIResponse(pool, {
  company_id,
  feature_type,
  feature_name,
  source_record_id = null,
  prompt_summary = null,
  raw_response,
  parsed_response = null,
  response_type = 'analysis',
  model_used = null,
  tokens_used = null,
  processing_time_ms = null,
  status = 'completed',
  error_message = null
}) {
  try {
    const result = await pool.query(
      `INSERT INTO ai_responses
       (company_id, feature_type, feature_name, source_record_id, prompt_summary,
        raw_response, parsed_response, response_type, model_used, tokens_used,
        processing_time_ms, status, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        company_id,
        feature_type,
        feature_name,
        source_record_id,
        prompt_summary,
        raw_response,
        parsed_response ? safeStringify(parsed_response) : null,
        response_type,
        model_used,
        tokens_used,
        processing_time_ms,
        status,
        error_message
      ]
    );
    return result.rows[0].id;
  } catch (error) {
    console.error('Error saving AI response:', error);
    return null;
  }
}

module.exports = {
  parseAIResponse,
  extractNumber,
  extractNumbersFromString,
  normalizePredictions,
  ensureArray,
  safeStringify,
  saveAIResponse
};
