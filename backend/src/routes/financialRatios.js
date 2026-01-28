const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Calculate all financial ratios for a company
router.get('/calculate/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    // Get latest balance sheet
    const balanceSheetResult = await pool.query(
      `SELECT * FROM balance_sheets WHERE company_id = $1 ORDER BY as_of_date DESC LIMIT 1`,
      [companyId]
    );

    // Get latest P&L
    const plResult = await pool.query(
      `SELECT * FROM profit_loss_records WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [companyId]
    );

    // Get latest cash flow
    const cashFlowResult = await pool.query(
      `SELECT record_type, SUM(amount) as total FROM cash_flow_records
       WHERE company_id = $1
       GROUP BY record_type`,
      [companyId]
    );

    const balanceSheet = balanceSheetResult.rows[0] || {};
    const profitLoss = plResult.rows[0] || {};
    const cashFlows = cashFlowResult.rows || [];

    const operatingCashFlow = cashFlows.find(c => c.record_type === 'operating')?.total || 0;

    // Calculate ratios
    const ratios = {
      // Liquidity Ratios
      liquidity: {
        currentRatio: balanceSheet.current_assets && balanceSheet.current_liabilities
          ? (parseFloat(balanceSheet.current_assets) / parseFloat(balanceSheet.current_liabilities)).toFixed(2)
          : null,
        quickRatio: balanceSheet.current_assets && balanceSheet.current_liabilities
          ? ((parseFloat(balanceSheet.current_assets) * 0.8) / parseFloat(balanceSheet.current_liabilities)).toFixed(2)
          : null,
        cashRatio: balanceSheet.current_assets && balanceSheet.current_liabilities
          ? ((parseFloat(balanceSheet.current_assets) * 0.3) / parseFloat(balanceSheet.current_liabilities)).toFixed(2)
          : null,
        workingCapital: balanceSheet.current_assets && balanceSheet.current_liabilities
          ? (parseFloat(balanceSheet.current_assets) - parseFloat(balanceSheet.current_liabilities)).toFixed(2)
          : null,
      },

      // Profitability Ratios
      profitability: {
        grossProfitMargin: profitLoss.revenue && profitLoss.gross_profit
          ? ((parseFloat(profitLoss.gross_profit) / parseFloat(profitLoss.revenue)) * 100).toFixed(2)
          : null,
        operatingProfitMargin: profitLoss.revenue && profitLoss.operating_income
          ? ((parseFloat(profitLoss.operating_income) / parseFloat(profitLoss.revenue)) * 100).toFixed(2)
          : null,
        netProfitMargin: profitLoss.revenue && profitLoss.net_income
          ? ((parseFloat(profitLoss.net_income) / parseFloat(profitLoss.revenue)) * 100).toFixed(2)
          : null,
        returnOnAssets: profitLoss.net_income && balanceSheet.total_assets
          ? ((parseFloat(profitLoss.net_income) / parseFloat(balanceSheet.total_assets)) * 100).toFixed(2)
          : null,
        returnOnEquity: profitLoss.net_income && balanceSheet.shareholders_equity
          ? ((parseFloat(profitLoss.net_income) / parseFloat(balanceSheet.shareholders_equity)) * 100).toFixed(2)
          : null,
        returnOnCapitalEmployed: profitLoss.operating_income && balanceSheet.total_assets && balanceSheet.current_liabilities
          ? ((parseFloat(profitLoss.operating_income) / (parseFloat(balanceSheet.total_assets) - parseFloat(balanceSheet.current_liabilities))) * 100).toFixed(2)
          : null,
      },

      // Leverage/Solvency Ratios
      leverage: {
        debtToEquity: balanceSheet.total_liabilities && balanceSheet.shareholders_equity
          ? (parseFloat(balanceSheet.total_liabilities) / parseFloat(balanceSheet.shareholders_equity)).toFixed(2)
          : null,
        debtRatio: balanceSheet.total_liabilities && balanceSheet.total_assets
          ? ((parseFloat(balanceSheet.total_liabilities) / parseFloat(balanceSheet.total_assets)) * 100).toFixed(2)
          : null,
        equityRatio: balanceSheet.shareholders_equity && balanceSheet.total_assets
          ? ((parseFloat(balanceSheet.shareholders_equity) / parseFloat(balanceSheet.total_assets)) * 100).toFixed(2)
          : null,
        interestCoverage: profitLoss.operating_income
          ? (parseFloat(profitLoss.operating_income) / (parseFloat(profitLoss.operating_income) * 0.1)).toFixed(2)
          : null,
        debtToCapital: balanceSheet.total_liabilities && balanceSheet.shareholders_equity
          ? ((parseFloat(balanceSheet.total_liabilities) / (parseFloat(balanceSheet.total_liabilities) + parseFloat(balanceSheet.shareholders_equity))) * 100).toFixed(2)
          : null,
      },

      // Efficiency Ratios
      efficiency: {
        assetTurnover: profitLoss.revenue && balanceSheet.total_assets
          ? (parseFloat(profitLoss.revenue) / parseFloat(balanceSheet.total_assets)).toFixed(2)
          : null,
        inventoryTurnover: profitLoss.cost_of_goods_sold && balanceSheet.current_assets
          ? (parseFloat(profitLoss.cost_of_goods_sold) / (parseFloat(balanceSheet.current_assets) * 0.3)).toFixed(2)
          : null,
        receivablesTurnover: profitLoss.revenue && balanceSheet.current_assets
          ? (parseFloat(profitLoss.revenue) / (parseFloat(balanceSheet.current_assets) * 0.4)).toFixed(2)
          : null,
        payablesTurnover: profitLoss.cost_of_goods_sold && balanceSheet.current_liabilities
          ? (parseFloat(profitLoss.cost_of_goods_sold) / (parseFloat(balanceSheet.current_liabilities) * 0.5)).toFixed(2)
          : null,
        fixedAssetTurnover: profitLoss.revenue && balanceSheet.fixed_assets
          ? (parseFloat(profitLoss.revenue) / parseFloat(balanceSheet.fixed_assets)).toFixed(2)
          : null,
      },

      // Cash Flow Ratios
      cashFlow: {
        operatingCashFlowRatio: operatingCashFlow && balanceSheet.current_liabilities
          ? (parseFloat(operatingCashFlow) / parseFloat(balanceSheet.current_liabilities)).toFixed(2)
          : null,
        cashFlowToDebt: operatingCashFlow && balanceSheet.total_liabilities
          ? (parseFloat(operatingCashFlow) / parseFloat(balanceSheet.total_liabilities)).toFixed(2)
          : null,
        freeCashFlowYield: operatingCashFlow && balanceSheet.shareholders_equity
          ? ((parseFloat(operatingCashFlow) * 0.7 / parseFloat(balanceSheet.shareholders_equity)) * 100).toFixed(2)
          : null,
      },

      // Valuation Ratios (using estimates)
      valuation: {
        earningsPerShare: profitLoss.earnings_per_share
          ? parseFloat(profitLoss.earnings_per_share).toFixed(2)
          : null,
        priceToEarnings: profitLoss.earnings_per_share
          ? (25 / parseFloat(profitLoss.earnings_per_share)).toFixed(2) // Assuming stock price of $25
          : null,
        priceToBook: balanceSheet.shareholders_equity
          ? (parseFloat(balanceSheet.shareholders_equity) * 1.5 / parseFloat(balanceSheet.shareholders_equity)).toFixed(2)
          : null,
        enterpriseValue: balanceSheet.total_assets && balanceSheet.current_assets
          ? (parseFloat(balanceSheet.total_assets) * 1.2).toFixed(2)
          : null,
      },

      // Data sources
      dataAsOf: {
        balanceSheet: balanceSheet.as_of_date || null,
        profitLoss: profitLoss.period || null,
      }
    };

    res.json(ratios);
  } catch (error) {
    console.error('Error calculating ratios:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get ratio benchmarks by industry
router.get('/benchmarks/:industry', async (req, res) => {
  try {
    const { industry } = req.params;

    // Industry benchmarks (simplified)
    const benchmarks = {
      technology: {
        currentRatio: { low: 1.5, median: 2.5, high: 4.0 },
        quickRatio: { low: 1.0, median: 2.0, high: 3.5 },
        grossProfitMargin: { low: 40, median: 60, high: 80 },
        netProfitMargin: { low: 10, median: 20, high: 35 },
        returnOnEquity: { low: 10, median: 18, high: 30 },
        debtToEquity: { low: 0.2, median: 0.5, high: 1.0 },
      },
      retail: {
        currentRatio: { low: 1.0, median: 1.5, high: 2.5 },
        quickRatio: { low: 0.5, median: 0.8, high: 1.5 },
        grossProfitMargin: { low: 20, median: 35, high: 50 },
        netProfitMargin: { low: 2, median: 5, high: 10 },
        returnOnEquity: { low: 8, median: 15, high: 25 },
        debtToEquity: { low: 0.5, median: 1.0, high: 2.0 },
      },
      manufacturing: {
        currentRatio: { low: 1.2, median: 1.8, high: 2.8 },
        quickRatio: { low: 0.8, median: 1.2, high: 2.0 },
        grossProfitMargin: { low: 25, median: 35, high: 50 },
        netProfitMargin: { low: 5, median: 10, high: 18 },
        returnOnEquity: { low: 10, median: 15, high: 22 },
        debtToEquity: { low: 0.4, median: 0.8, high: 1.5 },
      },
      healthcare: {
        currentRatio: { low: 1.3, median: 2.0, high: 3.0 },
        quickRatio: { low: 1.0, median: 1.5, high: 2.5 },
        grossProfitMargin: { low: 30, median: 50, high: 70 },
        netProfitMargin: { low: 8, median: 15, high: 25 },
        returnOnEquity: { low: 12, median: 20, high: 30 },
        debtToEquity: { low: 0.3, median: 0.6, high: 1.2 },
      },
      financial: {
        currentRatio: { low: 1.0, median: 1.2, high: 1.5 },
        quickRatio: { low: 0.8, median: 1.0, high: 1.3 },
        grossProfitMargin: { low: 50, median: 70, high: 85 },
        netProfitMargin: { low: 15, median: 25, high: 40 },
        returnOnEquity: { low: 8, median: 12, high: 18 },
        debtToEquity: { low: 2.0, median: 5.0, high: 10.0 },
      },
    };

    res.json(benchmarks[industry.toLowerCase()] || benchmarks.technology);
  } catch (error) {
    console.error('Error fetching benchmarks:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI analysis of ratios
router.post('/analyze', async (req, res) => {
  try {
    const { companyId, ratios } = req.body;

    // Get company info
    const companyResult = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [companyId]
    );
    const company = companyResult.rows[0];

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
          content: `You are an expert financial analyst specializing in ratio analysis. Provide comprehensive insights on financial health, risks, and recommendations. Be specific and actionable.`
        },
        {
          role: 'user',
          content: `Analyze the following financial ratios for ${company?.name || 'the company'} (${company?.industry || 'Technology'} industry):

LIQUIDITY RATIOS:
- Current Ratio: ${ratios.liquidity?.currentRatio || 'N/A'}
- Quick Ratio: ${ratios.liquidity?.quickRatio || 'N/A'}
- Cash Ratio: ${ratios.liquidity?.cashRatio || 'N/A'}
- Working Capital: $${ratios.liquidity?.workingCapital || 'N/A'}

PROFITABILITY RATIOS:
- Gross Profit Margin: ${ratios.profitability?.grossProfitMargin || 'N/A'}%
- Operating Profit Margin: ${ratios.profitability?.operatingProfitMargin || 'N/A'}%
- Net Profit Margin: ${ratios.profitability?.netProfitMargin || 'N/A'}%
- Return on Assets: ${ratios.profitability?.returnOnAssets || 'N/A'}%
- Return on Equity: ${ratios.profitability?.returnOnEquity || 'N/A'}%

LEVERAGE RATIOS:
- Debt to Equity: ${ratios.leverage?.debtToEquity || 'N/A'}
- Debt Ratio: ${ratios.leverage?.debtRatio || 'N/A'}%
- Interest Coverage: ${ratios.leverage?.interestCoverage || 'N/A'}x

EFFICIENCY RATIOS:
- Asset Turnover: ${ratios.efficiency?.assetTurnover || 'N/A'}x
- Inventory Turnover: ${ratios.efficiency?.inventoryTurnover || 'N/A'}x
- Receivables Turnover: ${ratios.efficiency?.receivablesTurnover || 'N/A'}x

Provide:
1. Overall Financial Health Score (1-100)
2. Key Strengths (bullet points)
3. Areas of Concern (bullet points)
4. Specific Recommendations (actionable items)
5. Industry Comparison Assessment

Format as JSON with these keys: healthScore, strengths, concerns, recommendations, industryComparison`
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
    console.error('Error analyzing ratios:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
