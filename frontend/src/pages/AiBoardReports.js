import React, { useState, useEffect } from 'react';
import { FileText, Plus, Sparkles, Edit2, Trash2, X, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target, Users, BarChart3 } from 'lucide-react';
import {
  getAiBoardReports, getAiBoardReport, createAiBoardReport, updateAiBoardReport,
  deleteAiBoardReport, generateAiBoardReport, getCompanies
} from '../services/api';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

// Helper function to parse AI response - strips markdown code blocks
const parseAIResponse = (data) => {
  if (!data) return null;
  if (typeof data === 'object') return data;
  let jsonString = data;
  if (jsonString.includes('```')) {
    jsonString = jsonString.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  }
  try {
    return JSON.parse(jsonString);
  } catch {
    return data; // Return as-is if not valid JSON
  }
};

function AiBoardReports() {
  const [reports, setReports] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    company_id: '', report_title: '', report_period: 'Q4 2024'
  });
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [reportsRes, compRes] = await Promise.all([getAiBoardReports(), getCompanies()]);
      setReports(reportsRes.data);
      setCompanies(compRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (report) => {
    try {
      const res = await getAiBoardReport(report.id);
      setSelectedReport(res.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching report:', error);
    }
  };

  const handleCreate = () => {
    setEditMode(false);
    setFormData({ company_id: companies[0]?.id || '', report_title: '', report_period: 'Q4 2024' });
    setShowFormModal(true);
  };

  const handleEdit = () => {
    setEditMode(true);
    setFormData({
      company_id: selectedReport.company_id,
      report_title: selectedReport.report_title,
      report_period: selectedReport.report_period
    });
    setShowDetailModal(false);
    setShowFormModal(true);
  };

  const handleDelete = () => {
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteAiBoardReport(selectedReport.id);
      setConfirmOpen(false);
      setShowDetailModal(false);
      toast.success('Board report deleted successfully!');
      fetchData();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete board report. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await updateAiBoardReport(selectedReport.id, formData);
        toast.success('Board report updated successfully!');
      } else {
        await createAiBoardReport(formData);
        toast.success('Board report created successfully!');
      }
      setShowFormModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Failed to save board report. Please try again.');
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await generateAiBoardReport(formData);
      setShowFormModal(false);
      fetchData();
      const fullReport = await getAiBoardReport(res.data.board_report.id);
      setSelectedReport(fullReport.data);
      setShowDetailModal(true);
      toast.success('Board report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate board report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = { generated: '#3b82f6', reviewed: '#10b981', presented: '#8b5cf6', draft: '#6b7280' };
    return colors[status] || '#6b7280';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  const renderFinancialHighlights = (highlights) => {
    if (!highlights) return null;
    const data = parseAIResponse(highlights);
    if (!data || typeof data !== 'object') return null;

    return (
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#1e293b' }}>
          <BarChart3 size={18} /> Financial Highlights
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {data.revenue && (
            <div style={{ padding: '20px', background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '14px', color: '#059669', fontWeight: '600', marginBottom: '12px' }}>Revenue</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>{formatCurrency(data.revenue.current)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {parseFloat(data.revenue.change_percent) >= 0 ? <TrendingUp size={16} color="#10b981" /> : <TrendingDown size={16} color="#ef4444" />}
                <span style={{ color: parseFloat(data.revenue.change_percent) >= 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                  {data.revenue.change_percent}% vs prior
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>{data.revenue.commentary}</div>
            </div>
          )}
          {data.profitability && (
            <div style={{ padding: '20px', background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '14px', color: '#2563eb', fontWeight: '600', marginBottom: '12px' }}>Profitability</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>{formatCurrency(data.profitability.net_income)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Target size={16} color="#3b82f6" />
                <span style={{ color: '#3b82f6', fontWeight: '600' }}>Margin: {data.profitability.margin}</span>
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>{data.profitability.commentary}</div>
            </div>
          )}
          {data.liquidity && (
            <div style={{ padding: '20px', background: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)', borderRadius: '12px', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '14px', color: '#d97706', fontWeight: '600', marginBottom: '12px' }}>Liquidity</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>{data.liquidity.current_ratio}x</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <CheckCircle size={16} color="#d97706" />
                <span style={{ color: '#d97706', fontWeight: '600' }}>Working Capital: {formatCurrency(data.liquidity.working_capital)}</span>
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>{data.liquidity.commentary}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderKeyMetrics = (metrics) => {
    if (!metrics) return null;
    const data = parseAIResponse(metrics);
    if (!Array.isArray(data) || data.length === 0) return null;

    const getStatusIcon = (status) => {
      if (status === 'on_track') return <CheckCircle size={16} color="#10b981" />;
      if (status === 'at_risk') return <AlertTriangle size={16} color="#f59e0b" />;
      return <AlertTriangle size={16} color="#ef4444" />;
    };

    return (
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#1e293b' }}>
          <Target size={18} /> Key Metrics
        </h4>
        <div style={{ display: 'grid', gap: '12px' }}>
          {data.map((metric, i) => (
            <div key={i} style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {getStatusIcon(metric.status)}
                <div>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{metric.metric}</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>{metric.commentary}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>{metric.value}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Target: {metric.target}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStrategicInitiatives = (initiatives) => {
    if (!initiatives) return null;
    const data = parseAIResponse(initiatives);
    if (!Array.isArray(data) || data.length === 0) return null;

    return (
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#1e293b' }}>
          <Users size={18} /> Strategic Initiatives
        </h4>
        {data.map((init, i) => (
          <div key={i} style={{ padding: '20px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '16px', color: '#1e293b' }}>{init.initiative}</div>
                <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', background: init.status === 'on_track' ? '#ecfdf5' : init.status === 'delayed' ? '#fef3c7' : '#f0f9ff', color: init.status === 'on_track' ? '#059669' : init.status === 'delayed' ? '#d97706' : '#0284c7' }}>
                  {init.status?.replace('_', ' ')}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>{init.progress_percent}%</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Progress</div>
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${init.progress_percent}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)', borderRadius: '4px' }} />
              </div>
            </div>
            {init.key_milestones && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {init.key_milestones.map((m, j) => (
                  <span key={j} style={{ padding: '4px 10px', background: '#f1f5f9', borderRadius: '6px', fontSize: '12px', color: '#475569' }}>{m}</span>
                ))}
              </div>
            )}
            {init.risks && init.risks.length > 0 && (
              <div style={{ fontSize: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={12} /> Risk: {init.risks[0]}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderRiskAssessment = (assessment) => {
    if (!assessment) return null;
    const data = parseAIResponse(assessment);
    if (!data || typeof data !== 'object') return null;

    const getRatingColor = (rating) => {
      if (rating === 'low') return '#10b981';
      if (rating === 'medium') return '#f59e0b';
      return '#ef4444';
    };

    return (
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#1e293b' }}>
          <AlertTriangle size={18} /> Risk Assessment
        </h4>
        <div style={{ padding: '20px', background: `${getRatingColor(data.overall_risk_rating)}10`, borderRadius: '12px', border: `1px solid ${getRatingColor(data.overall_risk_rating)}40`, marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Overall Risk Rating</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: getRatingColor(data.overall_risk_rating), textTransform: 'uppercase' }}>{data.overall_risk_rating}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Risk Trend</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', textTransform: 'capitalize' }}>{data.risk_trend}</div>
            </div>
          </div>
        </div>
        {data.top_risks && data.top_risks.map((risk, i) => (
          <div key={i} style={{ padding: '16px', background: '#fef2f2', borderRadius: '8px', marginBottom: '8px', borderLeft: '4px solid #ef4444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ fontWeight: '600', color: '#991b1b' }}>{risk.risk}</div>
              <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: '#fecaca', color: '#dc2626' }}>
                {risk.category}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#7f1d1d', marginBottom: '8px' }}>
              <span>Likelihood: {risk.likelihood}</span>
              <span>Impact: {risk.impact}</span>
              <span>Owner: {risk.owner}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#059669', background: '#ecfdf5', padding: '8px 12px', borderRadius: '6px' }}>
              <strong>Mitigation:</strong> {risk.mitigation}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderRecommendations = (recs) => {
    if (!recs) return null;
    const data = parseAIResponse(recs);
    if (!Array.isArray(data) || data.length === 0) return null;

    return (
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#1e293b' }}>
          <CheckCircle size={18} color="#10b981" /> Recommendations
        </h4>
        {data.map((rec, i) => (
          <div key={i} style={{ padding: '20px', background: '#ecfdf5', borderRadius: '12px', marginBottom: '12px', borderLeft: '4px solid #10b981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ fontWeight: '600', fontSize: '16px', color: '#065f46' }}>{rec.recommendation}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', background: rec.priority === 'high' ? '#fef2f2' : rec.priority === 'medium' ? '#fef3c7' : '#f0f9ff', color: rec.priority === 'high' ? '#dc2626' : rec.priority === 'medium' ? '#d97706' : '#0284c7' }}>
                  {rec.priority}
                </span>
                {rec.board_action_required && (
                  <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: '#fef2f2', color: '#dc2626' }}>
                    Board Action Required
                  </span>
                )}
              </div>
            </div>
            <div style={{ fontSize: '14px', color: '#047857', marginBottom: '8px' }}>{rec.rationale}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '13px', color: '#64748b' }}>
              <div><strong>Timeline:</strong> {rec.timeline}</div>
              <div><strong>Resources:</strong> {rec.resources_required}</div>
              <div><strong>Expected Impact:</strong> {rec.expected_impact}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderExecutiveSummary = (summary) => {
    if (!summary) return null;

    // Try to parse as JSON first
    const parsed = parseAIResponse(summary);

    // If parsed successfully and is an object, render structured
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return (
        <div style={{ marginBottom: '24px', padding: '24px', background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', borderRadius: '16px', color: 'white' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#93c5fd' }}>
            <Sparkles size={18} /> Executive Summary
          </h4>
          {/* Main Overview */}
          {(parsed.overview || parsed.period_performance) && (
            <p style={{ margin: '0 0 16px 0', lineHeight: '1.8', fontSize: '15px', color: '#e2e8f0' }}>
              {parsed.overview || parsed.period_performance}
            </p>
          )}
          {/* Key Achievements */}
          {parsed.key_achievements && Array.isArray(parsed.key_achievements) && parsed.key_achievements.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#86efac', marginBottom: '8px' }}>Key Achievements</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {parsed.key_achievements.map((item, i) => (
                  <span key={i} style={{ padding: '6px 12px', background: 'rgba(134, 239, 172, 0.2)', borderRadius: '6px', fontSize: '13px', color: '#86efac' }}>
                    ✓ {typeof item === 'string' ? item : item.achievement || JSON.stringify(item)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* Key Challenges */}
          {parsed.key_challenges && Array.isArray(parsed.key_challenges) && parsed.key_challenges.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#fca5a5', marginBottom: '8px' }}>Key Challenges</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {parsed.key_challenges.map((item, i) => (
                  <span key={i} style={{ padding: '6px 12px', background: 'rgba(252, 165, 165, 0.2)', borderRadius: '6px', fontSize: '13px', color: '#fca5a5' }}>
                    {typeof item === 'string' ? item : item.challenge || JSON.stringify(item)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* Outlook Statement */}
          {parsed.outlook_statement && (
            <div style={{ padding: '12px 16px', background: 'rgba(147, 197, 253, 0.1)', borderRadius: '8px', borderLeft: '3px solid #93c5fd' }}>
              <div style={{ fontSize: '12px', color: '#93c5fd', marginBottom: '4px' }}>Outlook</div>
              <p style={{ margin: 0, color: '#e2e8f0', lineHeight: '1.6' }}>{parsed.outlook_statement}</p>
            </div>
          )}
        </div>
      );
    }

    // Fallback to plain text display (strip any remaining markdown)
    let displayText = typeof summary === 'string' ? summary : JSON.stringify(summary, null, 2);
    if (displayText.includes('```')) {
      displayText = displayText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    }
    return (
      <div style={{ marginBottom: '24px', padding: '24px', background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', borderRadius: '16px', color: 'white' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#93c5fd' }}>
          <Sparkles size={18} /> Executive Summary
        </h4>
        <p style={{ margin: 0, lineHeight: '1.8', fontSize: '15px', color: '#e2e8f0' }}>{displayText}</p>
      </div>
    );
  };

  const renderOutlook = (outlook) => {
    if (!outlook) return null;

    // Try to parse as JSON first
    const parsed = parseAIResponse(outlook);

    // If parsed successfully and is an object, render structured
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return (
        <div style={{ marginBottom: '24px', padding: '20px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#059669' }}>
            <TrendingUp size={18} /> Outlook
          </h4>
          {/* Short Term */}
          {parsed.short_term && (
            <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'white', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
              <div style={{ fontSize: '12px', color: '#059669', fontWeight: '600', marginBottom: '4px' }}>Short Term (Next Quarter)</div>
              <p style={{ margin: 0, color: '#064e3b', lineHeight: '1.6' }}>{parsed.short_term}</p>
            </div>
          )}
          {/* Medium Term */}
          {parsed.medium_term && (
            <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'white', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
              <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600', marginBottom: '4px' }}>Medium Term (6-12 Months)</div>
              <p style={{ margin: 0, color: '#1e40af', lineHeight: '1.6' }}>{parsed.medium_term}</p>
            </div>
          )}
          {/* Long Term */}
          {parsed.long_term && (
            <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'white', borderRadius: '8px', borderLeft: '3px solid #8b5cf6' }}>
              <div style={{ fontSize: '12px', color: '#7c3aed', fontWeight: '600', marginBottom: '4px' }}>Strategic Direction</div>
              <p style={{ margin: 0, color: '#5b21b6', lineHeight: '1.6' }}>{parsed.long_term}</p>
            </div>
          )}
          {/* Growth Drivers */}
          {parsed.growth_drivers && Array.isArray(parsed.growth_drivers) && parsed.growth_drivers.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: '600', color: '#166534', marginBottom: '8px', fontSize: '14px' }}>Growth Drivers</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {parsed.growth_drivers.map((driver, i) => (
                  <span key={i} style={{ padding: '6px 12px', background: '#dcfce7', borderRadius: '6px', fontSize: '13px', color: '#166534' }}>
                    ↑ {typeof driver === 'string' ? driver : driver.driver || JSON.stringify(driver)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* Headwinds */}
          {parsed.headwinds && Array.isArray(parsed.headwinds) && parsed.headwinds.length > 0 && (
            <div>
              <div style={{ fontWeight: '600', color: '#991b1b', marginBottom: '8px', fontSize: '14px' }}>Headwinds</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {parsed.headwinds.map((item, i) => (
                  <span key={i} style={{ padding: '6px 12px', background: '#fef2f2', borderRadius: '6px', fontSize: '13px', color: '#991b1b' }}>
                    ↓ {typeof item === 'string' ? item : item.headwind || JSON.stringify(item)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Fallback to plain text display (strip any remaining markdown)
    let displayText = typeof outlook === 'string' ? outlook : JSON.stringify(outlook, null, 2);
    if (displayText.includes('```')) {
      displayText = displayText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    }
    return (
      <div style={{ marginBottom: '24px', padding: '20px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#059669' }}>
          <TrendingUp size={18} /> Outlook
        </h4>
        <p style={{ margin: 0, color: '#064e3b', lineHeight: '1.7' }}>{displayText}</p>
      </div>
    );
  };

  if (loading) return <div className="loading"><div className="loading-spinner"></div></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>AI Board Report Writer</h2>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>Executive summary generation for board meetings</p>
        </div>
        <button onClick={handleCreate} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> New Board Report
        </button>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Report Title</th>
              <th>Company</th>
              <th>Period</th>
              <th>AI Generated</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} onClick={() => handleRowClick(r)} style={{ cursor: 'pointer' }}>
                <td style={{ fontWeight: '500' }}>{r.report_title}</td>
                <td>{r.company_name}</td>
                <td>{r.report_period}</td>
                <td>
                  {r.ai_generated && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8b5cf6' }}>
                      <Sparkles size={14} /> Yes
                    </span>
                  )}
                </td>
                <td><span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', background: `${getStatusColor(r.status)}20`, color: getStatusColor(r.status) }}>{r.status}</span></td>
                <td>{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedReport && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={24} color="white" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px' }}>{selectedReport.report_title}</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>{selectedReport.company_name} - {selectedReport.report_period}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Executive Summary */}
              {selectedReport.executive_summary && renderExecutiveSummary(selectedReport.executive_summary)}

              {renderFinancialHighlights(selectedReport.financial_highlights)}
              {renderKeyMetrics(selectedReport.key_metrics)}
              {renderStrategicInitiatives(selectedReport.strategic_initiatives)}
              {renderRiskAssessment(selectedReport.risk_assessment)}

              {/* Outlook */}
              {selectedReport.outlook && renderOutlook(selectedReport.outlook)}

              {renderRecommendations(selectedReport.recommendations)}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                <button onClick={handleEdit} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Edit2 size={16} /> Edit
                </button>
                <button onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer' }}>
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showFormModal && (
        <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{editMode ? 'Edit Board Report' : 'Generate Board Report'}</h3>
              <button onClick={() => setShowFormModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              <div className="form-group">
                <label>Company</label>
                <select value={formData.company_id} onChange={(e) => setFormData({ ...formData, company_id: e.target.value })} required>
                  <option value="">Select Company</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Report Title</label>
                <input type="text" value={formData.report_title} onChange={(e) => setFormData({ ...formData, report_title: e.target.value })} placeholder="e.g., Q4 2024 Board Report" required />
              </div>
              <div className="form-group">
                <label>Report Period</label>
                <select value={formData.report_period} onChange={(e) => setFormData({ ...formData, report_period: e.target.value })}>
                  <option value="Q1 2024">Q1 2024</option>
                  <option value="Q2 2024">Q2 2024</option>
                  <option value="Q3 2024">Q3 2024</option>
                  <option value="Q4 2024">Q4 2024</option>
                  <option value="FY 2024">FY 2024</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowFormModal(false)} className="btn-secondary">Cancel</button>
                {!editMode && (
                  <button type="button" onClick={handleGenerate} disabled={generating || !formData.company_id || !formData.report_title} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)' }}>
                    <Sparkles size={16} /> {generating ? 'Generating...' : 'Generate with AI'}
                  </button>
                )}
                <button type="submit" className="btn-primary">{editMode ? 'Update' : 'Save Draft'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Confirm Delete"
        message="Are you sure you want to delete this board report? This action cannot be undone."
        type="danger"
      />
    </div>
  );
}

export default AiBoardReports;
