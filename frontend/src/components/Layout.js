import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, TrendingUp, DollarSign, ArrowRightLeft, PieChart,
  BarChart3, Scale, Target, History, FileSpreadsheet, Lightbulb, AlertTriangle,
  LineChart, Shield, Receipt, MessageSquare, Settings, Bell, User, Brain, LogOut,
  Calculator, Download, Calendar, Users, Search, GitBranch, Dice6, Building2,
  Wallet, Presentation, ClipboardList, Menu, X, UserPlus
} from 'lucide-react';

const navItems = [
  { section: 'Overview', items: [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/ai-chat', icon: MessageSquare, label: 'AI Assistant' },
  ]},
  { section: 'Financial Reports', items: [
    { path: '/financial-statements', icon: FileText, label: 'Financial Statements' },
    { path: '/profit-loss', icon: BarChart3, label: 'Profit & Loss' },
    { path: '/balance-sheets', icon: Scale, label: 'Balance Sheets' },
    { path: '/cash-flow', icon: ArrowRightLeft, label: 'Cash Flow' },
    { path: '/revenue-recognition-drift', icon: AlertTriangle, label: 'Revenue Drift' },
  ]},
  { section: 'Forecasting & Analysis', items: [
    { path: '/revenue-forecasts', icon: TrendingUp, label: 'Revenue Forecasts' },
    { path: '/trend-analyses', icon: LineChart, label: 'Trend Analysis' },
    { path: '/kpi-metrics', icon: Target, label: 'KPI Metrics' },
  ]},
  { section: 'Expense Management', items: [
    { path: '/expense-records', icon: DollarSign, label: 'Expense Records' },
    { path: '/budget-actuals', icon: PieChart, label: 'Budget vs Actuals' },
  ]},
  { section: 'AI & Compliance', items: [
    { path: '/ai-insights', icon: Lightbulb, label: 'AI Insights' },
    { path: '/anomaly-detections', icon: AlertTriangle, label: 'Anomaly Detection' },
    { path: '/compliance-reports', icon: Shield, label: 'Compliance' },
    { path: '/tax-reports', icon: Receipt, label: 'Tax Reports' },
  ]},
  { section: 'Reports & Audit', items: [
    { path: '/generate-report', icon: FileText, label: 'Generate Report' },
    { path: '/custom-reports', icon: FileSpreadsheet, label: 'Custom Reports' },
    { path: '/audit-logs', icon: History, label: 'Audit Logs' },
  ]},
  { section: 'Advanced Analytics', items: [
    { path: '/financial-ratios', icon: Calculator, label: 'Financial Ratios' },
    { path: '/natural-language-query', icon: Search, label: 'NL Query' },
    { path: '/peer-comparison', icon: Users, label: 'Peer Comparison' },
    { path: '/export-data', icon: Download, label: 'Export Data' },
    { path: '/scheduled-reports', icon: Calendar, label: 'Scheduled Reports' },
  ]},
  { section: 'Advanced Modeling', items: [
    { path: '/scenario-analysis', icon: GitBranch, label: 'Scenario Analysis' },
    { path: '/dcf-valuation', icon: Calculator, label: 'DCF Valuation' },
    { path: '/monte-carlo', icon: Dice6, label: 'Monte Carlo' },
    { path: '/capital-budgeting', icon: Building2, label: 'Capital Budgeting' },
    { path: '/break-even', icon: Target, label: 'Break-Even' },
    { path: '/working-capital', icon: Wallet, label: 'Working Capital' },
  ]},
  { section: 'AI Assistants', items: [
    { path: '/ai-presentations', icon: Presentation, label: 'AI Presentations' },
    { path: '/ai-variance-explainer', icon: PieChart, label: 'Variance Explainer' },
    { path: '/ai-forecast-generator', icon: TrendingUp, label: 'Forecast Generator' },
    { path: '/ai-audit-analyzer', icon: Shield, label: 'Audit Analyzer' },
    { path: '/ai-board-reports', icon: ClipboardList, label: 'Board Reports' },
    { path: '/ai-expense-categorizer', icon: DollarSign, label: 'Expense Categorizer' },
    { path: '/ai-audit-readiness', icon: Shield, label: 'Audit Readiness' },
    { path: '/ai-covenant-tracking', icon: ClipboardList, label: 'Covenant Tracking' },
    { path: '/ai-segment-analysis', icon: PieChart, label: 'Segment Analysis' },
    { path: '/ai-responses', icon: Brain, label: 'AI History' },
  ]},
  { section: 'Reports Views', items: [
    { path: '/custom-views', icon: FileSpreadsheet, label: 'Reports Views' },
  ]},
];

