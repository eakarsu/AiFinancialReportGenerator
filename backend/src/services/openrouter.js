/**
 * Centralized OpenRouter helper for AI Financial Report Generator.
 *
 * Replaces ~9 copies of `callOpenRouter` previously duplicated across route
 * files (ai.js, aiBoardReportWriter.js, aiAuditAnalyzer.js, etc.).
 *
 * Usage:
 *   const { callOpenRouter, parseAIJson } = require('../services/openrouter');
 *   const text = await callOpenRouter([{ role: 'user', content: 'hi' }]);
 *   const obj = parseAIJson(text);
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

async function callOpenRouter(messages, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY env var is required');
  }
  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxTokens = 2000,
    referer = process.env.OPENROUTER_REFERER || 'http://localhost:3000',
    title = 'AI Financial Report Generator',
  } = options;

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': referer,
      'X-Title': title,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${error}`);
  }
  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    usage: data.usage || null,
    model: data.model || model,
    raw: data,
  };
}

/**
 * 3-strategy JSON parser for LLM responses.
 *  1. Strip ```json fences and parse.
 *  2. Find first {...} block via regex.
 *  3. Find first [...] block via regex.
 * Returns null on total failure.
 */
function parseAIJson(text) {
  if (!text || typeof text !== 'string') return null;

  // Strategy 1: code fences
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch (_) {
      // fall through
    }
  }

  // Strategy 2: object
  const obj = text.match(/\{[\s\S]*\}/);
  if (obj) {
    try {
      return JSON.parse(obj[0]);
    } catch (_) {
      // fall through
    }
  }

  // Strategy 3: array
  const arr = text.match(/\[[\s\S]*\]/);
  if (arr) {
    try {
      return JSON.parse(arr[0]);
    } catch (_) {
      // fall through
    }
  }

  // Final: try raw
  try {
    return JSON.parse(text.trim());
  } catch (_) {
    return null;
  }
}

module.exports = { callOpenRouter, parseAIJson, DEFAULT_MODEL };
