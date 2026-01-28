-- AI Financial Report Generator Database Schema
-- Enterprise SaaS Database Structure

-- Drop existing tables if they exist
DROP TABLE IF EXISTS ai_insights CASCADE;
DROP TABLE IF EXISTS anomaly_detections CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS budget_actuals CASCADE;
DROP TABLE IF EXISTS cash_flow_records CASCADE;
DROP TABLE IF EXISTS compliance_reports CASCADE;
DROP TABLE IF EXISTS custom_reports CASCADE;
DROP TABLE IF EXISTS expense_records CASCADE;
DROP TABLE IF EXISTS financial_statements CASCADE;
DROP TABLE IF EXISTS kpi_metrics CASCADE;
DROP TABLE IF EXISTS profit_loss_records CASCADE;
DROP TABLE IF EXISTS revenue_forecasts CASCADE;
DROP TABLE IF EXISTS tax_reports CASCADE;
DROP TABLE IF EXISTS trend_analyses CASCADE;
DROP TABLE IF EXISTS balance_sheets CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'analyst',
    company_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Companies table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    fiscal_year_end VARCHAR(20) DEFAULT 'December',
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Financial Statements
CREATE TABLE financial_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    statement_type VARCHAR(50) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_revenue DECIMAL(15,2),
    total_expenses DECIMAL(15,2),
    net_income DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'draft',
    ai_summary TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Revenue Forecasts
CREATE TABLE revenue_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    forecast_name VARCHAR(255) NOT NULL,
    forecast_period VARCHAR(50) NOT NULL,
    predicted_revenue DECIMAL(15,2) NOT NULL,
    confidence_level DECIMAL(5,2),
    model_used VARCHAR(100),
    assumptions TEXT,
    ai_analysis TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expense Records
CREATE TABLE expense_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    amount DECIMAL(15,2) NOT NULL,
    date DATE NOT NULL,
    vendor VARCHAR(255),
    description TEXT,
    receipt_url VARCHAR(500),
    approved_by UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    ai_categorization TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cash Flow Records
CREATE TABLE cash_flow_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    record_type VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    source VARCHAR(255),
    ai_classification TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budget vs Actuals
CREATE TABLE budget_actuals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    department VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    period VARCHAR(50) NOT NULL,
    budgeted_amount DECIMAL(15,2) NOT NULL,
    actual_amount DECIMAL(15,2),
    variance DECIMAL(15,2),
    variance_percentage DECIMAL(5,2),
    ai_explanation TEXT,
    status VARCHAR(20) DEFAULT 'on_track',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profit & Loss Records
CREATE TABLE profit_loss_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    period VARCHAR(50) NOT NULL,
    revenue DECIMAL(15,2) NOT NULL,
    cost_of_goods_sold DECIMAL(15,2),
    gross_profit DECIMAL(15,2),
    operating_expenses DECIMAL(15,2),
    operating_income DECIMAL(15,2),
    net_income DECIMAL(15,2),
    earnings_per_share DECIMAL(10,4),
    ai_insights TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Balance Sheets
CREATE TABLE balance_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    as_of_date DATE NOT NULL,
    total_assets DECIMAL(15,2) NOT NULL,
    current_assets DECIMAL(15,2),
    fixed_assets DECIMAL(15,2),
    total_liabilities DECIMAL(15,2),
    current_liabilities DECIMAL(15,2),
    long_term_liabilities DECIMAL(15,2),
    shareholders_equity DECIMAL(15,2),
    retained_earnings DECIMAL(15,2),
    ai_health_score INTEGER,
    ai_analysis TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KPI Metrics
CREATE TABLE kpi_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    metric_name VARCHAR(100) NOT NULL,
    metric_category VARCHAR(50) NOT NULL,
    current_value DECIMAL(15,4) NOT NULL,
    target_value DECIMAL(15,4),
    previous_value DECIMAL(15,4),
    unit VARCHAR(20),
    trend VARCHAR(20),
    period VARCHAR(50) NOT NULL,
    ai_recommendation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    risk_level VARCHAR(20) DEFAULT 'low',
    ai_risk_assessment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Custom Reports
