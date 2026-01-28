const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all break-even analyses for a company
router.get('/', async (req, res) => {
  try {
    const { company_id } = req.query;
    let query = `
      SELECT b.*, c.name as company_name
      FROM break_even_analyses b
      LEFT JOIN companies c ON b.company_id = c.id
    `;
    const params = [];

    if (company_id) {
      query += ' WHERE b.company_id = $1';
      params.push(company_id);
    }

    query += ' ORDER BY b.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching analyses:', error);
    res.status(500).json({ error: error.message });
  }
});

// Calculate break-even analysis
router.post('/calculate', async (req, res) => {
  try {
    const {
      company_id,
      analysis_name,
      // Cost structure
      fixed_costs,
      variable_cost_per_unit,
      // Revenue
      selling_price_per_unit,
      // Optional: multiple products
      products, // Array of { name, price, variable_cost, sales_mix }
      // Target profit
      target_profit,
      // Use company data
      use_company_data
    } = req.body;

    let fixedCosts = fixed_costs;
    let variableCostPerUnit = variable_cost_per_unit;
    let sellingPrice = selling_price_per_unit;

    // Fetch from company data if requested
    if (use_company_data && company_id) {
      const plResult = await pool.query(
        'SELECT * FROM profit_loss_records WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1',
        [company_id]
      );

      if (plResult.rows[0]) {
        const pl = plResult.rows[0];
        const revenue = parseFloat(pl.revenue) || 1000000;
        const cogs = parseFloat(pl.cost_of_goods_sold) || 400000;
        const opExpenses = parseFloat(pl.operating_expenses) || 300000;

        // Estimate cost structure
        fixedCosts = fixedCosts || opExpenses * 0.7; // 70% of operating expenses as fixed
        const estimatedUnits = revenue / (sellingPrice || 100);
        variableCostPerUnit = variableCostPerUnit || cogs / estimatedUnits;
        sellingPrice = sellingPrice || revenue / estimatedUnits;
      }
    }

    // Default values
    fixedCosts = fixedCosts || 500000;
    variableCostPerUnit = variableCostPerUnit || 60;
    sellingPrice = sellingPrice || 100;

    let results = {};

    if (products && products.length > 0) {
      // Multi-product break-even analysis
      results = calculateMultiProductBreakEven(products, fixedCosts);
    } else {
      // Single product break-even analysis
      results = calculateSingleProductBreakEven(fixedCosts, variableCostPerUnit, sellingPrice, target_profit);
    }

    // Generate break-even chart data
    const chartData = generateChartData(fixedCosts, variableCostPerUnit, sellingPrice, results.breakEvenUnits);

    // Sensitivity analysis
    const sensitivity = {
      priceChanges: [
        { change: -20, newPrice: sellingPrice * 0.8, newBreakEven: fixedCosts / (sellingPrice * 0.8 - variableCostPerUnit) },
        { change: -10, newPrice: sellingPrice * 0.9, newBreakEven: fixedCosts / (sellingPrice * 0.9 - variableCostPerUnit) },
        { change: 0, newPrice: sellingPrice, newBreakEven: results.breakEvenUnits },
        { change: 10, newPrice: sellingPrice * 1.1, newBreakEven: fixedCosts / (sellingPrice * 1.1 - variableCostPerUnit) },
        { change: 20, newPrice: sellingPrice * 1.2, newBreakEven: fixedCosts / (sellingPrice * 1.2 - variableCostPerUnit) }
      ],
      variableCostChanges: [
        { change: -20, newVC: variableCostPerUnit * 0.8, newBreakEven: fixedCosts / (sellingPrice - variableCostPerUnit * 0.8) },
        { change: -10, newVC: variableCostPerUnit * 0.9, newBreakEven: fixedCosts / (sellingPrice - variableCostPerUnit * 0.9) },
        { change: 0, newVC: variableCostPerUnit, newBreakEven: results.breakEvenUnits },
        { change: 10, newVC: variableCostPerUnit * 1.1, newBreakEven: fixedCosts / (sellingPrice - variableCostPerUnit * 1.1) },
        { change: 20, newVC: variableCostPerUnit * 1.2, newBreakEven: fixedCosts / (sellingPrice - variableCostPerUnit * 1.2) }
      ],
      fixedCostChanges: [
        { change: -20, newFC: fixedCosts * 0.8, newBreakEven: (fixedCosts * 0.8) / (sellingPrice - variableCostPerUnit) },
        { change: -10, newFC: fixedCosts * 0.9, newBreakEven: (fixedCosts * 0.9) / (sellingPrice - variableCostPerUnit) },
        { change: 0, newFC: fixedCosts, newBreakEven: results.breakEvenUnits },
        { change: 10, newFC: fixedCosts * 1.1, newBreakEven: (fixedCosts * 1.1) / (sellingPrice - variableCostPerUnit) },
        { change: 20, newFC: fixedCosts * 1.2, newBreakEven: (fixedCosts * 1.2) / (sellingPrice - variableCostPerUnit) }
      ]
    };

    // Save analysis
    const saveResult = await pool.query(
      `INSERT INTO break_even_analyses
       (company_id, analysis_name, fixed_costs, variable_cost_per_unit, selling_price_per_unit,
        break_even_units, break_even_revenue, contribution_margin, contribution_margin_ratio,
        margin_of_safety, operating_leverage, sensitivity_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        company_id,
        analysis_name || 'Break-Even Analysis',
        fixedCosts,
        variableCostPerUnit,
        sellingPrice,
        results.breakEvenUnits,
        results.breakEvenRevenue,
        results.contributionMargin,
        results.contributionMarginRatio,
        results.marginOfSafety || 0,
        results.operatingLeverage || 0,
        JSON.stringify(sensitivity)
      ]
    );

    // Calculate additional metrics for current performance
    const currentUnits = req.body.current_units || 5000;
    const currentRevenue = currentUnits * sellingPrice;
    const currentProfit = (sellingPrice - variableCostPerUnit) * currentUnits - fixedCosts;
    const aboveBreakEven = currentUnits - results.breakEvenUnits;
    const marginOfSafety = currentUnits > 0 ? aboveBreakEven / currentUnits : 0;
    const operatingLeverage = currentProfit !== 0 ? ((sellingPrice - variableCostPerUnit) * currentUnits) / currentProfit : 0;

    // Calculate units needed for target profit
    const targetProfitValue = target_profit || 50000;
    const targetProfitUnits = Math.ceil((fixedCosts + targetProfitValue) / (sellingPrice - variableCostPerUnit));

    res.json({
      analysis: saveResult.rows[0],
      breakEven: {
        units: results.breakEvenUnits,
        revenue: results.breakEvenRevenue
      },
      targetProfit: {
        units: targetProfitUnits,
        profit: targetProfitValue
      },
      metrics: {
        contributionMargin: results.contributionMargin,
        contributionMarginRatio: results.contributionMarginRatio / 100,
        marginOfSafety: marginOfSafety,
        operatingLeverage: operatingLeverage
      },
      currentPerformance: {
        units: currentUnits,
        revenue: currentRevenue,
        profit: currentProfit,
        aboveBreakEven: aboveBreakEven
      },
      inputs: {
        fixedCosts,
        variableCostPerUnit,
        sellingPrice,
        targetProfit: targetProfitValue
      },
      chartData,
      sensitivity
    });
  } catch (error) {
    console.error('Error calculating break-even:', error);
    res.status(500).json({ error: error.message });
  }
});

// What-if analysis for break-even
router.post('/what-if', async (req, res) => {
  try {
    const {
      fixed_costs,
      variable_cost_per_unit,
      selling_price_per_unit,
      current_sales_units,
      // Changes to analyze
      price_change_percent,
      variable_cost_change_percent,
      fixed_cost_change_percent,
      volume_change_percent
    } = req.body;

    const baseResults = calculateSingleProductBreakEven(
      fixed_costs,
      variable_cost_per_unit,
      selling_price_per_unit,
      0
    );

    const currentProfit = (selling_price_per_unit - variable_cost_per_unit) * current_sales_units - fixed_costs;

    // Calculate with changes
    const newPrice = selling_price_per_unit * (1 + (price_change_percent || 0) / 100);
    const newVC = variable_cost_per_unit * (1 + (variable_cost_change_percent || 0) / 100);
    const newFC = fixed_costs * (1 + (fixed_cost_change_percent || 0) / 100);
    const newVolume = current_sales_units * (1 + (volume_change_percent || 0) / 100);

    const newResults = calculateSingleProductBreakEven(newFC, newVC, newPrice, 0);
    const newProfit = (newPrice - newVC) * newVolume - newFC;

    res.json({
      current: {
        ...baseResults,
        salesUnits: current_sales_units,
        profit: currentProfit,
        inputs: { fixed_costs, variable_cost_per_unit, selling_price_per_unit }
      },
      projected: {
        ...newResults,
        salesUnits: newVolume,
        profit: newProfit,
        inputs: { fixedCosts: newFC, variableCostPerUnit: newVC, sellingPrice: newPrice }
      },
      changes: {
        breakEvenUnitsChange: newResults.breakEvenUnits - baseResults.breakEvenUnits,
        breakEvenUnitsChangePercent: ((newResults.breakEvenUnits - baseResults.breakEvenUnits) / baseResults.breakEvenUnits * 100).toFixed(2),
        profitChange: newProfit - currentProfit,
        profitChangePercent: currentProfit !== 0 ? ((newProfit - currentProfit) / Math.abs(currentProfit) * 100).toFixed(2) : 'N/A'
      }
    });
  } catch (error) {
    console.error('Error in what-if analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

// Calculate target profit volume
router.post('/target-profit', async (req, res) => {
  try {
    const {
      fixed_costs,
      variable_cost_per_unit,
      selling_price_per_unit,
      target_profit,
      target_profit_margin // As percentage of revenue
    } = req.body;

    const contributionMargin = selling_price_per_unit - variable_cost_per_unit;
    const contributionMarginRatio = contributionMargin / selling_price_per_unit;

    let results = {};

    if (target_profit) {
      // Calculate units needed for target profit
      const unitsNeeded = (fixed_costs + target_profit) / contributionMargin;
      const revenueNeeded = unitsNeeded * selling_price_per_unit;

      results = {
        targetProfit: target_profit,
        unitsRequired: Math.ceil(unitsNeeded),
        revenueRequired: revenueNeeded,
        contributionMargin,
        contributionMarginRatio: contributionMarginRatio * 100
      };
    }

    if (target_profit_margin) {
      // Calculate units needed for target margin
      // Profit = Revenue * margin = (Price * Units) * margin
      // Profit = CM * Units - FC
      // (Price * Units) * margin = CM * Units - FC
      // Price * margin * Units = CM * Units - FC
      // Units * (CM - Price * margin) = FC
      // Units = FC / (CM - Price * margin)

      const targetMarginDecimal = target_profit_margin / 100;
      const unitsNeeded = fixed_costs / (contributionMargin - selling_price_per_unit * targetMarginDecimal);
      const revenueNeeded = unitsNeeded * selling_price_per_unit;
      const profitAtTarget = revenueNeeded * targetMarginDecimal;

      results.targetMargin = {
        targetProfitMargin: target_profit_margin,
        unitsRequired: Math.ceil(unitsNeeded),
        revenueRequired: revenueNeeded,
        profitAtTarget
      };
    }

    res.json(results);
  } catch (error) {
    console.error('Error calculating target profit:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI-powered break-even insights
router.post('/analyze', async (req, res) => {
  try {
    const { analysis_id, company_id, inputs, results } = req.body;

    // Try to get analysis from DB if analysis_id provided
    let analysis = null;
    if (analysis_id) {
      const dbResult = await pool.query(
        'SELECT * FROM break_even_analyses WHERE id = $1',
        [analysis_id]
      );
      analysis = dbResult.rows[0];
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

    // Use inputs and results from request if no DB analysis
    const fixedCosts = analysis?.fixed_costs || inputs?.fixed_costs || 100000;
    const variableCost = analysis?.variable_cost_per_unit || inputs?.variable_cost_per_unit || 25;
    const sellingPrice = analysis?.selling_price_per_unit || inputs?.selling_price_per_unit || 50;
    const breakEvenUnits = analysis?.break_even_units || results?.breakEven?.units || 4000;
    const breakEvenRevenue = analysis?.break_even_revenue || results?.breakEven?.revenue || 200000;
    const contributionMargin = analysis?.contribution_margin || results?.metrics?.contributionMargin || 25;
    const contributionMarginRatio = analysis?.contribution_margin_ratio || (results?.metrics?.contributionMarginRatio * 100) || 50;
    const marginOfSafety = analysis?.margin_of_safety || (results?.metrics?.marginOfSafety * 100) || 20;
    const operatingLeverage = analysis?.operating_leverage || results?.metrics?.operatingLeverage || 2;

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
          content: 'You are an expert financial analyst specializing in cost-volume-profit analysis and break-even analysis. Provide actionable insights.'
        },
        {
          role: 'user',
          content: `Analyze this break-even analysis for ${company?.name || 'the company'} (${company?.industry || 'General'}):

Cost Structure:
- Fixed Costs: $${fixedCosts.toLocaleString()}
- Variable Cost per Unit: $${variableCost}
- Selling Price per Unit: $${sellingPrice}

Results:
- Break-Even Units: ${breakEvenUnits.toLocaleString()}
- Break-Even Revenue: $${breakEvenRevenue.toLocaleString()}
- Contribution Margin: $${contributionMargin}/unit
- Contribution Margin Ratio: ${typeof contributionMarginRatio === 'number' ? contributionMarginRatio.toFixed(1) : contributionMarginRatio}%
- Margin of Safety: ${typeof marginOfSafety === 'number' ? marginOfSafety.toFixed(1) : marginOfSafety}%
- Operating Leverage: ${typeof operatingLeverage === 'number' ? operatingLeverage.toFixed(2) : operatingLeverage}x

Provide analysis as JSON with these exact keys:
{
  "summary": "brief overall assessment of the break-even position",
  "insights": ["array of 3-5 key insights about the cost structure and break-even point"],
  "recommendations": ["array of 3-5 actionable recommendations to improve profitability"]
}`
        }
      ],
      temperature: 0.3,
    });

    let aiAnalysis;
    try {
      const jsonMatch = response.choices[0].message.content.match(/\{[\s\S]*\}/);
      aiAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        summary: response.choices[0].message.content,
        insights: [],
        recommendations: []
      };
    } catch {
      aiAnalysis = {
        summary: response.choices[0].message.content,
        insights: [],
        recommendations: []
      };
    }

    res.json(aiAnalysis);
  } catch (error) {
    console.error('Error analyzing break-even:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single analysis
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT b.*, c.name as company_name
       FROM break_even_analyses b
       LEFT JOIN companies c ON b.company_id = c.id
       WHERE b.id = $1`,
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
    await pool.query('DELETE FROM break_even_analyses WHERE id = $1', [id]);
    res.json({ message: 'Analysis deleted successfully' });
  } catch (error) {
    console.error('Error deleting analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
function calculateSingleProductBreakEven(fixedCosts, variableCostPerUnit, sellingPrice, targetProfit = 0) {
  const contributionMargin = sellingPrice - variableCostPerUnit;
  const contributionMarginRatio = contributionMargin / sellingPrice;

  const breakEvenUnits = (fixedCosts + targetProfit) / contributionMargin;
  const breakEvenRevenue = breakEvenUnits * sellingPrice;

  return {
    breakEvenUnits: Math.ceil(breakEvenUnits),
    breakEvenRevenue,
    contributionMargin,
    contributionMarginRatio: contributionMarginRatio * 100,
    targetProfitUnits: targetProfit > 0 ? Math.ceil(breakEvenUnits) : null
  };
}

function calculateMultiProductBreakEven(products, fixedCosts) {
  // Calculate weighted average contribution margin
  let totalSalesMix = products.reduce((sum, p) => sum + (p.sales_mix || 0), 0);
  if (totalSalesMix === 0) totalSalesMix = products.length;

  let weightedCM = 0;
  let weightedPrice = 0;

  products.forEach(product => {
    const mix = (product.sales_mix || (100 / products.length)) / 100;
    const cm = product.price - product.variable_cost;
    weightedCM += cm * mix;
    weightedPrice += product.price * mix;
  });

  const breakEvenUnits = fixedCosts / weightedCM;
  const breakEvenRevenue = breakEvenUnits * weightedPrice;

  // Break-even by product
  const productBreakEven = products.map(product => {
    const mix = (product.sales_mix || (100 / products.length)) / 100;
    return {
      name: product.name,
      units: Math.ceil(breakEvenUnits * mix),
      revenue: breakEvenUnits * mix * product.price
    };
  });

  return {
    breakEvenUnits: Math.ceil(breakEvenUnits),
    breakEvenRevenue,
    weightedContributionMargin: weightedCM,
    productBreakEven
  };
}

function generateChartData(fixedCosts, variableCostPerUnit, sellingPrice, breakEvenUnits) {
  const maxUnits = Math.ceil(breakEvenUnits * 2);
  const step = Math.ceil(maxUnits / 20);

  const data = [];

  for (let units = 0; units <= maxUnits; units += step) {
    const totalRevenue = units * sellingPrice;
    const totalCosts = fixedCosts + (units * variableCostPerUnit);
    const profit = totalRevenue - totalCosts;

    data.push({
      units,
      revenue: totalRevenue,
      totalCosts,
      fixedCosts,
      variableCosts: units * variableCostPerUnit,
      profit
    });
  }

  return data;
}

module.exports = router;
