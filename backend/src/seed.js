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

    // Seed AI Presentations (15 items)
    const presentationThemes = ['professional', 'modern', 'executive', 'minimal', 'corporate'];
    const sourceTypes = ['financial_statement', 'quarterly_report', 'annual_report', 'budget_analysis', 'forecast'];

    for (let i = 0; i < 15; i++) {
      const slidesData = {
        slides: [
          { slideNumber: 1, title: 'Title Slide', type: 'title', content: { mainTitle: `Financial Review ${i + 1}`, subtitle: 'Executive Presentation', date: '2024' } },
          { slideNumber: 2, title: 'Executive Summary', type: 'summary', content: { keyPoints: ['Revenue growth of 15%', 'Cost optimization achieved', 'Market expansion on track'] } },
          { slideNumber: 3, title: 'Financial Highlights', type: 'metrics', content: { metrics: [{ name: 'Revenue', value: '$10M' }, { name: 'Net Income', value: '$2M' }, { name: 'EBITDA', value: '$3.5M' }] } },
          { slideNumber: 4, title: 'Performance Analysis', type: 'analysis', content: { keyPoints: ['Q4 exceeded targets by 12%', 'Operating margins improved', 'Customer acquisition up 25%'] } },
          { slideNumber: 5, title: 'Market Trends', type: 'chart', content: { keyPoints: ['Industry growth at 8% YoY', 'Market share increased to 15%', 'Competitive positioning improved'] } },
          { slideNumber: 6, title: 'Challenges & Risks', type: 'analysis', content: { keyPoints: ['Supply chain constraints', 'Regulatory changes pending', 'Talent acquisition competitive'] } },
          { slideNumber: 7, title: 'Strategic Recommendations', type: 'recommendation', content: { recommendations: [{ title: 'Increase R&D investment', description: 'Allocate 15% of revenue to innovation' }, { title: 'Expand into new markets', description: 'Target APAC region in Q2' }] } },
          { slideNumber: 8, title: 'Conclusion & Next Steps', type: 'conclusion', content: { keyPoints: ['Strong financial performance', 'Clear growth trajectory', 'Action items for Q1 defined'] } }
        ],
        metadata: { totalSlides: 8, theme: presentationThemes[i % presentationThemes.length] }
      };

      await pool.query(
        `INSERT INTO ai_presentations (company_id, title, description, source_type, slides, theme, status, ai_generated)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
        [
          companyIds[i % companyIds.length],
          `Q${(i % 4) + 1} 2024 Financial Presentation ${i + 1}`,
          `AI-generated presentation for Q${(i % 4) + 1} 2024 financial review`,
          sourceTypes[i % sourceTypes.length],
          JSON.stringify(slidesData),
          presentationThemes[i % presentationThemes.length],
          i % 3 === 0 ? 'generated' : i % 3 === 1 ? 'reviewed' : 'presented'
        ]
      );
    }
    console.log('AI Presentations seeded: 15');

    // Seed AI Variance Explanations (15 items)
    const varianceDepartments = ['Sales', 'Marketing', 'Operations', 'IT', 'HR', 'Finance', 'R&D', 'Legal'];
    const varianceCategories = ['Salaries', 'Marketing Spend', 'Equipment', 'Software', 'Travel', 'Consulting'];

    for (let i = 0; i < 15; i++) {
      const budgeted = 50000 + Math.random() * 200000;
      const actual = budgeted * (0.7 + Math.random() * 0.6);
      const variance = actual - budgeted;
      const variancePercent = (variance / budgeted) * 100;

      const rootCauses = [
        { cause: 'Market conditions changed', likelihood: '65%', evidence: 'Industry reports show similar trends' },
        { cause: 'Timing differences', likelihood: '25%', evidence: 'Invoices processed in different period' }
      ];

      const recommendations = [
        { action: 'Revise budget assumptions', priority: 'high', timeline: '2 weeks', expected_outcome: 'More accurate forecasts' },
        { action: 'Implement variance alerts', priority: 'medium', timeline: '1 month', expected_outcome: 'Early detection of issues' }
      ];

      await pool.query(
        `INSERT INTO ai_variance_explanations (company_id, title, period, department, category, budgeted_amount, actual_amount, variance_amount, variance_percentage, variance_type, root_causes, recommendations, ai_explanation, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          companyIds[i % companyIds.length],
          `${varianceDepartments[i % varianceDepartments.length]} ${varianceCategories[i % varianceCategories.length]} Variance`,
          `Q${(i % 4) + 1} 2024`,
          varianceDepartments[i % varianceDepartments.length],
          varianceCategories[i % varianceCategories.length],
          budgeted.toFixed(2),
          actual.toFixed(2),
          variance.toFixed(2),
          variancePercent.toFixed(2),
          variance >= 0 ? 'favorable' : 'unfavorable',
          JSON.stringify(rootCauses),
          JSON.stringify(recommendations),
          `The variance of ${variancePercent.toFixed(1)}% is primarily due to market conditions and timing differences. The ${varianceDepartments[i % varianceDepartments.length]} department should review their spending patterns.`,
          i % 3 === 0 ? 'analyzed' : i % 3 === 1 ? 'pending' : 'reviewed'
        ]
      );
    }
    console.log('AI Variance Explanations seeded: 15');

    // Seed AI Forecasts (15 items)
    const forecastTypes = ['revenue', 'expense', 'profit', 'cash_flow', 'growth'];
    const forecastMetrics = ['Total Revenue', 'Operating Expenses', 'Net Profit', 'Cash Position', 'Market Share'];
    const forecastMethodologies = ['ARIMA', 'Prophet', 'Linear Regression', 'ML Ensemble', 'Moving Average'];

    for (let i = 0; i < 15; i++) {
      const predictions = [
        { period: 'Q1 2025', predicted_value: 1000000 + Math.random() * 500000, growth_rate: 5 + Math.random() * 10, confidence: 85 },
        { period: 'Q2 2025', predicted_value: 1100000 + Math.random() * 500000, growth_rate: 4 + Math.random() * 8, confidence: 80 },
        { period: 'Q3 2025', predicted_value: 1200000 + Math.random() * 500000, growth_rate: 3 + Math.random() * 7, confidence: 75 },
        { period: 'Q4 2025', predicted_value: 1300000 + Math.random() * 500000, growth_rate: 3 + Math.random() * 6, confidence: 70 }
      ];

      const assumptions = [
        { assumption: 'Market conditions remain stable', impact: 'High', sensitivity: 'high' },
        { assumption: 'No major competitor disruption', impact: 'Medium', sensitivity: 'medium' }
      ];

      const riskFactors = [
        { risk: 'Economic downturn', probability: 25, potential_impact: '15-20% revenue reduction', mitigation: 'Diversify revenue streams' },
        { risk: 'Supply chain disruption', probability: 15, potential_impact: '10% cost increase', mitigation: 'Build strategic inventory' }
      ];

      await pool.query(
        `INSERT INTO ai_forecasts (company_id, forecast_name, forecast_type, metric_name, time_horizon, predictions, methodology, assumptions, risk_factors, ai_analysis, accuracy_score, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          companyIds[i % companyIds.length],
          `${forecastMetrics[i % forecastMetrics.length]} Forecast 2025 - ${i + 1}`,
          forecastTypes[i % forecastTypes.length],
          forecastMetrics[i % forecastMetrics.length],
          '12 months',
          JSON.stringify(predictions),
          forecastMethodologies[i % forecastMethodologies.length],
          JSON.stringify(assumptions),
          JSON.stringify(riskFactors),
          `This forecast predicts steady growth in ${forecastMetrics[i % forecastMetrics.length]} with ${(75 + Math.random() * 15).toFixed(0)}% confidence. Key drivers include market expansion and operational efficiency improvements.`,
          (75 + Math.random() * 20).toFixed(2),
          i % 3 === 0 ? 'active' : i % 3 === 1 ? 'archived' : 'draft'
        ]
      );
    }
    console.log('AI Forecasts seeded: 15');

    // Seed AI Audit Analyses (15 items)
    for (let i = 0; i < 15; i++) {
      const findings = [
        { gap: 'Access control documentation incomplete', regulation: 'SOX', severity: 'medium', remediation: 'Update access control policies' },
        { gap: 'Segregation of duties not enforced', regulation: 'SOX', severity: 'high', remediation: 'Implement role-based access controls' }
      ];

      const highRiskEvents = [
        { event_type: 'Unauthorized data export', user: 'User ' + (i + 1), timestamp: new Date().toISOString(), risk_reason: 'Large volume of sensitive data', recommended_action: 'Review and investigate' },
        { event_type: 'Failed login attempts', user: 'User ' + (i + 2), timestamp: new Date().toISOString(), risk_reason: 'Multiple failed attempts from unknown IP', recommended_action: 'Lock account and investigate' }
      ];

      const patterns = [
        { pattern: 'After-hours access', frequency: '15 occurrences', concern_level: 'medium', explanation: 'May indicate unauthorized activity' },
        { pattern: 'Bulk data modifications', frequency: '8 occurrences', concern_level: 'high', explanation: 'Could indicate data tampering' }
      ];

      const recommendations = [
        { recommendation: 'Implement real-time monitoring', priority: 'high', category: 'security', expected_impact: 'Early threat detection' },
        { recommendation: 'Conduct access rights review', priority: 'medium', category: 'compliance', expected_impact: 'Reduced unauthorized access risk' }
      ];

      await pool.query(
        `INSERT INTO ai_audit_analyses (company_id, analysis_name, analysis_period, total_events_analyzed, risk_score, compliance_score, findings, high_risk_events, patterns_detected, recommendations, ai_summary, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          companyIds[i % companyIds.length],
          `Audit Analysis Q${(i % 4) + 1} 2024 - ${i + 1}`,
          `Q${(i % 4) + 1} 2024`,
          100 + Math.floor(Math.random() * 500),
          (50 + Math.random() * 40).toFixed(2),
          (60 + Math.random() * 35).toFixed(2),
          JSON.stringify(findings),
          JSON.stringify(highRiskEvents),
          JSON.stringify(patterns),
          JSON.stringify(recommendations),
          `Comprehensive audit trail analysis for Q${(i % 4) + 1} 2024. Overall risk level is ${i % 3 === 0 ? 'medium' : i % 3 === 1 ? 'low' : 'high'}. Key findings include access control gaps and unusual activity patterns.`,
          'completed'
        ]
      );
    }
    console.log('AI Audit Analyses seeded: 15');

    // Seed AI Board Reports (15 items)
    for (let i = 0; i < 15; i++) {
      const financialHighlights = {
        revenue: { current: 10000000 + Math.random() * 5000000, previous: 9000000 + Math.random() * 4000000, change_percent: (5 + Math.random() * 10).toFixed(1), commentary: 'Strong revenue growth driven by new product launches' },
        profitability: { net_income: 2000000 + Math.random() * 1000000, margin: (15 + Math.random() * 10).toFixed(1) + '%', commentary: 'Improved margins through operational efficiency' },
        liquidity: { current_ratio: (1.5 + Math.random()).toFixed(2), working_capital: 5000000 + Math.random() * 2000000, commentary: 'Healthy liquidity position maintained' }
      };

      const keyMetrics = [
        { metric: 'Revenue Growth', value: '12%', target: '10%', status: 'on_track', trend: 'up', commentary: 'Exceeding target' },
        { metric: 'Customer Acquisition', value: '1,500', target: '1,200', status: 'on_track', trend: 'up', commentary: 'Strong marketing performance' },
        { metric: 'Employee Satisfaction', value: '82%', target: '85%', status: 'at_risk', trend: 'stable', commentary: 'Needs improvement' }
      ];

      const strategicInitiatives = [
        { initiative: 'Digital Transformation', status: 'on_track', progress_percent: 65, key_milestones: ['Phase 1 Complete', 'Phase 2 In Progress'], next_steps: ['Complete Phase 2'], budget_status: 'on_budget', risks: ['Resource constraints'] },
        { initiative: 'Market Expansion', status: 'delayed', progress_percent: 40, key_milestones: ['Market Research Done'], next_steps: ['Finalize market entry strategy'], budget_status: 'under_budget', risks: ['Regulatory approval'] }
      ];

      const riskAssessment = {
        overall_risk_rating: i % 3 === 0 ? 'medium' : i % 3 === 1 ? 'low' : 'high',
        top_risks: [
          { risk: 'Cybersecurity threats', category: 'operational', likelihood: 'medium', impact: 'high', mitigation: 'Enhanced security measures', owner: 'CTO' },
          { risk: 'Market competition', category: 'strategic', likelihood: 'high', impact: 'medium', mitigation: 'Product differentiation', owner: 'CEO' }
        ],
        emerging_risks: ['AI disruption', 'Regulatory changes'],
        risk_trend: 'stable'
      };

      const recommendations = [
        { recommendation: 'Accelerate digital transformation', rationale: 'Competitive advantage', expected_impact: 'Increased efficiency', priority: 'high', timeline: 'Q2 2025', resources_required: '$2M investment', board_action_required: true },
        { recommendation: 'Expand talent acquisition', rationale: 'Support growth', expected_impact: 'Improved capacity', priority: 'medium', timeline: 'Q3 2025', resources_required: '50 new hires', board_action_required: false }
      ];

      await pool.query(
        `INSERT INTO ai_board_reports (company_id, report_title, report_period, executive_summary, financial_highlights, key_metrics, strategic_initiatives, risk_assessment, outlook, recommendations, ai_generated, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11)`,
        [
          companyIds[i % companyIds.length],
          `Board Report Q${(i % 4) + 1} 2024 - ${i + 1}`,
          `Q${(i % 4) + 1} 2024`,
          `This quarter saw strong performance with revenue growth of ${(8 + Math.random() * 7).toFixed(1)}% and improved operational efficiency. Key achievements include successful product launches and market expansion. Challenges remain in talent acquisition and competitive pressures.`,
          JSON.stringify(financialHighlights),
          JSON.stringify(keyMetrics),
          JSON.stringify(strategicInitiatives),
          JSON.stringify(riskAssessment),
          'The outlook for the next quarter is positive with continued growth expected. Focus areas include digital transformation completion and market share expansion.',
          JSON.stringify(recommendations),
          i % 3 === 0 ? 'generated' : i % 3 === 1 ? 'reviewed' : 'presented'
        ]
      );
    }
    console.log('AI Board Reports seeded: 15');

    // Seed AI Expense Categorizations (18 items)
    const aiExpenseDescriptions = [
      'AWS Monthly Cloud Services', 'Google Ads Campaign Q4', 'Microsoft Office 365 Subscription',
      'Team Lunch Meeting - Client Entertainment', 'Uber Business Travel - Airport', 'Adobe Creative Cloud Annual',
      'Zoom Pro Annual Subscription', 'WeWork Office Space Rent', 'LinkedIn Premium Recruiting',
      'Salesforce CRM License', 'Employee Training Workshop', 'Legal Consultation Fee',
      'Office Furniture Purchase', 'Network Security Software', 'Company Retreat Expenses',
      'Marketing Conference Registration', 'Hardware Equipment - Laptops', 'Professional Certification Course'
    ];
    const aiExpenseVendors = [
      'Amazon Web Services', 'Google', 'Microsoft', 'Local Restaurant', 'Uber', 'Adobe',
      'Zoom', 'WeWork', 'LinkedIn', 'Salesforce', 'Training Corp', 'Law Firm LLC',
      'IKEA', 'Norton', 'Resort Hotel', 'TechConf Inc', 'Dell', 'Coursera'
    ];
    const aiExpenseCategories = [
      'Technology', 'Marketing', 'Software', 'Entertainment', 'Travel', 'Software',
      'Software', 'Facilities', 'Recruiting', 'Software', 'Training', 'Professional Services',
      'Office Supplies', 'Technology', 'Entertainment', 'Marketing', 'Equipment', 'Training'
    ];
    const aiExpenseSubcategories = [
      'Cloud Services', 'Digital Advertising', 'Productivity Software', 'Client Relations', 'Ground Transport', 'Design Tools',
      'Communication', 'Office Lease', 'Talent Acquisition', 'CRM', 'Professional Development', 'Legal',
      'Furniture', 'Security', 'Team Building', 'Conferences', 'Hardware', 'Education'
    ];

    for (let i = 0; i < 18; i++) {
      const amount = (100 + Math.random() * 10000).toFixed(2);
      const confidenceScore = (70 + Math.random() * 25).toFixed(2);
      const isCategorized = i % 3 !== 0;
      const isTaxDeductible = i % 4 !== 0;

      const policyCompliance = {
        is_compliant: i % 5 !== 0,
        policy_notes: i % 5 === 0 ? 'Expense exceeds department limit without pre-approval' : 'Within policy guidelines',
        approval_required: parseFloat(amount) > 5000,
        approval_level: parseFloat(amount) > 5000 ? 'director' : 'manager'
      };

      const fraudRisk = {
        risk_level: i % 7 === 0 ? 'medium' : 'low',
        risk_factors: i % 7 === 0 ? ['Unusual vendor', 'First-time expense type'] : [],
        recommended_actions: i % 7 === 0 ? ['Request additional documentation', 'Manager review required'] : ['None required']
      };

      const optimizations = [
        { suggestion: 'Consider annual subscription for 20% savings', potential_savings: '$' + (parseFloat(amount) * 0.2).toFixed(2), implementation: 'Switch to yearly billing' },
        { suggestion: 'Negotiate volume discount with vendor', potential_savings: '10-15%', implementation: 'Contact vendor for enterprise pricing' }
      ];

      await pool.query(
        `INSERT INTO ai_expense_categorizations (company_id, expense_description, amount, vendor, date, category, subcategory, confidence_score, tax_deductible, gl_account, cost_center, policy_compliance, fraud_risk, optimization_suggestions, ai_reasoning, tags, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          companyIds[i % companyIds.length],
          aiExpenseDescriptions[i],
          amount,
          aiExpenseVendors[i],
          `2024-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
          isCategorized ? aiExpenseCategories[i] : null,
          isCategorized ? aiExpenseSubcategories[i] : null,
          isCategorized ? confidenceScore : null,
          isCategorized ? isTaxDeductible : null,
          isCategorized ? `6${100 + i}-${aiExpenseCategories[i].substring(0, 3).toUpperCase()}` : null,
          isCategorized ? `CC-${aiExpenseCategories[i].substring(0, 3).toUpperCase()}-001` : null,
          isCategorized ? JSON.stringify(policyCompliance) : null,
          isCategorized ? JSON.stringify(fraudRisk) : null,
          isCategorized ? JSON.stringify(optimizations) : null,
          isCategorized ? `This expense has been categorized as ${aiExpenseCategories[i]} based on vendor analysis and expense description. The ${aiExpenseSubcategories[i]} subcategory was selected due to the nature of the service/product.` : null,
          isCategorized ? [aiExpenseCategories[i].toLowerCase(), aiExpenseSubcategories[i].toLowerCase().replace(' ', '-'), 'q4-2024'] : null,
          isCategorized ? 'categorized' : 'pending'
        ]
      );
    }
    console.log('AI Expense Categorizations seeded: 18');

    // Seed AI Responses (15 items)
    const featureTypes = ['kpi_analysis', 'financial_statement', 'variance_analysis', 'forecast', 'audit_analysis', 'board_report', 'expense_categorization'];
    const featureNames = [
      'KPI Deep Dive Analysis', 'Revenue Trend Insights', 'Expense Variance Report', 'Q4 Revenue Forecast',
      'Annual Audit Summary', 'Board Executive Brief', 'Expense Classification', 'Cash Flow Prediction',
      'Profitability Analysis', 'Budget Variance Explanation', 'Growth Rate Forecast', 'Compliance Review',
      'Risk Assessment Report', 'Market Comparison Analysis', 'Operational Efficiency Review'
    ];
    const responseTypes = ['analysis', 'recommendation', 'summary', 'forecast', 'classification'];
    for (let i = 0; i < 15; i++) {
      await pool.query(
        `INSERT INTO ai_responses (company_id, feature_type, feature_name, prompt_summary, raw_response, parsed_response, response_type, model_used, tokens_used, processing_time_ms, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          companyIds[i % companyIds.length],
          featureTypes[i % featureTypes.length],
          featureNames[i],
          `Analyze ${featureNames[i]} for company ${i + 1} covering Q${(i % 4) + 1} 2024 financial data with focus on key trends and actionable insights.`,
          `Based on the analysis of the provided financial data, here are the key findings:\n\n1. Revenue showed a ${i % 2 === 0 ? 'positive' : 'negative'} trend of ${(5 + i * 1.5).toFixed(1)}% compared to the previous period.\n2. Operating expenses ${i % 3 === 0 ? 'decreased' : 'increased'} by ${(3 + i).toFixed(1)}%, primarily driven by ${i % 2 === 0 ? 'efficiency improvements' : 'expansion costs'}.\n3. Key recommendations include ${i % 2 === 0 ? 'maintaining current growth trajectory' : 'implementing cost optimization measures'}.\n\nOverall assessment: ${i % 3 === 0 ? 'Strong performance with room for improvement' : i % 3 === 1 ? 'Moderate performance meeting expectations' : 'Areas of concern requiring attention'}.`,
          JSON.stringify({
            summary: `Financial ${featureTypes[i % featureTypes.length]} completed successfully`,
            key_metrics: { growth_rate: (5 + i * 1.5).toFixed(1) + '%', confidence: (75 + i).toFixed(0) + '%' },
            recommendations: [`Focus on ${i % 2 === 0 ? 'growth' : 'efficiency'}`, `Monitor ${i % 2 === 0 ? 'market trends' : 'cost centers'}`],
            risk_level: i % 3 === 0 ? 'low' : i % 3 === 1 ? 'medium' : 'high'
          }),
          responseTypes[i % responseTypes.length],
          'anthropic/claude-haiku-4.5',
          800 + Math.floor(Math.random() * 1200),
          500 + Math.floor(Math.random() * 3000),
          'completed'
        ]
      );
    }
    console.log('AI Responses seeded: 15');

    // Seed Scenario Analyses (15 items)
    const scenarioTypes = ['best_case', 'worst_case', 'most_likely', 'custom'];
    for (let i = 0; i < 15; i++) {
      await pool.query(
        `INSERT INTO scenario_analyses (company_id, scenario_name, scenario_type, base_values, assumptions, variables, projected_values, impact_summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          companyIds[i % companyIds.length],
          ['Revenue Growth Scenario', 'Cost Reduction Plan', 'Market Expansion', 'Recession Impact', 'New Product Launch',
           'Merger Synergies', 'Supply Chain Disruption', 'Price Increase Scenario', 'Workforce Reduction', 'Digital Transformation',
           'Interest Rate Hike', 'Currency Fluctuation', 'Regulatory Change', 'Competitor Entry', 'Technology Investment'][i],
          scenarioTypes[i % scenarioTypes.length],
          JSON.stringify({ revenue: 1000000 + i * 200000, expenses: 600000 + i * 100000, net_income: 400000 + i * 100000 }),
          JSON.stringify({ revenue_growth: (5 + i * 2) + '%', cost_change: (i % 2 === 0 ? '-' : '+') + (3 + i) + '%' }),
          JSON.stringify({ revenue_change: (i % 2 === 0 ? 1 : -1) * (5 + i * 1.5), expense_change: (i % 3 === 0 ? 1 : -1) * (3 + i) }),
          JSON.stringify({ projected_revenue: 1000000 + i * 250000, projected_expenses: 600000 + i * 80000, projected_income: 400000 + i * 170000 }),
          JSON.stringify({ revenue_impact: (i % 2 === 0 ? '+' : '-') + '$' + (50000 + i * 30000), probability: (30 + i * 4) + '%' })
        ]
      );
    }
    console.log('Scenario Analyses seeded: 15');

    // Seed DCF Valuations (15 items)
    for (let i = 0; i < 15; i++) {
      const initialFcf = 500000 + i * 200000;
      const wacc = (8 + i * 0.5).toFixed(4);
      const terminalGrowth = (2 + i * 0.1).toFixed(4);
      const terminalValue = initialFcf * (1 + parseFloat(terminalGrowth) / 100) / (parseFloat(wacc) / 100 - parseFloat(terminalGrowth) / 100);
      const enterpriseValue = initialFcf * 5 + terminalValue * 0.6;

      await pool.query(
        `INSERT INTO dcf_valuations (company_id, valuation_name, initial_fcf, projection_years, growth_rates, wacc, terminal_growth_rate, projected_cash_flows, terminal_value, enterprise_value, equity_value, sensitivity_matrix, assumptions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          companyIds[i % companyIds.length],
          ['FY2024 DCF Analysis', 'Acquisition Valuation', 'IPO Pricing Model', 'Annual Valuation Update', 'Strategic Review DCF',
           'Investor Presentation DCF', 'Board Review Valuation', 'Quarterly Update', 'Sensitivity Analysis DCF', 'Conservative Estimate',
           'Aggressive Growth Model', 'Base Case Valuation', 'Peer Comparison DCF', 'LBO Analysis', 'Sum of Parts Valuation'][i],
          initialFcf, 5,
          JSON.stringify([15 - i, 13 - i * 0.5, 11 - i * 0.3, 9 - i * 0.2, 7]),
          wacc, terminalGrowth,
          JSON.stringify(Array.from({length: 5}, (_, j) => ({ year: j + 1, fcf: initialFcf * Math.pow(1.1, j + 1), pv: initialFcf * Math.pow(1.1, j + 1) / Math.pow(1 + parseFloat(wacc) / 100, j + 1) }))),
          terminalValue.toFixed(2), enterpriseValue.toFixed(2), (enterpriseValue * 0.85).toFixed(2),
          JSON.stringify({ wacc_range: [parseFloat(wacc) - 2, parseFloat(wacc) + 2], growth_range: [1, 4] }),
          JSON.stringify({ tax_rate: 25, debt_ratio: 30, risk_free_rate: 3.5, market_premium: 5.5 })
        ]
      );
    }
    console.log('DCF Valuations seeded: 15');

    // Seed Monte Carlo Simulations (15 items)
    for (let i = 0; i < 15; i++) {
      const mean = 1000000 + i * 300000;
      const std = mean * 0.15;
      await pool.query(
        `INSERT INTO monte_carlo_simulations (company_id, simulation_name, simulation_type, num_simulations, variables, projection_years, statistics, percentiles, probabilities, var_95, var_99)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          companyIds[i % companyIds.length],
          ['Revenue Risk Analysis', 'Profit Probability Model', 'Cash Flow Simulation', 'Investment Risk Model', 'Market Risk Assessment',
           'Portfolio VaR Analysis', 'Budget Risk Simulation', 'Growth Probability', 'Expense Variability', 'NPV Risk Model',
           'Break-Even Probability', 'Currency Risk Sim', 'Interest Rate Impact', 'Supply Chain Risk', 'Demand Uncertainty'][i],
          ['profit', 'revenue', 'cash_flow', 'investment', 'portfolio'][i % 5],
          10000,
          JSON.stringify({ revenue_growth: { mean: 10 + i, std: 5 }, cost_ratio: { mean: 65 - i * 0.5, std: 4 } }),
          5,
          JSON.stringify({ mean: mean, median: mean * 0.98, std: std, min: mean - std * 3, max: mean + std * 3, skewness: 0.1 + i * 0.02 }),
          JSON.stringify({ p10: mean - std * 1.28, p25: mean - std * 0.67, p50: mean, p75: mean + std * 0.67, p90: mean + std * 1.28, p95: mean + std * 1.65, p99: mean + std * 2.33 }),
          JSON.stringify({ profit_positive: (75 + i) + '%', target_achievement: (60 + i * 2) + '%', loss_probability: (25 - i) + '%' }),
          (mean - std * 1.65).toFixed(2),
          (mean - std * 2.33).toFixed(2)
        ]
      );
    }
    console.log('Monte Carlo Simulations seeded: 15');

    // Seed Capital Projects (15 items)
    const projectStatuses = ['draft', 'approved', 'in_progress', 'completed', 'rejected'];
    for (let i = 0; i < 15; i++) {
      const investment = 200000 + i * 150000;
      const annualCf = investment * (0.25 + i * 0.02);
      const npv = annualCf * 5 - investment;
      const irr = (10 + i * 1.5).toFixed(4);
      await pool.query(
        `INSERT INTO capital_projects (company_id, project_name, initial_investment, cash_flows, discount_rate, project_life, salvage_value, npv, irr, mirr, payback_period, discounted_payback, profitability_index, eaa, decision, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          companyIds[i % companyIds.length],
          ['Warehouse Expansion', 'IT Infrastructure Upgrade', 'New Production Line', 'Office Renovation', 'Fleet Modernization',
           'R&D Lab Setup', 'Retail Store Opening', 'Solar Panel Installation', 'ERP Implementation', 'Distribution Center',
           'Cloud Migration', 'Manufacturing Robot', 'Customer Portal', 'Data Center Build', 'Automation Project'][i],
          investment,
          JSON.stringify(Array.from({length: 5}, (_, j) => annualCf * (1 + j * 0.05))),
          (8 + i * 0.5).toFixed(4), 5, investment * 0.1,
          npv.toFixed(2), irr, (parseFloat(irr) - 2).toFixed(4),
          (investment / annualCf).toFixed(2), (investment / annualCf * 1.15).toFixed(2),
          (1 + npv / investment).toFixed(4), (npv / 5).toFixed(2),
          JSON.stringify({ recommendation: npv > 0 ? 'Accept' : 'Reject', confidence: (70 + i * 2) + '%' }),
          projectStatuses[i % projectStatuses.length]
        ]
      );
    }
    console.log('Capital Projects seeded: 15');

    // Seed Break-Even Analyses (15 items)
    for (let i = 0; i < 15; i++) {
      const fixedCosts = 50000 + i * 25000;
      const varCostPerUnit = 15 + i * 3;
      const sellingPrice = 40 + i * 5;
      const contribMargin = sellingPrice - varCostPerUnit;
      const breakEvenUnits = fixedCosts / contribMargin;
      await pool.query(
        `INSERT INTO break_even_analyses (company_id, analysis_name, fixed_costs, variable_cost_per_unit, selling_price_per_unit, break_even_units, break_even_revenue, contribution_margin, contribution_margin_ratio, margin_of_safety, operating_leverage, sensitivity_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          companyIds[i % companyIds.length],
          ['Product A Break-Even', 'Service Line Analysis', 'New Market Entry', 'Q4 Profitability', 'Product Bundle Analysis',
           'Subscription Model BE', 'Seasonal Product BE', 'Premium Tier Analysis', 'Enterprise Plan BE', 'Retail Channel BE',
           'Online Sales Model', 'Wholesale Analysis', 'Export Market BE', 'New SKU Viability', 'Franchise Model BE'][i],
          fixedCosts, varCostPerUnit, sellingPrice,
          breakEvenUnits.toFixed(2), (breakEvenUnits * sellingPrice).toFixed(2),
          contribMargin.toFixed(4), (contribMargin / sellingPrice).toFixed(4),
          (20 + i * 3).toFixed(4), (2 + i * 0.3).toFixed(4),
          JSON.stringify({ price_sensitivity: Array.from({length: 5}, (_, j) => ({ price: sellingPrice * (0.8 + j * 0.1), be_units: fixedCosts / (sellingPrice * (0.8 + j * 0.1) - varCostPerUnit) })) })
        ]
      );
    }
    console.log('Break-Even Analyses seeded: 15');

    // Seed Working Capital Analyses (15 items)
    for (let i = 0; i < 15; i++) {
      const ar = 200000 + i * 50000;
      const inv = 150000 + i * 40000;
      const ap = 120000 + i * 30000;
      const rev = 2000000 + i * 300000;
      const cogs = rev * 0.6;
      const dso = (ar / rev * 365).toFixed(2);
      const dio = (inv / cogs * 365).toFixed(2);
      const dpo = (ap / cogs * 365).toFixed(2);
      const ccc = (parseFloat(dso) + parseFloat(dio) - parseFloat(dpo)).toFixed(2);
      await pool.query(
        `INSERT INTO working_capital_analyses (company_id, analysis_name, accounts_receivable, inventory, accounts_payable, revenue, cogs, dso, dio, dpo, cash_conversion_cycle, working_capital, optimization_potential, recommendations)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          companyIds[i % companyIds.length],
          ['Q4 2024 WC Review', 'Annual Optimization', 'Cash Cycle Improvement', 'Inventory Reduction Plan', 'AR Collection Drive',
           'AP Extension Analysis', 'Seasonal WC Planning', 'Growth Phase WC', 'Efficiency Benchmark', 'Supplier Negotiation Impact',
           'Lean Inventory Model', 'Dynamic Discounting', 'Factoring Evaluation', 'JIT Implementation', 'WC Forecasting Model'][i],
          ar, inv, ap, rev, cogs, dso, dio, dpo, ccc,
          (ar + inv - ap).toFixed(2), ((ar + inv - ap) * 0.15).toFixed(2),
          JSON.stringify([
            { action: 'Reduce DSO by 5 days', impact: '$' + (rev / 365 * 5).toFixed(0), priority: 'high' },
            { action: 'Negotiate DPO extension', impact: '$' + (cogs / 365 * 3).toFixed(0), priority: 'medium' },
            { action: 'Optimize inventory levels', impact: '$' + (inv * 0.1).toFixed(0), priority: 'medium' }
          ])
        ]
      );
    }
    console.log('Working Capital Analyses seeded: 15');

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
    console.log('- AI Presentations: 15');
    console.log('- AI Variance Explanations: 15');
    console.log('- AI Forecasts: 15');
    console.log('- AI Audit Analyses: 15');
    console.log('- AI Board Reports: 15');
    console.log('- AI Expense Categorizations: 18');
    console.log('- AI Responses: 15');
    console.log('- Scenario Analyses: 15');
    console.log('- DCF Valuations: 15');
    console.log('- Monte Carlo Simulations: 15');
    console.log('- Capital Projects: 15');
    console.log('- Break-Even Analyses: 15');
    console.log('- Working Capital Analyses: 15');

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed().catch(console.error);