CREATE TABLE custom_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    report_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    description TEXT,
    query_config JSONB,
    chart_config JSONB,
    filters JSONB,
    schedule VARCHAR(50),
    recipients TEXT[],
    last_generated TIMESTAMP,
    ai_generated BOOLEAN DEFAULT false,
    ai_content TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Insights
CREATE TABLE ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    insight_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    impact_level VARCHAR(20),
    confidence_score DECIMAL(5,2),
    data_sources TEXT[],
    recommendations TEXT[],
    action_items JSONB,
    status VARCHAR(20) DEFAULT 'new',
    acknowledged_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Anomaly Detections
CREATE TABLE anomaly_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    anomaly_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    affected_metric VARCHAR(100),
    expected_value DECIMAL(15,2),
    actual_value DECIMAL(15,2),
    deviation_percentage DECIMAL(10,2),
    detection_date DATE NOT NULL,
    ai_explanation TEXT,
    resolution_status VARCHAR(20) DEFAULT 'open',
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trend Analyses
CREATE TABLE trend_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    metric_name VARCHAR(100) NOT NULL,
    analysis_period VARCHAR(50) NOT NULL,
    trend_direction VARCHAR(20) NOT NULL,
    growth_rate DECIMAL(10,2),
    data_points JSONB,
    seasonality_detected BOOLEAN DEFAULT false,
    forecast_next_period DECIMAL(15,2),
    ai_narrative TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Compliance Reports
CREATE TABLE compliance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    regulation_type VARCHAR(100) NOT NULL,
    report_period VARCHAR(50) NOT NULL,
    compliance_status VARCHAR(20) NOT NULL,
    score DECIMAL(5,2),
    findings JSONB,
    remediation_items JSONB,
    due_date DATE,
    submitted_date DATE,
    ai_compliance_check TEXT,
    reviewer UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tax Reports
CREATE TABLE tax_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    tax_type VARCHAR(100) NOT NULL,
    tax_period VARCHAR(50) NOT NULL,
    taxable_income DECIMAL(15,2),
    tax_liability DECIMAL(15,2),
    deductions DECIMAL(15,2),
    credits DECIMAL(15,2),
    effective_rate DECIMAL(5,2),
    filing_status VARCHAR(20) DEFAULT 'pending',
    due_date DATE,
    ai_optimization_suggestions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scheduled Reports
CREATE TABLE scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    report_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    schedule_frequency VARCHAR(50) NOT NULL,
    schedule_day INTEGER,
    schedule_time VARCHAR(10) DEFAULT '09:00',
    recipients TEXT[],
    include_sections TEXT[],
    format VARCHAR(20) DEFAULT 'pdf',
    is_active BOOLEAN DEFAULT true,
    last_run TIMESTAMP,
    next_run TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Report Execution Logs
CREATE TABLE report_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_report_id UUID REFERENCES scheduled_reports(id),
    company_id UUID REFERENCES companies(id),
    status VARCHAR(20) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    error_message TEXT,
    file_url VARCHAR(500),
    recipients_notified INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Saved Queries (for Natural Language Query feature)
CREATE TABLE saved_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    query_name VARCHAR(255) NOT NULL,
    query_text TEXT NOT NULL,
    visualization_type VARCHAR(50) DEFAULT 'table',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scenario Analyses (What-If Analysis)
CREATE TABLE scenario_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    scenario_name VARCHAR(255) NOT NULL,
    scenario_type VARCHAR(100),
    base_values JSONB,
    assumptions JSONB,
    variables JSONB,
    projected_values JSONB,
    impact_summary JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DCF Valuations
CREATE TABLE dcf_valuations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    valuation_name VARCHAR(255) NOT NULL,
    initial_fcf DECIMAL(15,2),
    projection_years INTEGER DEFAULT 5,
    growth_rates JSONB,
    wacc DECIMAL(8,4),
    terminal_growth_rate DECIMAL(8,4),
    projected_cash_flows JSONB,
    terminal_value DECIMAL(18,2),
    enterprise_value DECIMAL(18,2),
    equity_value DECIMAL(18,2),
    sensitivity_matrix JSONB,
    assumptions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Monte Carlo Simulations
