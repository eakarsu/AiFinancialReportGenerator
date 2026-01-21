import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  DollarSign,
  ArrowRightLeft,
  PieChart,
  BarChart3,
  Scale,
  Target,
  History,
  FileSpreadsheet,
  Lightbulb,
  AlertTriangle,
  LineChart,
  Shield,
  Receipt,
  MessageSquare,
  Settings,
  Bell,
  User,
  Brain,
  LogOut
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
];

const pageNames = {
  '/': 'Dashboard',
  '/ai-chat': 'AI Assistant',
  '/financial-statements': 'Financial Statements',
  '/revenue-forecasts': 'Revenue Forecasts',
  '/expense-records': 'Expense Records',
  '/cash-flow': 'Cash Flow',
  '/budget-actuals': 'Budget vs Actuals',
  '/profit-loss': 'Profit & Loss',
  '/balance-sheets': 'Balance Sheets',
  '/kpi-metrics': 'KPI Metrics',
  '/audit-logs': 'Audit Logs',
  '/custom-reports': 'Custom Reports',
  '/ai-insights': 'AI Insights',
  '/anomaly-detections': 'Anomaly Detection',
  '/trend-analyses': 'Trend Analysis',
  '/compliance-reports': 'Compliance Reports',
  '/tax-reports': 'Tax Reports',
  '/generate-report': 'Generate Final Report',
  '/profile': 'User Profile',
};

function Layout({ children, user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPageName = pageNames[location.pathname] || 'Page';

  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Brain size={36} />
            <div>
              <h1>FinanceAI</h1>
              <span>Enterprise Reports</span>
            </div>
          </div>
        </div>
        <div className="sidebar-content">
          <nav className="sidebar-nav">
            {navItems.map((section) => (
              <div key={section.section} className="nav-section">
                <div className="nav-section-title">{section.section}</div>
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </div>
        {user && (
          <div className="sidebar-footer">
            <div className="user-info" onClick={handleProfileClick} style={{ cursor: 'pointer' }}>
              <div className="user-avatar">
                <User size={20} />
              </div>
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
            <h2 className="header-title">{currentPageName}</h2>
          </div>
          <div className="header-right">
            <button className="btn-icon">
              <Bell size={20} />
            </button>
            <button className="btn-icon">
              <Settings size={20} />
            </button>
            <div className="header-user">
              <User size={20} />
              <span>{user?.name || 'User'}</span>
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
