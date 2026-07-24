const express = require('express');
const { authenticate } = require('./identityRouter');
const { callOpenRouter } = require('../src/services/openrouter');
const { saveAiResult } = require('../src/utils/aiResultsStore');

const router = express.Router();

router.post('/report-brief', authenticate, async (req, res, next) => {
  try {
    const prompt = String(req.body?.prompt || '').trim();
    if (prompt.length < 20) return res.status(400).json({ error: 'prompt must contain at least 20 characters' });
    const result = await callOpenRouter([
      { role: 'system', content: 'You are a financial reporting operations assistant. Provide a concise non-advisory brief, state assumptions, and require accountant review.' },
      { role: 'user', content: prompt },
    ], { temperature: 0.2, maxTokens: 1200, title: 'Governed Financial Report Brief' });
    if (!String(result.content || '').trim()) throw new Error('OpenRouter returned empty content');
    const id = await saveAiResult({
      feature: 'governed-report-brief', user_id: req.user.id, input: { prompt },
      output: { brief: result.content }, raw: result.content, model: result.model,
      tokens_in: result.usage?.prompt_tokens, tokens_out: result.usage?.completion_tokens,
    });
    if (!id) throw new Error('AI result persistence failed');
    return res.json({ id, brief: result.content, model: result.model, accountantReviewRequired: true });
  } catch (error) { return next(error); }
});

module.exports = router;
