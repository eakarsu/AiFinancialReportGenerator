const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get working capital analyses for a company
router.get('/', async (req, res) => {
  try {
    const { company_id } = req.query;
    let query = `
      SELECT w.*, c.name as company_name
      FROM working_capital_analyses w
      LEFT JOIN companies c ON w.company_id = c.id
    `;
    const params = [];

    if (company_id) {
      query += ' WHERE w.company_id = $1';
      params.push(company_id);
    }

    query += ' ORDER BY w.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching analyses:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze working capital and cash conversion cycle
router.post('/analyze', async (req, res) => {
  try {
    const {
      company_id,
      analysis_name,
      // Balance sheet items
      accounts_receivable,
      inventory,
      accounts_payable,
      // Income statement items
      revenue,
      cost_of_goods_sold,
      cogs: cogsInput,
      // Optional: daily values
      daily_sales,
      daily_cogs,
      daily_purchases,
      // Use company data
      use_company_data
    } = req.body;

    let ar = accounts_receivable;
    let inv = inventory;
    let ap = accounts_payable;
    let rev = revenue;
    let cogs = cost_of_goods_sold || cogsInput;

    // Fetch from company data if requested
    if (use_company_data && company_id) {
      const [bsResult, plResult] = await Promise.all([
        pool.query(
          'SELECT * FROM balance_sheets WHERE company_id = $1 ORDER BY as_of_date DESC LIMIT 1',
          [company_id]
        ),
        pool.query(
          'SELECT * FROM profit_loss_records WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1',
          [company_id]
        )
      ]);

      if (bsResult.rows[0]) {
        const bs = bsResult.rows[0];
        ar = ar || parseFloat(bs.current_assets) * 0.4; // Estimate AR as 40% of current assets
        inv = inv || parseFloat(bs.current_assets) * 0.3; // Estimate inventory as 30%
        ap = ap || parseFloat(bs.current_liabilities) * 0.5; // Estimate AP as 50%
      }

      if (plResult.rows[0]) {
        const pl = plResult.rows[0];
        rev = rev || parseFloat(pl.revenue);
        cogs = cogs || parseFloat(pl.cost_of_goods_sold);
      }
    }

    // Default values
    ar = ar || 500000;
    inv = inv || 300000;
    ap = ap || 200000;
    rev = rev || 3000000;
    cogs = cogs || 1800000;

    // Calculate daily values
    const dailySales = daily_sales || rev / 365;
    const dailyCogs = daily_cogs || cogs / 365;
    const dailyPurchases = daily_purchases || cogs / 365; // Assuming purchases = COGS

    // Cash Conversion Cycle components
    const daysInventoryOutstanding = inv / dailyCogs; // DIO
    const daysSalesOutstanding = ar / dailySales; // DSO
    const daysPayableOutstanding = ap / dailyPurchases; // DPO

    const cashConversionCycle = daysInventoryOutstanding + daysSalesOutstanding - daysPayableOutstanding;

    // Working Capital metrics
    const workingCapital = ar + inv - ap;
    const currentRatio = (ar + inv) / ap;
    const quickRatio = ar / ap;

    // Cash Flow Impact
    const dailyCashNeeded = (cashConversionCycle > 0) ? dailyCogs * cashConversionCycle : 0;
    const annualCashTiedUp = dailyCashNeeded;

    // Optimization opportunities
    const optimizationOpportunities = [];

    // DSO optimization
    if (daysSalesOutstanding > 45) {
      const targetDSO = 45;
      const arReduction = (daysSalesOutstanding - targetDSO) * dailySales;
      optimizationOpportunities.push({
        area: 'Accounts Receivable',
        currentDays: daysSalesOutstanding.toFixed(1),
        targetDays: targetDSO,
        potentialCashRelease: arReduction,
        actions: [
          'Implement early payment discounts',
          'Tighten credit policies',
          'Improve collection processes',
          'Use invoice factoring'
        ]
      });
    }

    // DIO optimization
    if (daysInventoryOutstanding > 60) {
      const targetDIO = 60;
      const invReduction = (daysInventoryOutstanding - targetDIO) * dailyCogs;
      optimizationOpportunities.push({
        area: 'Inventory',
        currentDays: daysInventoryOutstanding.toFixed(1),
        targetDays: targetDIO,
        potentialCashRelease: invReduction,
        actions: [
          'Implement just-in-time inventory',
          'Improve demand forecasting',
          'Reduce slow-moving inventory',
          'Negotiate consignment arrangements'
        ]
      });
    }

    // DPO optimization
    if (daysPayableOutstanding < 30) {
      const targetDPO = 45;
      const apIncrease = (targetDPO - daysPayableOutstanding) * dailyPurchases;
      optimizationOpportunities.push({
        area: 'Accounts Payable',
        currentDays: daysPayableOutstanding.toFixed(1),
        targetDays: targetDPO,
        potentialCashRetained: apIncrease,
        actions: [
          'Negotiate extended payment terms',
          'Use payment timing strategies',
          'Implement vendor financing',
          'Optimize payment scheduling'
        ]
      });
    }

    // Calculate total optimization potential
    const totalOptimizationPotential = optimizationOpportunities.reduce((sum, opp) => {
      return sum + (opp.potentialCashRelease || opp.potentialCashRetained || 0);
    }, 0);

    // Scenario analysis
    const scenarios = {
      current: {
        ccc: cashConversionCycle,
        workingCapital,
        cashTiedUp: annualCashTiedUp
      },
      optimized: {
        ccc: Math.max(0, cashConversionCycle - 20),
        workingCapital: workingCapital - totalOptimizationPotential,
        cashReleased: totalOptimizationPotential
      },
      aggressive: {
        ccc: Math.max(0, cashConversionCycle - 35),
        workingCapital: workingCapital - totalOptimizationPotential * 1.5,
        cashReleased: totalOptimizationPotential * 1.5
      }
    };

    // Save analysis
    const result = await pool.query(
      `INSERT INTO working_capital_analyses
       (company_id, analysis_name, accounts_receivable, inventory, accounts_payable,
        revenue, cogs, dso, dio, dpo, cash_conversion_cycle, working_capital,
        optimization_potential, recommendations)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        company_id,
        analysis_name || 'Working Capital Analysis',
        ar,
        inv,
        ap,
        rev,
        cogs,
        daysSalesOutstanding,
        daysInventoryOutstanding,
        daysPayableOutstanding,
        cashConversionCycle,
        workingCapital,
        totalOptimizationPotential,
        JSON.stringify(optimizationOpportunities)
      ]
    );

    res.json({
      analysis: result.rows[0],
      metrics: {
        dso: daysSalesOutstanding,
        dio: daysInventoryOutstanding,
        dpo: daysPayableOutstanding,
        cashConversionCycle: cashConversionCycle,
        workingCapital: workingCapital,
        workingCapitalTurnover: rev / workingCapital,
        currentRatio: currentRatio,
        quickRatio: quickRatio,
        accountsReceivable: ar,
        inventory: inv,
        accountsPayable: ap,
        dailyCashNeeded,
        annualCashTiedUp
      },
      benchmarks: {
        dso: 45,
        dio: 60,
        dpo: 45,
        ccc: 60
      },
      optimization: {
        potential: totalOptimizationPotential,
        opportunities: optimizationOpportunities
      },
      scenarios
    });
  } catch (error) {
    console.error('Error analyzing working capital:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cash flow forecasting
router.post('/forecast-cash', async (req, res) => {
  try {
    const {
      company_id,
      starting_cash,
      // Monthly projections
      monthly_revenue,
      monthly_expenses,
      // Collection/payment patterns
      collection_pattern, // e.g., [0.1, 0.5, 0.3, 0.1] = 10% same month, 50% 1 month, etc.
      payment_pattern,
      // Forecast horizon
      months
    } = req.body;

    const forecastMonths = months || 12;
    const cash = starting_cash || 500000;
    const monthlyRev = monthly_revenue || 250000;
    const monthlyExp = monthly_expenses || 200000;

    // Default patterns
    const collections = collection_pattern || [0.2, 0.5, 0.25, 0.05];
    const payments = payment_pattern || [0.3, 0.5, 0.2];

    // Generate forecast
    const forecast = [];
    let currentCash = cash;
    const arPipeline = []; // Pending collections
    const apPipeline = []; // Pending payments

    for (let month = 1; month <= forecastMonths; month++) {
      // Calculate collections from AR pipeline
      let totalCollections = 0;
      arPipeline.forEach((ar, index) => {
        const collectionRate = collections[index] || 0;
        totalCollections += ar * collectionRate;
      });

      // Calculate payments from AP pipeline
      let totalPayments = 0;
      apPipeline.forEach((ap, index) => {
        const paymentRate = payments[index] || 0;
        totalPayments += ap * paymentRate;
      });

      // Add new revenue to AR pipeline
      arPipeline.unshift(monthlyRev);
      if (arPipeline.length > collections.length) arPipeline.pop();

      // Add new expenses to AP pipeline
      apPipeline.unshift(monthlyExp);
      if (apPipeline.length > payments.length) apPipeline.pop();

      // Calculate month-end cash
      const netCashFlow = totalCollections - totalPayments;
      currentCash += netCashFlow;

      forecast.push({
        month,
        revenue: monthlyRev,
        collections: totalCollections,
        expenses: monthlyExp,
        payments: totalPayments,
        netCashFlow,
        endingCash: currentCash,
        arBalance: arPipeline.reduce((a, b) => a + b, 0),
        apBalance: apPipeline.reduce((a, b) => a + b, 0)
      });
    }

    // Identify cash shortfalls
    const shortfalls = forecast.filter(m => m.endingCash < 0);

    // Calculate financing needs
    const maxShortfall = shortfalls.length > 0
      ? Math.min(...shortfalls.map(m => m.endingCash))
      : 0;

    res.json({
      forecast,
      summary: {
        startingCash: cash,
        endingCash: currentCash,
        totalNetCashFlow: currentCash - cash,
        averageMonthlyCashFlow: (currentCash - cash) / forecastMonths,
        shortfallMonths: shortfalls.length,
        maxShortfall: Math.abs(maxShortfall),
        recommendedCashBuffer: Math.abs(maxShortfall) * 1.2
      }
    });
  } catch (error) {
    console.error('Error forecasting cash:', error);
    res.status(500).json({ error: error.message });
  }
});

// Industry benchmarking
router.get('/benchmarks/:industry', async (req, res) => {
  try {
    const { industry } = req.params;

    const benchmarks = {
      technology: {
        dso: { p25: 35, p50: 45, p75: 60 },
        dio: { p25: 15, p50: 30, p75: 45 },
        dpo: { p25: 30, p50: 45, p75: 60 },
        ccc: { p25: 20, p50: 30, p75: 45 },
        currentRatio: { p25: 1.5, p50: 2.5, p75: 4.0 }
      },
      retail: {
        dso: { p25: 5, p50: 10, p75: 20 },
        dio: { p25: 45, p50: 60, p75: 90 },
        dpo: { p25: 25, p50: 35, p75: 50 },
        ccc: { p25: 25, p50: 35, p75: 60 },
        currentRatio: { p25: 1.0, p50: 1.5, p75: 2.0 }
      },
      manufacturing: {
        dso: { p25: 40, p50: 50, p75: 65 },
        dio: { p25: 60, p50: 80, p75: 110 },
        dpo: { p25: 35, p50: 50, p75: 65 },
        ccc: { p25: 65, p50: 80, p75: 110 },
        currentRatio: { p25: 1.2, p50: 1.8, p75: 2.5 }
      },
      healthcare: {
        dso: { p25: 45, p50: 55, p75: 70 },
        dio: { p25: 20, p50: 30, p75: 45 },
        dpo: { p25: 30, p50: 40, p75: 55 },
        ccc: { p25: 35, p50: 45, p75: 60 },
        currentRatio: { p25: 1.3, p50: 2.0, p75: 3.0 }
      },
      financial: {
        dso: { p25: 25, p50: 35, p75: 50 },
        dio: { p25: 5, p50: 10, p75: 20 },
        dpo: { p25: 20, p50: 30, p75: 45 },
        ccc: { p25: 10, p50: 15, p75: 25 },
        currentRatio: { p25: 1.0, p50: 1.2, p75: 1.5 }
      }
    };

    res.json(benchmarks[industry.toLowerCase()] || benchmarks.technology);
  } catch (error) {
    console.error('Error fetching benchmarks:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI-powered working capital recommendations
router.post('/ai-recommendations', async (req, res) => {
  try {
    const { analysis_id, company_id, analysis, inputs } = req.body;

    let analysisData = analysis;

    // If analysis_id provided, fetch from DB
    if (analysis_id && !analysisData) {
      const result = await pool.query(
        'SELECT * FROM working_capital_analyses WHERE id = $1',
        [analysis_id]
      );
      analysisData = result.rows[0];
    }

    // Get company info
    let company = null;
    if (company_id) {
      const companyResult = await pool.query(
        'SELECT * FROM companies WHERE id = $1',
        [company_id]
      );
      company = companyResult.rows[0];
    }

    // Extract metrics from the analysis object (handles both formats)
    const metrics = analysisData?.metrics || analysisData || {};
    const dso = metrics.dso || analysisData?.dso;
    const dio = metrics.dio || analysisData?.dio;
    const dpo = metrics.dpo || analysisData?.dpo;
    const ccc = metrics.cashConversionCycle || analysisData?.cash_conversion_cycle;
    const workingCapital = metrics.workingCapital || analysisData?.working_capital;
    const ar = metrics.accountsReceivable || inputs?.accounts_receivable || analysisData?.accounts_receivable;
    const inv = metrics.inventory || inputs?.inventory || analysisData?.inventory;
    const ap = metrics.accountsPayable || inputs?.accounts_payable || analysisData?.accounts_payable;
    const optPotential = analysisData?.optimization?.potential || analysisData?.optimization_potential;

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
          content: 'You are an expert treasury and working capital management consultant. Provide actionable recommendations.'
        },
        {
          role: 'user',
          content: `Analyze working capital for ${company?.name || 'the company'} (${inputs?.industry || company?.industry || 'General'}):

Cash Conversion Cycle: ${typeof ccc === 'number' ? ccc.toFixed(1) : ccc || 'N/A'} days
- Days Sales Outstanding (DSO): ${typeof dso === 'number' ? dso.toFixed(1) : dso || 'N/A'} days
- Days Inventory Outstanding (DIO): ${typeof dio === 'number' ? dio.toFixed(1) : dio || 'N/A'} days
- Days Payable Outstanding (DPO): ${typeof dpo === 'number' ? dpo.toFixed(1) : dpo || 'N/A'} days

Working Capital: $${workingCapital?.toLocaleString() || 'N/A'}
- Accounts Receivable: $${ar?.toLocaleString() || 'N/A'}
- Inventory: $${inv?.toLocaleString() || 'N/A'}
- Accounts Payable: $${ap?.toLocaleString() || 'N/A'}

Optimization Potential: $${optPotential?.toLocaleString() || 'N/A'}

Provide recommendations as JSON with these exact keys:
{
  "summary": "brief overall assessment",
  "arRecommendations": ["array of accounts receivable recommendations"],
  "inventoryRecommendations": ["array of inventory management recommendations"],
  "apRecommendations": ["array of accounts payable recommendations"],
  "potentialSavings": number (estimated annual savings in dollars)
}`
        }
      ],
      temperature: 0.3,
    });

    let aiRecommendations;
    try {
      const jsonMatch = response.choices[0].message.content.match(/\{[\s\S]*\}/);
      aiRecommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: response.choices[0].message.content };
    } catch {
      aiRecommendations = {
        summary: response.choices[0].message.content,
        arRecommendations: [],
        inventoryRecommendations: [],
        apRecommendations: [],
        potentialSavings: 0
      };
    }

    res.json(aiRecommendations);
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single analysis
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT w.*, c.name as company_name
       FROM working_capital_analyses w
       LEFT JOIN companies c ON w.company_id = c.id
       WHERE w.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete analysis
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM working_capital_analyses WHERE id = $1', [id]);
    res.json({ message: 'Analysis deleted successfully' });
  } catch (error) {
    console.error('Error deleting analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
