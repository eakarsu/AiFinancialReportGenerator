const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get peer comparison data for multiple companies
router.get('/compare', async (req, res) => {
  try {
    const { company_ids } = req.query;

    if (!company_ids) {
      return res.status(400).json({ error: 'company_ids parameter is required' });
    }

    const ids = company_ids.split(',');

    // Get company info
    const companiesResult = await pool.query(
      `SELECT * FROM companies WHERE id = ANY($1)`,
      [ids]
    );

    // Get latest balance sheets for each company
    const balanceSheetsResult = await pool.query(
      `SELECT DISTINCT ON (company_id) *
       FROM balance_sheets
       WHERE company_id = ANY($1)
       ORDER BY company_id, as_of_date DESC`,
      [ids]
    );

    // Get latest P&L for each company
    const profitLossResult = await pool.query(
      `SELECT DISTINCT ON (company_id) *
       FROM profit_loss_records
       WHERE company_id = ANY($1)
       ORDER BY company_id, created_at DESC`,
      [ids]
    );

    // Get KPIs for each company
    const kpisResult = await pool.query(
      `SELECT company_id, metric_name, current_value, target_value, trend, unit
       FROM kpi_metrics
       WHERE company_id = ANY($1)
       ORDER BY company_id, metric_name`,
      [ids]
    );

    // Build comparison data
    const comparison = companiesResult.rows.map(company => {
      const bs = balanceSheetsResult.rows.find(b => b.company_id === company.id) || {};
      const pl = profitLossResult.rows.find(p => p.company_id === company.id) || {};
      const kpis = kpisResult.rows.filter(k => k.company_id === company.id);

      return {
        company: {
          id: company.id,
          name: company.name,
          industry: company.industry,
        },
        financials: {
          totalAssets: parseFloat(bs.total_assets) || 0,
          totalLiabilities: parseFloat(bs.total_liabilities) || 0,
          shareholdersEquity: parseFloat(bs.shareholders_equity) || 0,
          revenue: parseFloat(pl.revenue) || 0,
          netIncome: parseFloat(pl.net_income) || 0,
          grossProfit: parseFloat(pl.gross_profit) || 0,
          operatingIncome: parseFloat(pl.operating_income) || 0,
        },
        ratios: {
          currentRatio: bs.current_assets && bs.current_liabilities
            ? (parseFloat(bs.current_assets) / parseFloat(bs.current_liabilities)).toFixed(2)
            : null,
          debtToEquity: bs.total_liabilities && bs.shareholders_equity
            ? (parseFloat(bs.total_liabilities) / parseFloat(bs.shareholders_equity)).toFixed(2)
            : null,
          grossMargin: pl.revenue && pl.gross_profit
            ? ((parseFloat(pl.gross_profit) / parseFloat(pl.revenue)) * 100).toFixed(2)
            : null,
          netMargin: pl.revenue && pl.net_income
            ? ((parseFloat(pl.net_income) / parseFloat(pl.revenue)) * 100).toFixed(2)
            : null,
          roa: pl.net_income && bs.total_assets
            ? ((parseFloat(pl.net_income) / parseFloat(bs.total_assets)) * 100).toFixed(2)
            : null,
          roe: pl.net_income && bs.shareholders_equity
            ? ((parseFloat(pl.net_income) / parseFloat(bs.shareholders_equity)) * 100).toFixed(2)
            : null,
        },
        kpis: kpis,
        asOfDate: bs.as_of_date,
        period: pl.period,
      };
    });

    res.json({
      companies: comparison,
      comparedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting peer comparison:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get AI analysis of peer comparison
router.post('/analyze', async (req, res) => {
  try {
    const { company_ids } = req.body;

    if (!company_ids || company_ids.length < 2) {
      return res.status(400).json({ error: 'At least 2 company_ids are required' });
    }

    // Get comparison data
    const companiesResult = await pool.query(
      `SELECT * FROM companies WHERE id = ANY($1)`,
      [company_ids]
    );

    const balanceSheetsResult = await pool.query(
      `SELECT DISTINCT ON (company_id) *
       FROM balance_sheets
       WHERE company_id = ANY($1)
       ORDER BY company_id, as_of_date DESC`,
      [company_ids]
    );

    const profitLossResult = await pool.query(
      `SELECT DISTINCT ON (company_id) *
       FROM profit_loss_records
       WHERE company_id = ANY($1)
       ORDER BY company_id, created_at DESC`,
      [company_ids]
    );

    // Build comparison data for AI
    const companyData = companiesResult.rows.map(company => {
      const bs = balanceSheetsResult.rows.find(b => b.company_id === company.id) || {};
      const pl = profitLossResult.rows.find(p => p.company_id === company.id) || {};

      return {
        name: company.name,
        industry: company.industry,
        totalAssets: bs.total_assets,
        totalLiabilities: bs.total_liabilities,
        shareholdersEquity: bs.shareholders_equity,
        revenue: pl.revenue,
        netIncome: pl.net_income,
        grossProfit: pl.gross_profit,
      };
    });

    const OpenAI = require('openai');
    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
      messages: [
        {
          role: 'system',
          content: `You are an expert financial analyst specializing in competitive analysis and peer comparison. Provide detailed, actionable insights.`
        },
        {
          role: 'user',
          content: `Analyze and compare these companies:

${companyData.map((c, i) => `
COMPANY ${i + 1}: ${c.name}
Industry: ${c.industry}
Total Assets: $${c.totalAssets}
Total Liabilities: $${c.totalLiabilities}
Shareholders Equity: $${c.shareholdersEquity}
Revenue: $${c.revenue}
Net Income: $${c.netIncome}
Gross Profit: $${c.grossProfit}
`).join('\n')}

Provide a comprehensive peer comparison analysis including:
1. Overall ranking and who is performing best
2. Strengths and weaknesses of each company
3. Key differentiators
4. Areas where each company excels
5. Recommendations for improvement for each company

Format as JSON with keys: ranking (array), strengths (object by company name), weaknesses (object by company name), differentiators (array), recommendations (object by company name), summary (string)`
        }
      ],
      temperature: 0.3,
    });

    const analysisText = response.choices[0].message.content;
    let analysis;

    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: analysisText };
    } catch {
      analysis = { raw: analysisText };
    }

    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing peer comparison:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get industry benchmarks
router.get('/benchmarks', async (req, res) => {
  try {
    const { industry } = req.query;

    const benchmarks = {
      technology: {
        currentRatio: { p25: 1.5, p50: 2.5, p75: 4.0 },
        debtToEquity: { p25: 0.2, p50: 0.5, p75: 1.0 },
        grossMargin: { p25: 45, p50: 60, p75: 75 },
        netMargin: { p25: 8, p50: 15, p75: 25 },
        roa: { p25: 5, p50: 10, p75: 18 },
        roe: { p25: 10, p50: 18, p75: 28 },
        revenueGrowth: { p25: 10, p50: 20, p75: 35 },
      },
      healthcare: {
        currentRatio: { p25: 1.3, p50: 2.0, p75: 3.0 },
        debtToEquity: { p25: 0.3, p50: 0.6, p75: 1.2 },
        grossMargin: { p25: 35, p50: 50, p75: 65 },
        netMargin: { p25: 6, p50: 12, p75: 20 },
        roa: { p25: 4, p50: 8, p75: 15 },
        roe: { p25: 8, p50: 15, p75: 25 },
        revenueGrowth: { p25: 5, p50: 12, p75: 22 },
      },
      retail: {
        currentRatio: { p25: 1.0, p50: 1.5, p75: 2.2 },
        debtToEquity: { p25: 0.5, p50: 1.0, p75: 2.0 },
        grossMargin: { p25: 25, p50: 35, p75: 45 },
        netMargin: { p25: 2, p50: 5, p75: 8 },
        roa: { p25: 3, p50: 6, p75: 12 },
        roe: { p25: 8, p50: 14, p75: 22 },
        revenueGrowth: { p25: 3, p50: 8, p75: 15 },
      },
      manufacturing: {
        currentRatio: { p25: 1.2, p50: 1.8, p75: 2.5 },
        debtToEquity: { p25: 0.4, p50: 0.8, p75: 1.5 },
        grossMargin: { p25: 20, p50: 30, p75: 42 },
        netMargin: { p25: 4, p50: 8, p75: 14 },
        roa: { p25: 4, p50: 7, p75: 12 },
        roe: { p25: 10, p50: 15, p75: 22 },
        revenueGrowth: { p25: 2, p50: 6, p75: 12 },
      },
      financial: {
        currentRatio: { p25: 1.0, p50: 1.2, p75: 1.5 },
        debtToEquity: { p25: 3.0, p50: 6.0, p75: 10.0 },
        grossMargin: { p25: 55, p50: 70, p75: 82 },
        netMargin: { p25: 15, p50: 25, p75: 35 },
        roa: { p25: 0.8, p50: 1.2, p75: 2.0 },
        roe: { p25: 8, p50: 12, p75: 18 },
        revenueGrowth: { p25: 5, p50: 10, p75: 18 },
      },
    };

    if (industry && benchmarks[industry.toLowerCase()]) {
      res.json({
        industry: industry,
        benchmarks: benchmarks[industry.toLowerCase()]
      });
    } else {
      res.json({
        availableIndustries: Object.keys(benchmarks),
        benchmarks: benchmarks
      });
    }
  } catch (error) {
    console.error('Error fetching benchmarks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get companies for comparison selection
router.get('/companies', async (req, res) => {
  try {
    const { industry } = req.query;

    let query = `
      SELECT c.id, c.name, c.industry,
             (SELECT COUNT(*) FROM balance_sheets WHERE company_id = c.id) as has_balance_sheet,
             (SELECT COUNT(*) FROM profit_loss_records WHERE company_id = c.id) as has_profit_loss
      FROM companies c
    `;
    const params = [];

    if (industry) {
      query += ' WHERE c.industry = $1';
      params.push(industry);
    }

    query += ' ORDER BY c.name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