CREATE TABLE monte_carlo_simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    simulation_name VARCHAR(255) NOT NULL,
    simulation_type VARCHAR(100),
    num_simulations INTEGER DEFAULT 10000,
    variables JSONB,
    projection_years INTEGER DEFAULT 5,
    statistics JSONB,
    percentiles JSONB,
    probabilities JSONB,
    var_95 DECIMAL(15,2),
    var_99 DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Capital Projects (Capital Budgeting)
CREATE TABLE capital_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    project_name VARCHAR(255) NOT NULL,
    initial_investment DECIMAL(15,2) NOT NULL,
    cash_flows JSONB,
    discount_rate DECIMAL(8,4),
    project_life INTEGER,
    salvage_value DECIMAL(15,2) DEFAULT 0,
    npv DECIMAL(15,2),
    irr DECIMAL(8,4),
    mirr DECIMAL(8,4),
    payback_period DECIMAL(8,2),
    discounted_payback DECIMAL(8,2),
    profitability_index DECIMAL(8,4),
    eaa DECIMAL(15,2),
    decision JSONB,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Break-Even Analyses
CREATE TABLE break_even_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    analysis_name VARCHAR(255) NOT NULL,
    fixed_costs DECIMAL(15,2) NOT NULL,
    variable_cost_per_unit DECIMAL(15,4) NOT NULL,
    selling_price_per_unit DECIMAL(15,4) NOT NULL,
    break_even_units DECIMAL(15,2),
    break_even_revenue DECIMAL(15,2),
    contribution_margin DECIMAL(15,4),
    contribution_margin_ratio DECIMAL(8,4),
    margin_of_safety DECIMAL(8,4),
    operating_leverage DECIMAL(8,4),
    sensitivity_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Working Capital Analyses
CREATE TABLE working_capital_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    analysis_name VARCHAR(255) NOT NULL,
    accounts_receivable DECIMAL(15,2),
    inventory DECIMAL(15,2),
    accounts_payable DECIMAL(15,2),
    revenue DECIMAL(15,2),
    cogs DECIMAL(15,2),
    dso DECIMAL(8,2),
    dio DECIMAL(8,2),
    dpo DECIMAL(8,2),
    cash_conversion_cycle DECIMAL(8,2),
    working_capital DECIMAL(15,2),
    optimization_potential DECIMAL(15,2),
    recommendations JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_financial_statements_company ON financial_statements(company_id);
CREATE INDEX idx_revenue_forecasts_company ON revenue_forecasts(company_id);
CREATE INDEX idx_expense_records_company ON expense_records(company_id);
CREATE INDEX idx_expense_records_date ON expense_records(date);
CREATE INDEX idx_cash_flow_records_company ON cash_flow_records(company_id);
CREATE INDEX idx_budget_actuals_company ON budget_actuals(company_id);
CREATE INDEX idx_profit_loss_company ON profit_loss_records(company_id);
CREATE INDEX idx_balance_sheets_company ON balance_sheets(company_id);
CREATE INDEX idx_kpi_metrics_company ON kpi_metrics(company_id);
CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_custom_reports_company ON custom_reports(company_id);
CREATE INDEX idx_ai_insights_company ON ai_insights(company_id);
CREATE INDEX idx_anomaly_detections_company ON anomaly_detections(company_id);
CREATE INDEX idx_trend_analyses_company ON trend_analyses(company_id);
CREATE INDEX idx_compliance_reports_company ON compliance_reports(company_id);
CREATE INDEX idx_tax_reports_company ON tax_reports(company_id);
CREATE INDEX idx_scheduled_reports_company ON scheduled_reports(company_id);
CREATE INDEX idx_scheduled_reports_next_run ON scheduled_reports(next_run);
CREATE INDEX idx_report_execution_logs_report ON report_execution_logs(scheduled_report_id);
CREATE INDEX idx_saved_queries_company ON saved_queries(company_id);
CREATE INDEX idx_scenario_analyses_company ON scenario_analyses(company_id);
CREATE INDEX idx_dcf_valuations_company ON dcf_valuations(company_id);
CREATE INDEX idx_monte_carlo_simulations_company ON monte_carlo_simulations(company_id);
CREATE INDEX idx_capital_projects_company ON capital_projects(company_id);
CREATE INDEX idx_break_even_analyses_company ON break_even_analyses(company_id);
CREATE INDEX idx_working_capital_analyses_company ON working_capital_analyses(company_id);