const pageNames = {
  '/': 'Dashboard', '/ai-chat': 'AI Assistant',
  '/financial-statements': 'Financial Statements', '/revenue-forecasts': 'Revenue Forecasts',
  '/expense-records': 'Expense Records', '/cash-flow': 'Cash Flow',
  '/revenue-recognition-drift': 'Revenue Recognition Drift',
  '/budget-actuals': 'Budget vs Actuals', '/profit-loss': 'Profit & Loss',
  '/balance-sheets': 'Balance Sheets', '/kpi-metrics': 'KPI Metrics',
  '/audit-logs': 'Audit Logs', '/custom-reports': 'Custom Reports',
  '/ai-insights': 'AI Insights', '/anomaly-detections': 'Anomaly Detection',
  '/trend-analyses': 'Trend Analysis', '/compliance-reports': 'Compliance Reports',
  '/tax-reports': 'Tax Reports', '/generate-report': 'Generate Final Report',
  '/profile': 'User Profile', '/financial-ratios': 'Financial Ratios',
  '/natural-language-query': 'Natural Language Query', '/peer-comparison': 'Peer Comparison',
  '/export-data': 'Export Data', '/scheduled-reports': 'Scheduled Reports',
  '/scenario-analysis': 'Scenario Analysis', '/dcf-valuation': 'DCF Valuation',
  '/monte-carlo': 'Monte Carlo Simulation', '/capital-budgeting': 'Capital Budgeting',
  '/break-even': 'Break-Even Analysis', '/working-capital': 'Working Capital Optimizer',
  '/ai-presentations': 'AI Presentation Generator', '/ai-variance-explainer': 'AI Variance Explainer',
  '/ai-forecast-generator': 'AI Forecast Generator', '/ai-audit-analyzer': 'AI Audit Trail Analyzer',
  '/ai-board-reports': 'AI Board Report Writer', '/ai-responses': 'AI Response History',
  '/ai-expense-categorizer': 'AI Expense Categorizer', '/custom-views': 'Reports Views', '/register': 'Register',
  '/password-reset': 'Password Reset',
};

// RBAC role permissions
const rolePermissions = {
  admin: '*',
  cfo: '*',
  CFO: '*',
  director: ['/', '/ai-chat', '/financial-statements', '/profit-loss', '/balance-sheets', '/cash-flow',
    '/revenue-forecasts', '/trend-analyses', '/kpi-metrics', '/expense-records', '/budget-actuals',
    '/ai-insights', '/compliance-reports', '/tax-reports', '/generate-report', '/custom-reports',
    '/audit-logs', '/financial-ratios', '/export-data', '/scheduled-reports', '/ai-presentations',
    '/ai-board-reports', '/ai-responses', '/profile'],
  manager: ['/', '/ai-chat', '/financial-statements', '/profit-loss', '/balance-sheets', '/cash-flow',
    '/revenue-forecasts', '/kpi-metrics', '/expense-records', '/budget-actuals', '/ai-insights',
    '/generate-report', '/custom-reports', '/export-data', '/profile'],
  analyst: ['/', '/ai-chat', '/financial-statements', '/profit-loss', '/balance-sheets',
    '/revenue-forecasts', '/trend-analyses', '/kpi-metrics', '/expense-records', '/budget-actuals',
    '/ai-insights', '/custom-reports', '/export-data', '/profile'],
  viewer: ['/', '/ai-chat', '/financial-statements', '/profit-loss', '/balance-sheets', '/kpi-metrics', '/profile'],
};

function hasAccess(role, path) {
  const perms = rolePermissions[role];
  if (!perms) return true; // unknown role = full access
  if (perms === '*') return true;
  return perms.includes(path);
}

function Layout({ children, user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPageName = pageNames[location.pathname] || 'Page';

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close on resize to desktop
  useEffect(() => {
    const handleResize = () => { if (window.innerWidth > 768) setMobileOpen(false); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleProfileClick = () => navigate('/profile');

  const filteredNavItems = navItems.map(section => ({
    ...section,
    items: section.items.filter(item => hasAccess(user?.role, item.path)),
  })).filter(section => section.items.length > 0);

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Brain size={36} />
            <div>
              <h1>FinanceAI</h1>
              <span>Enterprise Reports</span>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <div className="sidebar-content">
          <nav className="sidebar-nav">
            {filteredNavItems.map((section) => (
              <div key={section.section} className="nav-section">
                <div className="nav-section-title">{section.section}</div>
                {section.items.map((item) => (
                  <NavLink key={item.path} to={item.path}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <item.icon size={20} />
                    <span className="nav-label">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </div>
        {user && (
          <div className="sidebar-footer">
            <div className="user-info" onClick={handleProfileClick} style={{ cursor: 'pointer' }}>
              <div className="user-avatar"><User size={20} /></div>
              <div className="user-details">
                <span className="user-name">{user.name}</span>
                <span className="user-role">{user.role}</span>
              </div>
            </div>
            <button className="btn-logout" onClick={onLogout} title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        )}
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <button className="hamburger-btn" onClick={() => setMobileOpen(true)}>
              <Menu size={24} />
            </button>
            <h2 className="header-title">{currentPageName}</h2>
          </div>
          <div className="header-right">
            <button className="btn-icon"><Bell size={20} /></button>
            <button className="btn-icon"><Settings size={20} /></button>
            <div className="header-user" onClick={handleProfileClick} style={{ cursor: 'pointer' }}>
              <User size={20} />
              <span className="header-user-name">{user?.name || 'User'}</span>
              <span className="header-user-role">{user?.role || ''}</span>
            </div>
          </div>
        </header>
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}

export default Layout;
