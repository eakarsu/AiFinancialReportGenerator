const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all scheduled reports
router.get('/', async (req, res) => {
  try {
    const { company_id } = req.query;
    let query = `
      SELECT sr.*, c.name as company_name
      FROM scheduled_reports sr
      LEFT JOIN companies c ON sr.company_id = c.id
    `;
    const params = [];

    if (company_id) {
      query += ' WHERE sr.company_id = $1';
      params.push(company_id);
    }

    query += ' ORDER BY sr.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching scheduled reports:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single scheduled report
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT sr.*, c.name as company_name
       FROM scheduled_reports sr
       LEFT JOIN companies c ON sr.company_id = c.id
       WHERE sr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scheduled report not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching scheduled report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create scheduled report
router.post('/', async (req, res) => {
  try {
    const {
      company_id,
      report_name,
      report_type,
      schedule_frequency,
      schedule_day,
      schedule_time,
      recipients,
      include_sections,
      format,
      is_active
    } = req.body;

    const result = await pool.query(
      `INSERT INTO scheduled_reports
       (company_id, report_name, report_type, schedule_frequency, schedule_day, schedule_time, recipients, include_sections, format, is_active, next_run)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        company_id,
        report_name,
        report_type,
        schedule_frequency,
        schedule_day || null,
        schedule_time || '09:00',
        recipients || [],
        include_sections || ['summary', 'balance_sheet', 'profit_loss', 'kpis'],
        format || 'pdf',
        is_active !== false,
        calculateNextRun(schedule_frequency, schedule_day, schedule_time)
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating scheduled report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update scheduled report
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      report_name,
      report_type,
      schedule_frequency,
      schedule_day,
      schedule_time,
      recipients,
      include_sections,
      format,
      is_active
    } = req.body;

    const result = await pool.query(
      `UPDATE scheduled_reports SET
       report_name = COALESCE($1, report_name),
       report_type = COALESCE($2, report_type),
       schedule_frequency = COALESCE($3, schedule_frequency),
       schedule_day = $4,
       schedule_time = COALESCE($5, schedule_time),
       recipients = COALESCE($6, recipients),
       include_sections = COALESCE($7, include_sections),
       format = COALESCE($8, format),
       is_active = COALESCE($9, is_active),
       next_run = $10,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [
        report_name,
        report_type,
        schedule_frequency,
        schedule_day,
        schedule_time,
        recipients,
        include_sections,
        format,
        is_active,
        calculateNextRun(schedule_frequency, schedule_day, schedule_time),
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scheduled report not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating scheduled report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete scheduled report
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM scheduled_reports WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scheduled report not found' });
    }

    res.json({ message: 'Scheduled report deleted successfully' });
  } catch (error) {
    console.error('Error deleting scheduled report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manually trigger a scheduled report
router.post('/:id/run', async (req, res) => {
  try {
    const { id } = req.params;

    const reportResult = await pool.query(
      'SELECT * FROM scheduled_reports WHERE id = $1',
      [id]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Scheduled report not found' });
    }

    const report = reportResult.rows[0];

    // Log the execution start
    const logResult = await pool.query(
      `INSERT INTO report_execution_logs
       (scheduled_report_id, company_id, status, started_at)
       VALUES ($1, $2, 'running', CURRENT_TIMESTAMP)
       RETURNING *`,
      [id, report.company_id]
    );
    const logId = logResult.rows[0].id;

    try {
      // Get company data
      const companyResult = await pool.query(
        'SELECT * FROM companies WHERE id = $1',
        [report.company_id]
      );
      const company = companyResult.rows[0];

      // Get financial data
      const [balanceSheet, profitLoss] = await Promise.all([
        pool.query(
          'SELECT * FROM balance_sheets WHERE company_id = $1 ORDER BY as_of_date DESC LIMIT 1',
          [report.company_id]
        ),
        pool.query(
          'SELECT * FROM profit_loss_records WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1',
          [report.company_id]
        )
      ]);

      const bs = balanceSheet.rows[0] || {};
      const pl = profitLoss.rows[0] || {};

      // Generate report content
      const reportContent = {
        reportName: report.report_name,
        reportType: report.report_type,
        generatedAt: new Date().toISOString(),
        company: {
          name: company?.name || 'Unknown Company',
          industry: company?.industry || 'N/A'
        },
        sections: {}
      };

      const sections = report.include_sections || ['summary', 'balance_sheet', 'profit_loss', 'kpis'];

      if (sections.includes('summary')) {
        reportContent.sections.summary = {
          title: 'Executive Summary',
          revenue: parseFloat(pl.revenue) || 0,
          netIncome: parseFloat(pl.net_income) || 0,
          totalAssets: parseFloat(bs.total_assets) || 0,
          totalLiabilities: parseFloat(bs.total_liabilities) || 0,
          equity: (parseFloat(bs.total_assets) || 0) - (parseFloat(bs.total_liabilities) || 0)
        };
      }

      if (sections.includes('balance_sheet')) {
        reportContent.sections.balanceSheet = {
          title: 'Balance Sheet',
          asOfDate: bs.as_of_date || new Date().toISOString(),
          currentAssets: parseFloat(bs.current_assets) || 0,
          nonCurrentAssets: parseFloat(bs.non_current_assets) || 0,
          totalAssets: parseFloat(bs.total_assets) || 0,
          currentLiabilities: parseFloat(bs.current_liabilities) || 0,
          nonCurrentLiabilities: parseFloat(bs.non_current_liabilities) || 0,
          totalLiabilities: parseFloat(bs.total_liabilities) || 0,
          equity: parseFloat(bs.equity) || 0
        };
      }

      if (sections.includes('profit_loss')) {
        reportContent.sections.profitLoss = {
          title: 'Profit & Loss',
          revenue: parseFloat(pl.revenue) || 0,
          costOfGoodsSold: parseFloat(pl.cost_of_goods_sold) || 0,
          grossProfit: parseFloat(pl.gross_profit) || 0,
          operatingExpenses: parseFloat(pl.operating_expenses) || 0,
          operatingIncome: parseFloat(pl.operating_income) || 0,
          netIncome: parseFloat(pl.net_income) || 0
        };
      }

      if (sections.includes('kpis')) {
        const revenue = parseFloat(pl.revenue) || 1;
        const netIncome = parseFloat(pl.net_income) || 0;
        const totalAssets = parseFloat(bs.total_assets) || 1;
        const totalLiabilities = parseFloat(bs.total_liabilities) || 0;
        const equity = totalAssets - totalLiabilities || 1;

        reportContent.sections.kpis = {
          title: 'Key Performance Indicators',
          profitMargin: ((netIncome / revenue) * 100).toFixed(2) + '%',
          returnOnAssets: ((netIncome / totalAssets) * 100).toFixed(2) + '%',
          returnOnEquity: ((netIncome / equity) * 100).toFixed(2) + '%',
          debtToEquity: (totalLiabilities / equity).toFixed(2),
          currentRatio: ((parseFloat(bs.current_assets) || 0) / (parseFloat(bs.current_liabilities) || 1)).toFixed(2)
        };
      }

      // Get AI Analysis
      try {
        const OpenAI = require('openai');
        const openai = new OpenAI({
          baseURL: 'https://openrouter.ai/api/v1',
          apiKey: process.env.OPENROUTER_API_KEY,
        });

        const aiResponse = await openai.chat.completions.create({
          model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
          messages: [
            {
              role: 'system',
              content: 'You are a financial analyst providing executive summaries and insights for financial reports.'
            },
            {
              role: 'user',
              content: `Generate an executive analysis for ${company?.name || 'this company'} based on the following financial data:

Revenue: $${parseFloat(pl.revenue)?.toLocaleString() || 'N/A'}
Net Income: $${parseFloat(pl.net_income)?.toLocaleString() || 'N/A'}
Gross Profit: $${parseFloat(pl.gross_profit)?.toLocaleString() || 'N/A'}
Total Assets: $${parseFloat(bs.total_assets)?.toLocaleString() || 'N/A'}
Total Liabilities: $${parseFloat(bs.total_liabilities)?.toLocaleString() || 'N/A'}
Current Assets: $${parseFloat(bs.current_assets)?.toLocaleString() || 'N/A'}
Current Liabilities: $${parseFloat(bs.current_liabilities)?.toLocaleString() || 'N/A'}

Provide analysis as JSON with these keys:
{
  "executiveSummary": "2-3 sentence overview of the company's financial health",
  "keyInsights": ["insight1", "insight2", "insight3"],
  "recommendations": ["recommendation1", "recommendation2"],
  "riskAreas": ["risk1", "risk2"],
  "outlook": "Brief outlook statement"
}`
            }
          ],
          temperature: 0.3,
        });

        let aiAnalysis;
        try {
          const jsonMatch = aiResponse.choices[0].message.content.match(/\{[\s\S]*\}/);
          aiAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { executiveSummary: aiResponse.choices[0].message.content };
        } catch {
          aiAnalysis = { executiveSummary: aiResponse.choices[0].message.content };
        }

        reportContent.aiAnalysis = aiAnalysis;
      } catch (aiError) {
        console.error('AI analysis error:', aiError.message);
        reportContent.aiAnalysis = { error: 'AI analysis unavailable' };
      }

      // Update log to completed
      await pool.query(
        `UPDATE report_execution_logs SET
         status = 'completed',
         completed_at = CURRENT_TIMESTAMP,
         recipients_notified = $1
         WHERE id = $2`,
        [report.recipients?.length || 0, logId]
      );

      // Update last_run and next_run
      await pool.query(
        `UPDATE scheduled_reports SET
         last_run = CURRENT_TIMESTAMP,
         next_run = $1
         WHERE id = $2`,
        [calculateNextRun(report.schedule_frequency, report.schedule_day, report.schedule_time), id]
      );

      res.json({
        message: 'Report generated successfully',
        report: reportContent,
        executedAt: new Date().toISOString()
      });

    } catch (genError) {
      // Update log to failed
      await pool.query(
        `UPDATE report_execution_logs SET
         status = 'failed',
         completed_at = CURRENT_TIMESTAMP,
         error_message = $1
         WHERE id = $2`,
        [genError.message, logId]
      );
      throw genError;
    }
  } catch (error) {
    console.error('Error running scheduled report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get execution history for a scheduled report
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM report_execution_logs
       WHERE scheduled_report_id = $1
       ORDER BY started_at DESC
       LIMIT 20`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching execution history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate next run time
function calculateNextRun(frequency, day, time) {
  const now = new Date();
  const [hours, minutes] = (time || '09:00').split(':').map(Number);

  let nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case 'daily':
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;
    case 'weekly':
      const targetDay = day || 1; // Monday by default
      const currentDay = nextRun.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0 || (daysUntil === 0 && nextRun <= now)) {
        daysUntil += 7;
      }
      nextRun.setDate(nextRun.getDate() + daysUntil);
      break;
    case 'monthly':
      const targetDate = day || 1;
      nextRun.setDate(targetDate);
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      break;
    case 'quarterly':
      const currentMonth = nextRun.getMonth();
      const nextQuarterMonth = Math.ceil((currentMonth + 1) / 3) * 3;
      nextRun.setMonth(nextQuarterMonth);
      nextRun.setDate(day || 1);
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 3);
      }
      break;
    default:
      nextRun.setDate(nextRun.getDate() + 1);
  }

  return nextRun.toISOString();
}

module.exports = router;
