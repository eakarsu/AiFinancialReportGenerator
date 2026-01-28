const pool = require('./config/database');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../../.env' });

async function seed() {
  console.log('Starting database seeding...');

  try {
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('Schema created successfully');

    // Seed Companies (15 items)
    const companies = [
      { name: 'TechVenture Inc', industry: 'Technology', fiscal_year_end: 'December', currency: 'USD' },
      { name: 'Global Finance Corp', industry: 'Financial Services', fiscal_year_end: 'December', currency: 'USD' },
      { name: 'HealthCare Plus', industry: 'Healthcare', fiscal_year_end: 'June', currency: 'USD' },
      { name: 'RetailMax Holdings', industry: 'Retail', fiscal_year_end: 'January', currency: 'USD' },
      { name: 'Manufacturing Pro', industry: 'Manufacturing', fiscal_year_end: 'December', currency: 'USD' },
      { name: 'Energy Solutions Ltd', industry: 'Energy', fiscal_year_end: 'December', currency: 'USD' },
      { name: 'Real Estate Ventures', industry: 'Real Estate', fiscal_year_end: 'March', currency: 'USD' },
      { name: 'Consumer Goods Co', industry: 'Consumer Goods', fiscal_year_end: 'December', currency: 'USD' },
      { name: 'Telecommunications Inc', industry: 'Telecommunications', fiscal_year_end: 'December', currency: 'USD' },
      { name: 'Automotive Leaders', industry: 'Automotive', fiscal_year_end: 'December', currency: 'USD' },
      { name: 'Biotech Innovations', industry: 'Biotechnology', fiscal_year_end: 'September', currency: 'USD' },
      { name: 'Logistics Express', industry: 'Logistics', fiscal_year_end: 'December', currency: 'USD' },
      { name: 'Media Entertainment', industry: 'Entertainment', fiscal_year_end: 'December', currency: 'USD' },
      { name: 'Aerospace Dynamics', industry: 'Aerospace', fiscal_year_end: 'December', currency: 'USD' },
      { name: 'Food & Beverage Co', industry: 'Food & Beverage', fiscal_year_end: 'December', currency: 'USD' },
    ];

    const companyIds = [];
    for (const company of companies) {
      const result = await pool.query(
        'INSERT INTO companies (name, industry, fiscal_year_end, currency) VALUES ($1, $2, $3, $4) RETURNING id',
        [company.name, company.industry, company.fiscal_year_end, company.currency]
      );
      companyIds.push(result.rows[0].id);
    }
    console.log('Companies seeded:', companyIds.length);

    // Seed Users (15 items)
    const users = [
      { email: 'john.cfo@techventure.com', name: 'John Smith', role: 'cfo' },
      { email: 'sarah.analyst@globalfinance.com', name: 'Sarah Johnson', role: 'analyst' },
      { email: 'michael.controller@healthcare.com', name: 'Michael Brown', role: 'controller' },
      { email: 'emily.accountant@retailmax.com', name: 'Emily Davis', role: 'accountant' },
      { email: 'david.manager@manufacturing.com', name: 'David Wilson', role: 'manager' },
      { email: 'jessica.vp@energy.com', name: 'Jessica Martinez', role: 'vp_finance' },
      { email: 'robert.director@realestate.com', name: 'Robert Anderson', role: 'director' },
      { email: 'amanda.senior@consumer.com', name: 'Amanda Taylor', role: 'senior_analyst' },
      { email: 'james.auditor@telecom.com', name: 'James Thomas', role: 'auditor' },
      { email: 'michelle.treasurer@automotive.com', name: 'Michelle Garcia', role: 'treasurer' },
      { email: 'christopher.cpa@biotech.com', name: 'Christopher Lee', role: 'cpa' },
      { email: 'ashley.associate@logistics.com', name: 'Ashley Harris', role: 'associate' },
      { email: 'matthew.partner@media.com', name: 'Matthew Clark', role: 'partner' },
      { email: 'stephanie.intern@aerospace.com', name: 'Stephanie Lewis', role: 'intern' },
      { email: 'daniel.consultant@food.com', name: 'Daniel Walker', role: 'consultant' },
    ];

    const userIds = [];
    for (let i = 0; i < users.length; i++) {
      const result = await pool.query(
        'INSERT INTO users (email, name, role, company_id) VALUES ($1, $2, $3, $4) RETURNING id',
        [users[i].email, users[i].name, users[i].role, companyIds[i % companyIds.length]]
      );
      userIds.push(result.rows[0].id);
    }
    console.log('Users seeded:', userIds.length);

    // Seed Financial Statements (18 items)
    const financialStatements = [];
    const statementTypes = ['quarterly', 'annual', 'monthly'];
    const statuses = ['draft', 'approved', 'pending'];

    for (let i = 0; i < 18; i++) {
      const baseRevenue = 1000000 + Math.random() * 9000000;
      const expenses = baseRevenue * (0.6 + Math.random() * 0.25);
      financialStatements.push({
        company_id: companyIds[i % companyIds.length],
        statement_type: statementTypes[i % 3],
        period_start: `2024-${String((i % 12) + 1).padStart(2, '0')}-01`,
        period_end: `2024-${String((i % 12) + 1).padStart(2, '0')}-28`,
        total_revenue: baseRevenue.toFixed(2),
        total_expenses: expenses.toFixed(2),
        net_income: (baseRevenue - expenses).toFixed(2),
        status: statuses[i % 3],
        ai_summary: i % 3 === 0 ? 'Strong revenue growth observed with healthy profit margins. Operating expenses are within budget. Recommend continued focus on cost optimization.' : null,
        created_by: userIds[i % userIds.length]
      });
    }

    for (const fs of financialStatements) {
      await pool.query(
        `INSERT INTO financial_statements (company_id, statement_type, period_start, period_end, total_revenue, total_expenses, net_income, status, ai_summary, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [fs.company_id, fs.statement_type, fs.period_start, fs.period_end, fs.total_revenue, fs.total_expenses, fs.net_income, fs.status, fs.ai_summary, fs.created_by]
      );
    }
    console.log('Financial statements seeded:', financialStatements.length);

    // Seed Revenue Forecasts (16 items)
    const revenueForecasts = [];
    const forecastPeriods = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];
    const models = ['Linear Regression', 'ARIMA', 'Prophet', 'Neural Network'];

    for (let i = 0; i < 16; i++) {
      revenueForecasts.push({
        company_id: companyIds[i % companyIds.length],
        forecast_name: `Revenue Forecast ${forecastPeriods[i % 4]}`,
        forecast_period: forecastPeriods[i % 4],
        predicted_revenue: (5000000 + Math.random() * 10000000).toFixed(2),
        confidence_level: (75 + Math.random() * 20).toFixed(2),
        model_used: models[i % 4],
        assumptions: 'Based on historical trends, seasonal patterns, and market conditions. Assumes stable economic environment.',
        ai_analysis: 'Forecast indicates strong growth potential with moderate uncertainty. Key drivers include market expansion and new product launches.',
        status: i % 3 === 0 ? 'approved' : 'pending',
        created_by: userIds[i % userIds.length]
      });
    }

    for (const rf of revenueForecasts) {
      await pool.query(
        `INSERT INTO revenue_forecasts (company_id, forecast_name, forecast_period, predicted_revenue, confidence_level, model_used, assumptions, ai_analysis, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [rf.company_id, rf.forecast_name, rf.forecast_period, rf.predicted_revenue, rf.confidence_level, rf.model_used, rf.assumptions, rf.ai_analysis, rf.status, rf.created_by]
      );
    }
    console.log('Revenue forecasts seeded:', revenueForecasts.length);

    // Seed Expense Records (20 items)
    const expenseCategories = ['Marketing', 'Operations', 'Technology', 'Human Resources', 'Travel', 'Office Supplies', 'Legal', 'R&D'];
    const vendors = ['Amazon AWS', 'Google Ads', 'Microsoft', 'Salesforce', 'HubSpot', 'Adobe', 'Slack', 'Zoom'];

    for (let i = 0; i < 20; i++) {
      const category = expenseCategories[i % expenseCategories.length];
      await pool.query(
        `INSERT INTO expense_records (company_id, category, subcategory, amount, date, vendor, description, status, ai_categorization)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          companyIds[i % companyIds.length],
          category,
          `${category} Services`,
          (500 + Math.random() * 50000).toFixed(2),
          `2024-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
          vendors[i % vendors.length],
          `${category} expense for Q${(i % 4) + 1} operations`,
          i % 4 === 0 ? 'approved' : i % 4 === 1 ? 'pending' : 'rejected',
          category
        ]
      );
    }
    console.log('Expense records seeded: 20');

    // Seed Cash Flow Records (18 items)
    const cashFlowTypes = ['operating', 'investing', 'financing'];
    const cashCategories = ['Revenue', 'Expense', 'Investment', 'Loan Payment', 'Dividend', 'Asset Sale'];

    for (let i = 0; i < 18; i++) {
      const isInflow = i % 2 === 0;
      await pool.query(
        `INSERT INTO cash_flow_records (company_id, record_type, category, amount, date, description, source, ai_classification)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          companyIds[i % companyIds.length],
          cashFlowTypes[i % 3],
          cashCategories[i % cashCategories.length],
          isInflow ? (100000 + Math.random() * 500000).toFixed(2) : (-100000 - Math.random() * 300000).toFixed(2),
          `2024-${String((i % 12) + 1).padStart(2, '0')}-15`,
          `${cashCategories[i % cashCategories.length]} transaction`,
          isInflow ? 'Customer Payment' : 'Vendor Payment',
          `Classified as ${cashFlowTypes[i % 3]} activity`
        ]
      );
    }
    console.log('Cash flow records seeded: 18');

    // Seed Budget Actuals (20 items)
    const departments = ['Sales', 'Marketing', 'Engineering', 'Operations', 'Finance', 'HR', 'Legal', 'IT'];
    const budgetCategories = ['Salaries', 'Equipment', 'Software', 'Travel', 'Marketing', 'Utilities'];
    const budgetStatuses = ['on_track', 'at_risk', 'over_budget'];

    for (let i = 0; i < 20; i++) {
      const budgeted = 50000 + Math.random() * 200000;
      const actual = budgeted * (0.8 + Math.random() * 0.4);
      const variance = actual - budgeted;
      const variancePercent = (variance / budgeted) * 100;

      await pool.query(
        `INSERT INTO budget_actuals (company_id, department, category, period, budgeted_amount, actual_amount, variance, variance_percentage, ai_explanation, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          companyIds[i % companyIds.length],
          departments[i % departments.length],
          budgetCategories[i % budgetCategories.length],
          `Q${(i % 4) + 1} 2024`,
          budgeted.toFixed(2),
          actual.toFixed(2),
          variance.toFixed(2),
          variancePercent.toFixed(2),
          variancePercent > 10 ? 'Overspending due to unplanned equipment purchases and increased travel costs.' : variancePercent < -10 ? 'Under budget due to delayed hiring and postponed projects.' : null,
          variancePercent > 10 ? 'over_budget' : variancePercent > 5 ? 'at_risk' : 'on_track'
        ]
      );
    }
    console.log('Budget actuals seeded: 20');

    // Seed Profit Loss Records (16 items)
    for (let i = 0; i < 16; i++) {
      const revenue = 2000000 + Math.random() * 8000000;
      const cogs = revenue * (0.3 + Math.random() * 0.2);
      const grossProfit = revenue - cogs;
      const opExpenses = grossProfit * (0.4 + Math.random() * 0.2);
      const opIncome = grossProfit - opExpenses;

      await pool.query(
        `INSERT INTO profit_loss_records (company_id, period, revenue, cost_of_goods_sold, gross_profit, operating_expenses, operating_income, net_income, earnings_per_share, ai_insights)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          companyIds[i % companyIds.length],
          `Q${(i % 4) + 1} 2024`,
          revenue.toFixed(2),
          cogs.toFixed(2),
          grossProfit.toFixed(2),
          opExpenses.toFixed(2),
          opIncome.toFixed(2),
          opIncome.toFixed(2),
          (opIncome / 1000000).toFixed(4),
          'Strong performance with healthy margins. Revenue growth outpacing expense growth. Consider investing in high-margin product lines.'
        ]
      );
    }
    console.log('Profit loss records seeded: 16');

    // Seed Balance Sheets (15 items)
    for (let i = 0; i < 15; i++) {
      const totalAssets = 10000000 + Math.random() * 50000000;
      const currentAssets = totalAssets * (0.3 + Math.random() * 0.2);
      const fixedAssets = totalAssets - currentAssets;
      const totalLiabilities = totalAssets * (0.3 + Math.random() * 0.3);
      const currentLiabilities = totalLiabilities * (0.4 + Math.random() * 0.2);
      const longTermLiabilities = totalLiabilities - currentLiabilities;
      const equity = totalAssets - totalLiabilities;

      await pool.query(
        `INSERT INTO balance_sheets (company_id, as_of_date, total_assets, current_assets, fixed_assets, total_liabilities, current_liabilities, long_term_liabilities, shareholders_equity, retained_earnings, ai_health_score, ai_analysis)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          companyIds[i % companyIds.length],
          `2024-${String((i % 12) + 1).padStart(2, '0')}-15`,
          totalAssets.toFixed(2),
          currentAssets.toFixed(2),
          fixedAssets.toFixed(2),
          totalLiabilities.toFixed(2),
          currentLiabilities.toFixed(2),
          longTermLiabilities.toFixed(2),
          equity.toFixed(2),
          (equity * 0.3).toFixed(2),
          Math.floor(60 + Math.random() * 35),
          'Healthy balance sheet with strong liquidity ratios. Debt-to-equity ratio within acceptable range. Asset turnover could be improved.'
        ]
      );
    }
    console.log('Balance sheets seeded: 15');

    // Seed KPI Metrics (25 items)
    const kpiNames = ['Revenue Growth', 'Gross Margin', 'Net Profit Margin', 'Current Ratio', 'Quick Ratio', 'Debt to Equity', 'ROE', 'ROA', 'Working Capital', 'Customer Acquisition Cost', 'LTV', 'Churn Rate', 'EBITDA'];
    const kpiCategories = ['profitability', 'liquidity', 'efficiency', 'growth', 'operational'];
    const trends = ['up', 'down', 'stable'];

    for (let i = 0; i < 25; i++) {
      await pool.query(
        `INSERT INTO kpi_metrics (company_id, metric_name, metric_category, current_value, target_value, previous_value, unit, trend, period, ai_recommendation)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          companyIds[i % companyIds.length],
          kpiNames[i % kpiNames.length],
          kpiCategories[i % kpiCategories.length],
          (Math.random() * 100).toFixed(2),
          (Math.random() * 100).toFixed(2),
          (Math.random() * 100).toFixed(2),
          i % 3 === 0 ? '%' : i % 3 === 1 ? 'USD' : 'ratio',
          trends[i % 3],
          `Q${(i % 4) + 1} 2024`,
          'Monitor this KPI closely. Consider adjusting strategy if trend continues.'
        ]
      );
    }
    console.log('KPI metrics seeded: 25');

    // Seed Audit Logs (20 items)
    const actions = ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'APPROVE'];
    const entityTypes = ['financial_statement', 'expense_record', 'budget', 'user', 'report', 'forecast'];
    const riskLevels = ['low', 'medium', 'high'];

    for (let i = 0; i < 20; i++) {
      await pool.query(
        `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, risk_level, ai_risk_assessment)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          companyIds[i % companyIds.length],
          userIds[i % userIds.length],
          actions[i % actions.length],
          entityTypes[i % entityTypes.length],
          companyIds[i % companyIds.length],
          JSON.stringify({ status: 'draft' }),
          JSON.stringify({ status: 'approved' }),
          `192.168.1.${100 + i}`,
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          riskLevels[i % 3],
          i % 3 === 2 ? 'High-risk action detected. Review recommended.' : null
        ]
      );
    }
    console.log('Audit logs seeded: 20');

    // Seed Custom Reports (15 items)
    const reportTypes = ['financial_summary', 'expense_analysis', 'revenue_breakdown', 'budget_variance', 'kpi_dashboard'];

    for (let i = 0; i < 15; i++) {
      await pool.query(
        `INSERT INTO custom_reports (company_id, report_name, report_type, description, query_config, chart_config, filters, schedule, recipients, ai_generated, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          companyIds[i % companyIds.length],
          `${reportTypes[i % reportTypes.length].replace('_', ' ')} Report ${i + 1}`,
          reportTypes[i % reportTypes.length],
          `Automated ${reportTypes[i % reportTypes.length].replace('_', ' ')} report`,
          JSON.stringify({ metrics: ['revenue', 'expenses'], period: 'quarterly' }),
          JSON.stringify({ type: 'bar', colors: ['#3b82f6', '#10b981'] }),
          JSON.stringify({ year: 2024, quarter: (i % 4) + 1 }),
          i % 3 === 0 ? 'daily' : i % 3 === 1 ? 'weekly' : 'monthly',
          ['cfo@company.com', 'finance@company.com'],
          i % 2 === 0,
          userIds[i % userIds.length]
        ]
      );
    }
    console.log('Custom reports seeded: 15');

    // Seed AI Insights (18 items)
    const insightTypes = ['cost_optimization', 'revenue_opportunity', 'risk_alert', 'trend_insight', 'anomaly_finding', 'compliance_warning'];
    const impactLevels = ['low', 'medium', 'high', 'critical'];

    for (let i = 0; i < 18; i++) {
      await pool.query(
        `INSERT INTO ai_insights (company_id, insight_type, title, description, impact_level, confidence_score, data_sources, recommendations, action_items, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          companyIds[i % companyIds.length],
          insightTypes[i % insightTypes.length],
          `${insightTypes[i % insightTypes.length].replace('_', ' ')} Insight ${i + 1}`,
          `AI-generated insight based on analysis of financial data. This ${insightTypes[i % insightTypes.length].replace('_', ' ')} requires attention.`,
          impactLevels[i % impactLevels.length],
          (70 + Math.random() * 25).toFixed(2),
          ['financial_statements', 'expense_records', 'kpi_metrics'],
          ['Review current processes', 'Implement suggested changes', 'Monitor results'],
          JSON.stringify([{ task: 'Review', priority: 'high' }, { task: 'Implement', priority: 'medium' }]),
          i % 3 === 0 ? 'new' : i % 3 === 1 ? 'acknowledged' : 'resolved'
        ]
      );
    }
    console.log('AI insights seeded: 18');

    // Seed Anomaly Detections (16 items)
    const anomalyTypes = ['expense_spike', 'revenue_drop', 'unusual_transaction', 'pattern_deviation', 'threshold_breach'];
    const severities = ['low', 'medium', 'high', 'critical'];

    for (let i = 0; i < 16; i++) {
      const expected = 100000 + Math.random() * 500000;
      const actual = expected * (0.5 + Math.random() * 1);
      const deviation = ((actual - expected) / expected) * 100;

      await pool.query(
        `INSERT INTO anomaly_detections (company_id, anomaly_type, severity, description, affected_metric, expected_value, actual_value, deviation_percentage, detection_date, ai_explanation, resolution_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          companyIds[i % companyIds.length],
          anomalyTypes[i % anomalyTypes.length],
          severities[i % severities.length],
          `Detected ${anomalyTypes[i % anomalyTypes.length].replace('_', ' ')} in financial data`,
          `Metric ${i + 1}`,
          expected.toFixed(2),
          actual.toFixed(2),
          deviation.toFixed(2),
          `2024-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
          `This anomaly appears to be caused by ${anomalyTypes[i % anomalyTypes.length].replace('_', ' ')}. Recommend investigation.`,
          i % 3 === 0 ? 'open' : i % 3 === 1 ? 'investigating' : 'resolved'
        ]
      );
    }
    console.log('Anomaly detections seeded: 16');

    // Seed Trend Analyses (15 items)
    const trendMetrics = ['Revenue', 'Expenses', 'Profit Margin', 'Customer Growth', 'Market Share'];
    const trendDirections = ['upward', 'downward', 'stable', 'volatile'];

    for (let i = 0; i < 15; i++) {
      await pool.query(
        `INSERT INTO trend_analyses (company_id, metric_name, analysis_period, trend_direction, growth_rate, data_points, seasonality_detected, forecast_next_period, ai_narrative)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          companyIds[i % companyIds.length],
          trendMetrics[i % trendMetrics.length],
          `Q${(i % 4) + 1} 2024`,
          trendDirections[i % trendDirections.length],
          (-15 + Math.random() * 30).toFixed(2),
          JSON.stringify([{ month: 'Jan', value: 100 }, { month: 'Feb', value: 110 }, { month: 'Mar', value: 105 }]),
          i % 2 === 0,
          (500000 + Math.random() * 2000000).toFixed(2),
          `Analysis shows ${trendDirections[i % trendDirections.length]} trend for ${trendMetrics[i % trendMetrics.length]}. ${i % 2 === 0 ? 'Seasonal patterns detected.' : 'No significant seasonality.'}`
        ]
      );
    }
    console.log('Trend analyses seeded: 15');

    // Seed Compliance Reports (15 items)
    const regulations = ['SOX', 'GDPR', 'GAAP', 'IFRS', 'SEC', 'HIPAA'];
    const complianceStatuses = ['compliant', 'partially_compliant', 'non_compliant'];

    for (let i = 0; i < 15; i++) {
      await pool.query(
        `INSERT INTO compliance_reports (company_id, regulation_type, report_period, compliance_status, score, findings, remediation_items, due_date, submitted_date, ai_compliance_check)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          companyIds[i % companyIds.length],
          regulations[i % regulations.length],
          `Q${(i % 4) + 1} 2024`,
          complianceStatuses[i % complianceStatuses.length],
          (60 + Math.random() * 40).toFixed(2),
          JSON.stringify([{ finding: 'Minor documentation gap', severity: 'low' }]),
          JSON.stringify([{ item: 'Update documentation', deadline: '2024-12-31' }]),
          `2024-${String((i % 12) + 1).padStart(2, '0')}-15`,
          i % 2 === 0 ? `2024-${String((i % 12) + 1).padStart(2, '0')}-14` : null,
          `AI compliance check for ${regulations[i % regulations.length]} completed. Overall status: ${complianceStatuses[i % complianceStatuses.length]}.`
        ]
      );
    }
    console.log('Compliance reports seeded: 15');

    // Seed Tax Reports (15 items)
    const taxTypes = ['Federal Income', 'State Income', 'Sales Tax', 'Property Tax', 'Payroll Tax'];
    const filingStatuses = ['pending', 'filed', 'overdue'];

    for (let i = 0; i < 15; i++) {
      const taxableIncome = 1000000 + Math.random() * 5000000;
      const taxRate = 0.15 + Math.random() * 0.15;
      const deductions = taxableIncome * (0.1 + Math.random() * 0.1);
      const credits = deductions * 0.2;
      const liability = (taxableIncome - deductions) * taxRate - credits;

      await pool.query(
        `INSERT INTO tax_reports (company_id, tax_type, tax_period, taxable_income, tax_liability, deductions, credits, effective_rate, filing_status, due_date, ai_optimization_suggestions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          companyIds[i % companyIds.length],
          taxTypes[i % taxTypes.length],
          `Q${(i % 4) + 1} 2024`,
          taxableIncome.toFixed(2),
          liability.toFixed(2),
          deductions.toFixed(2),
          credits.toFixed(2),
          (taxRate * 100).toFixed(2),
          filingStatuses[i % filingStatuses.length],
          `2024-${String((i % 12) + 1).padStart(2, '0')}-15`,
          'Consider maximizing R&D tax credits and accelerating depreciation on eligible assets. Review timing of income recognition for potential deferral opportunities.'
        ]
      );
    }
    console.log('Tax reports seeded: 15');

    // Seed Scheduled Reports (15 items)
    const scheduleFrequencies = ['daily', 'weekly', 'monthly', 'quarterly'];
    const reportFormats = ['pdf', 'excel', 'html'];
    const scheduledReportIds = [];

    for (let i = 0; i < 15; i++) {
      const frequency = scheduleFrequencies[i % scheduleFrequencies.length];
      const nextRun = new Date();
      if (frequency === 'daily') nextRun.setDate(nextRun.getDate() + 1);
      else if (frequency === 'weekly') nextRun.setDate(nextRun.getDate() + 7);
      else if (frequency === 'monthly') nextRun.setMonth(nextRun.getMonth() + 1);
      else nextRun.setMonth(nextRun.getMonth() + 3);

      const result = await pool.query(
        `INSERT INTO scheduled_reports (company_id, report_name, report_type, schedule_frequency, schedule_day, schedule_time, recipients, include_sections, format, is_active, next_run)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [
          companyIds[i % companyIds.length],
          `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Financial Report ${i + 1}`,
          i % 3 === 0 ? 'financial_summary' : i % 3 === 1 ? 'executive_report' : 'detailed_analysis',
          frequency,
          frequency === 'weekly' ? (i % 7) : frequency === 'monthly' ? ((i % 28) + 1) : null,
          `${8 + (i % 4)}:00`,
          [`cfo${i}@company.com`, `finance${i}@company.com`],
          ['summary', 'balance_sheet', 'profit_loss', 'kpis'],
          reportFormats[i % reportFormats.length],
          i % 4 !== 0,
          nextRun.toISOString()
        ]
      );
      scheduledReportIds.push(result.rows[0].id);
    }
    console.log('Scheduled reports seeded: 15');

    // Seed Report Execution Logs (20 items)
    const executionStatuses = ['completed', 'completed', 'completed', 'failed', 'running'];

    for (let i = 0; i < 20; i++) {
      const startedAt = new Date();
      startedAt.setDate(startedAt.getDate() - (i + 1));
      const completedAt = new Date(startedAt);
      completedAt.setMinutes(completedAt.getMinutes() + 2 + Math.floor(Math.random() * 5));
      const status = executionStatuses[i % executionStatuses.length];

      await pool.query(
        `INSERT INTO report_execution_logs (scheduled_report_id, company_id, status, started_at, completed_at, error_message, recipients_notified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          scheduledReportIds[i % scheduledReportIds.length],
          companyIds[i % companyIds.length],
          status,
          startedAt.toISOString(),
          status !== 'running' ? completedAt.toISOString() : null,
          status === 'failed' ? 'Failed to connect to email server' : null,
          status === 'completed' ? 2 + Math.floor(Math.random() * 3) : 0
        ]
      );
    }
    console.log('Report execution logs seeded: 20');

    // Seed Saved Queries (15 items)
    const savedQueryTexts = [
      'Show total revenue by quarter',
      'What are the top 5 expense categories?',
      'Compare profit vs revenue over time',
      'Show current assets vs liabilities',
      'Display KPIs with negative trends',
      'Which period had highest net income?',
      'Show expense breakdown by department',
      'What is our gross profit margin trend?',
      'List all high severity anomalies',
      'Compare budget vs actual by category',
      'Show cash flow summary',
      'What is our debt to equity ratio?',
      'Display compliance status overview',
      'Show revenue forecast accuracy',
      'List pending tax filings'
    ];
    const visualizationTypes = ['table', 'chart', 'metric', 'comparison'];

    for (let i = 0; i < 15; i++) {
      await pool.query(
        `INSERT INTO saved_queries (company_id, query_name, query_text, visualization_type)
         VALUES ($1, $2, $3, $4)`,
        [
          companyIds[i % companyIds.length],
          `Saved Query ${i + 1}`,
          savedQueryTexts[i],
          visualizationTypes[i % visualizationTypes.length]
        ]
      );
    }
    console.log('Saved queries seeded: 15');

    console.log('\nDatabase seeding completed successfully!');
    console.log('Summary:');
    console.log('- Companies: 15');
    console.log('- Users: 15');
    console.log('- Financial Statements: 18');
    console.log('- Revenue Forecasts: 16');
    console.log('- Expense Records: 20');
    console.log('- Cash Flow Records: 18');
    console.log('- Budget Actuals: 20');
    console.log('- Profit Loss Records: 16');
    console.log('- Balance Sheets: 15');
    console.log('- KPI Metrics: 25');
    console.log('- Audit Logs: 20');
    console.log('- Custom Reports: 15');
    console.log('- AI Insights: 18');
    console.log('- Anomaly Detections: 16');
    console.log('- Trend Analyses: 15');
    console.log('- Compliance Reports: 15');
    console.log('- Tax Reports: 15');
    console.log('- Scheduled Reports: 15');
    console.log('- Report Execution Logs: 20');
    console.log('- Saved Queries: 15');

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed().catch(console.error);
