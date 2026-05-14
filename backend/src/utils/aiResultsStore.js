/**
 * Idempotent ai_results JSONB store.
 *
 * Provides a single canonical place to persist every AI invocation across
 * the codebase (NLQ, board reports, variance, forecast, audit, expense, etc.).
 * Existing `ai_responses` table predates this; this is an additive layer
 * that always succeeds (best-effort) and never blocks the request.
 */

const pool = require('../config/database');

let initPromise = null;
async function ensureTable() {
  if (initPromise) return initPromise;
  initPromise = pool.query(`
    CREATE TABLE IF NOT EXISTS ai_results (
      id SERIAL PRIMARY KEY,
      feature VARCHAR(120) NOT NULL,
      user_id TEXT,
      company_id TEXT,
      input JSONB,
      output JSONB,
      raw TEXT,
      model VARCHAR(120),
      tokens_in INTEGER,
      tokens_out INTEGER,
      duration_ms INTEGER,
      status VARCHAR(40) DEFAULT 'completed',
      error TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ai_results_feature_idx ON ai_results(feature);
    CREATE INDEX IF NOT EXISTS ai_results_user_idx ON ai_results(user_id);
    CREATE INDEX IF NOT EXISTS ai_results_company_idx ON ai_results(company_id);
    CREATE INDEX IF NOT EXISTS ai_results_created_idx ON ai_results(created_at DESC);
  `);
  return initPromise;
}

async function saveAiResult({
  feature,
  user_id = null,
  company_id = null,
  input = null,
  output = null,
  raw = null,
  model = null,
  tokens_in = null,
  tokens_out = null,
  duration_ms = null,
  status = 'completed',
  error = null,
}) {
  try {
    await ensureTable();
    const result = await pool.query(
      `INSERT INTO ai_results
        (feature, user_id, company_id, input, output, raw, model, tokens_in, tokens_out, duration_ms, status, error)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [
        feature,
        user_id ? String(user_id) : null,
        company_id ? String(company_id) : null,
        input ? JSON.stringify(input) : null,
        output ? JSON.stringify(output) : null,
        raw,
        model,
        tokens_in,
        tokens_out,
        duration_ms,
        status,
        error,
      ]
    );
    return result.rows[0].id;
  } catch (e) {
    console.warn('[ai_results] persist failed (non-fatal):', e.message);
    return null;
  }
}

module.exports = { saveAiResult, ensureTable };
