const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { parseAIResponse, extractNumber, ensureArray, safeStringify, saveAIResponse } = require('../utils/aiParser');
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

// Get all audit analyses
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT aa.*, c.name as company_name
      FROM ai_audit_analyses aa
      LEFT JOIN companies c ON aa.company_id = c.id
      ORDER BY aa.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching audit analyses:', error);
    res.status(500).json({ error: 'Failed to fetch audit analyses' });
  }
});

// Get single audit analysis
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT aa.*, c.name as company_name
      FROM ai_audit_analyses aa
      LEFT JOIN companies c ON aa.company_id = c.id
      WHERE aa.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit analysis not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching audit analysis:', error);
    res.status(500).json({ error: 'Failed to fetch audit analysis' });
  }
});

// Create audit analysis
router.post('/', async (req, res) => {
  try {
    const { company_id, analysis_name, analysis_period } = req.body;
    const result = await pool.query(
      `INSERT INTO ai_audit_analyses (company_id, analysis_name, analysis_period)
       VALUES ($1, $2, $3) RETURNING *`,
      [company_id, analysis_name, analysis_period]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating audit analysis:', error);
    res.status(500).json({ error: 'Failed to create audit analysis' });
  }
});

// Update audit analysis
router.put('/:id', async (req, res) => {
  try {
    const { analysis_name, analysis_period, status } = req.body;
    const result = await pool.query(
      `UPDATE ai_audit_analyses
       SET analysis_name = COALESCE($1, analysis_name),
           analysis_period = COALESCE($2, analysis_period),
           status = COALESCE($3, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [analysis_name, analysis_period, status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit analysis not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating audit analysis:', error);
    res.status(500).json({ error: 'Failed to update audit analysis' });
  }
});

// Delete audit analysis
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM ai_audit_analyses WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit analysis not found' });
    }
    res.json({ message: 'Audit analysis deleted successfully' });
  } catch (error) {
    console.error('Error deleting audit analysis:', error);
    res.status(500).json({ error: 'Failed to delete audit analysis' });
  }
});

// Generate comprehensive audit trail analysis
router.post('/analyze', async (req, res) => {
  try {
    const { company_id, analysis_name, analysis_period } = req.body;

    const companyResult = await pool.query('SELECT * FROM companies WHERE id = $1', [company_id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const company = companyResult.rows[0];

    // Get audit logs
    const auditResult = await pool.query(`
      SELECT al.*, u.name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.company_id = $1
      ORDER BY al.created_at DESC
      LIMIT 100
    `, [company_id]);

    // Get compliance reports
    const complianceResult = await pool.query(`
      SELECT * FROM compliance_reports WHERE company_id = $1 ORDER BY created_at DESC LIMIT 10
    `, [company_id]);

    const messages = [
      {
        role: 'system',
        content: `You are an expert compliance auditor and security analyst. Analyze audit trails for compliance documentation and risk assessment. Return your response as a valid JSON object.`
      },
      {
        role: 'user',
        content: `Analyze the audit trail for ${company.name} (${company.industry} industry) for ${analysis_period}:

Audit Logs (${auditResult.rows.length} events): ${JSON.stringify(auditResult.rows.slice(0, 50))}

Compliance Reports: ${JSON.stringify(complianceResult.rows)}

Provide comprehensive audit trail analysis as JSON:
{
  "executive_summary": {
    "overall_assessment": "Summary of audit trail health",
    "risk_level": "low/medium/high/critical",
    "compliance_status": "compliant/partially_compliant/non_compliant",
    "key_findings_count": 5
  },
  "statistics": {
    "total_events_analyzed": ${auditResult.rows.length},
    "events_by_action": {
      "CREATE": 0,
      "UPDATE": 0,
      "DELETE": 0,
      "VIEW": 0,
      "EXPORT": 0,
      "APPROVE": 0
    },
    "events_by_risk_level": {
      "low": 0,
      "medium": 0,
      "high": 0
    },
    "unique_users": 0,
    "unique_entities": 0
  },
  "risk_assessment": {
    "overall_risk_score": 65,
    "risk_factors": [
      {
        "factor": "Risk description",
        "severity": "high/medium/low",
        "likelihood": "high/medium/low",
        "impact": "Description of potential impact"
      }
    ],
    "risk_trend": "increasing/stable/decreasing"
  },
  "compliance_analysis": {
    "compliance_score": 85,
    "frameworks_assessed": ["SOX", "GDPR", "GAAP"],
    "gaps_identified": [
      {
        "gap": "Description of compliance gap",
        "regulation": "Relevant regulation",
        "severity": "high/medium/low",
        "remediation": "Suggested fix"
      }
    ]
  },
  "high_risk_events": [
    {
      "event_type": "Event description",
      "user": "User name",
      "timestamp": "Date/time",
      "risk_reason": "Why this is high risk",
      "recommended_action": "What to do"
    }
  ],
  "patterns_detected": [
    {
      "pattern": "Pattern description",
      "frequency": "How often observed",
      "concern_level": "high/medium/low",
      "explanation": "Why this pattern matters"
    }
  ],
  "user_behavior_analysis": [
    {
      "user": "User name",
      "activity_level": "high/medium/low",
      "risk_indicators": ["Indicator 1"],
      "recommendation": "Action to take"
    }
  ],
  "recommendations": [
    {
      "recommendation": "Specific action to take",
      "priority": "high/medium/low",
      "category": "security/compliance/operational",
      "expected_impact": "Expected outcome"
    }
  ],
  "documentation_checklist": [
    {
      "item": "Documentation requirement",
      "status": "complete/incomplete/partial",
      "due_date": "Date if applicable"
    }
  ],
  "next_steps": [
    "Immediate action 1",
    "Immediate action 2"
  ]
}`
      }
    ];

    const aiResponse = await callOpenRouter(messages);
    console.log('AI Audit Analysis received:', aiResponse.substring(0, 300));

    // Parse with robust error handling
    let analysis = parseAIResponse(aiResponse);

    if (!analysis) {
      console.log('Using fallback audit analysis structure');
      analysis = {
        executive_summary: { overall_assessment: aiResponse, risk_level: 'medium', compliance_status: 'partially_compliant' },
        statistics: { total_events_analyzed: auditResult.rows.length },
        risk_assessment: { overall_risk_score: 65 },
        compliance_analysis: { compliance_score: 75, gaps_identified: [] },
        high_risk_events: [],
        patterns_detected: [],
        recommendations: [{ recommendation: 'Review detailed audit analysis', priority: 'high', category: 'compliance' }]
      };
    }

    // Calculate scores with safe extraction
    const riskScore = extractNumber(analysis.risk_assessment?.overall_risk_score, 65);
    const complianceScore = extractNumber(analysis.compliance_analysis?.compliance_score, 75);

    // Create a clean summary from parsed data
    const aiSummary = analysis.executive_summary
      ? JSON.stringify(analysis.executive_summary)
      : (analysis.overall_assessment || analysis.summary || 'Analysis completed');

    // Save to database with normalized data
    const result = await pool.query(
      `INSERT INTO ai_audit_analyses (company_id, analysis_name, analysis_period, total_events_analyzed, risk_score, compliance_score, findings, high_risk_events, patterns_detected, recommendations, ai_summary, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'completed') RETURNING *`,
      [
        company_id,
        analysis_name || `Audit Analysis - ${analysis_period}`,
        analysis_period,
        auditResult.rows.length,
        riskScore,
        complianceScore,
        safeStringify(analysis.compliance_analysis?.gaps_identified || []),
        safeStringify(analysis.high_risk_events || []),
        safeStringify(analysis.patterns_detected || []),
        safeStringify(analysis.recommendations || []),
        aiSummary
      ]
    );

    // Save to AI responses table for history
    await saveAIResponse(pool, {
      company_id,
      feature_type: 'audit_analyzer',
      feature_name: analysis_name || `Audit Analysis - ${analysis_period}`,
      source_record_id: result.rows[0].id,
      prompt_summary: `Analyze ${auditResult.rows.length} audit events for ${analysis_period}`,
      raw_response: aiResponse,
      parsed_response: analysis,
      response_type: 'analysis',
      model_used: OPENROUTER_MODEL
    });

    res.json({ audit_analysis: result.rows[0], analysis });
  } catch (error) {
    console.error('Error analyzing audit trail:', error);
    res.status(500).json({ error: 'Failed to analyze audit trail' });
  }
});

// Analyze specific audit log
router.post('/analyze-event', async (req, res) => {
  try {
    const { audit_log_id } = req.body;

    const result = await pool.query(`
      SELECT al.*, c.name as company_name, u.name as user_name
      FROM audit_logs al
      LEFT JOIN companies c ON al.company_id = c.id
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = $1
    `, [audit_log_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    const auditLog = result.rows[0];

    const messages = [
      {
        role: 'system',
        content: 'You are a security and compliance expert. Analyze individual audit events for risk and compliance implications. Return response as JSON.'
      },
      {
        role: 'user',
        content: `Analyze this audit event for ${auditLog.company_name}:

User: ${auditLog.user_name}
Action: ${auditLog.action}
Entity Type: ${auditLog.entity_type}
IP Address: ${auditLog.ip_address}
Risk Level: ${auditLog.risk_level}
Old Values: ${JSON.stringify(auditLog.old_values)}
New Values: ${JSON.stringify(auditLog.new_values)}

Provide analysis as JSON:
{
  "risk_assessment": {
    "risk_score": 0-100,
    "risk_level": "low/medium/high/critical",
    "risk_factors": ["Factor 1", "Factor 2"]
  },
  "compliance_implications": ["Implication 1", "Implication 2"],
  "security_concerns": ["Concern 1", "Concern 2"],
  "data_sensitivity": "low/medium/high",
  "recommended_actions": ["Action 1", "Action 2"],
  "investigation_needed": true/false,
  "investigation_reason": "Why investigation is needed"
}`
      }
    ];

    const aiResponse = await callOpenRouter(messages);
    console.log('AI Event Analysis received:', aiResponse.substring(0, 200));

    // Parse with robust error handling
    let analysis = parseAIResponse(aiResponse);

    if (!analysis) {
      analysis = {
        risk_assessment: { risk_level: 'medium', risk_factors: [aiResponse] },
        compliance_implications: [],
        recommended_actions: []
      };
    }

    // Update audit log with AI assessment
    await pool.query(
      'UPDATE audit_logs SET ai_risk_assessment = $1 WHERE id = $2',
      [aiResponse, audit_log_id]
    );

    res.json({ analysis, audit_log_id });
  } catch (error) {
    console.error('Error analyzing audit event:', error);
    res.status(500).json({ error: 'Failed to analyze audit event' });
  }
});

module.exports = router;
