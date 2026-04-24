import React, { useState, useEffect } from 'react';
import { TrendingDown, TrendingUp, Plus, Sparkles, Eye, Edit2, Trash2, X, AlertTriangle, CheckCircle, Target, DollarSign, Clock, Shield, BarChart3, Lightbulb, Activity, FileText } from 'lucide-react';
import {
  getAiVarianceExplanations, getAiVarianceExplanation, createAiVarianceExplanation,
  updateAiVarianceExplanation, deleteAiVarianceExplanation, analyzeAiVariance, getCompanies
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

function AiVarianceExplainer() {
  const [variances, setVariances] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedVariance, setSelectedVariance] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    company_id: '', title: '', period: 'Q4 2024', department: '', category: '', budgeted_amount: '', actual_amount: ''
  });
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [varRes, compRes] = await Promise.all([getAiVarianceExplanations(), getCompanies()]);
      setVariances(varRes.data);
      setCompanies(compRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (variance) => {
    try {
      const res = await getAiVarianceExplanation(variance.id);
      setSelectedVariance(res.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching variance:', error);
    }
  };

  const handleCreate = () => {
    setEditMode(false);
    setFormData({ company_id: companies[0]?.id || '', title: '', period: 'Q4 2024', department: '', category: '', budgeted_amount: '', actual_amount: '' });
    setShowFormModal(true);
  };

  const handleEdit = () => {
    setEditMode(true);
    setFormData({
      company_id: selectedVariance.company_id,
      title: selectedVariance.title,
      period: selectedVariance.period,
      department: selectedVariance.department || '',
      category: selectedVariance.category || '',
      budgeted_amount: selectedVariance.budgeted_amount || '',
      actual_amount: selectedVariance.actual_amount || ''
    });
    setShowDetailModal(false);
    setShowFormModal(true);
  };

  const handleDelete = () => {
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteAiVarianceExplanation(selectedVariance.id);
      setConfirmOpen(false);
      setShowDetailModal(false);
      toast.success('Variance explanation deleted successfully!');
      fetchData();
    } catch (error) {
      console.error('Error deleting variance:', error);
      toast.error('Failed to delete variance explanation. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await updateAiVarianceExplanation(selectedVariance.id, formData);
      } else {
        await createAiVarianceExplanation(formData);
      }
      setShowFormModal(false);
      toast.success(editMode ? 'Variance updated successfully!' : 'Variance created successfully!');
      fetchData();
    } catch (error) {
      console.error('Error saving variance:', error);
      toast.error('Failed to save variance. Please try again.');
    }
  };

  const handleAnalyze = async (varianceId) => {
    setAnalyzing(true);
    try {
      await analyzeAiVariance({ id: varianceId || selectedVariance.id });
      const res = await getAiVarianceExplanation(varianceId || selectedVariance.id);
      setSelectedVariance(res.data);
      toast.success('Variance analyzed successfully!');
      fetchData();
    } catch (error) {
      console.error('Error analyzing variance:', error);
      toast.error('Failed to analyze variance. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  const getVarianceColor = (type) => type === 'favorable' ? '#10b981' : '#ef4444';
  const getStatusColor = (status) => {
    const colors = { analyzed: '#10b981', pending: '#f59e0b', reviewed: '#3b82f6' };
    return colors[status] || '#6b7280';
  };

  const renderRootCauses = (causes) => {
    if (!causes) return null;
    const data = parseAIResponse(causes);
    if (!Array.isArray(data)) return null;

    return (
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#1e293b' }}>
          <Target size={18} /> Root Causes Analysis
        </h4>
        {data.map((cause, i) => (
          <div key={i} style={{ padding: '16px', background: '#fef3c7', borderRadius: '8px', marginBottom: '8px', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>{cause.cause}</div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#78350f' }}>
              <span>Likelihood: {cause.likelihood}</span>
              {cause.evidence && <span>Evidence: {cause.evidence}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderRecommendations = (recs) => {
    if (!recs) return null;
    const data = parseAIResponse(recs);
    if (!Array.isArray(data)) return null;

    return (
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#1e293b' }}>
          <CheckCircle size={18} /> Recommendations
        </h4>
        {data.map((rec, i) => (
          <div key={i} style={{ padding: '16px', background: '#ecfdf5', borderRadius: '8px', marginBottom: '8px', borderLeft: '4px solid #10b981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ fontWeight: '600', color: '#065f46' }}>{rec.action}</div>
              <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', background: rec.priority === 'high' ? '#fef2f2' : rec.priority === 'medium' ? '#fef3c7' : '#f0f9ff', color: rec.priority === 'high' ? '#dc2626' : rec.priority === 'medium' ? '#d97706' : '#0284c7' }}>
                {rec.priority}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#047857' }}>
              {rec.timeline && <span>Timeline: {rec.timeline}</span>}
              {rec.expected_outcome && <span>Expected: {rec.expected_outcome}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Parse and render AI explanation professionally
  const renderAIAnalysis = (aiExplanation) => {
    if (!aiExplanation) return null;

    let analysis;
    try {
      // If already an object, use directly
      if (typeof aiExplanation === 'object') {
        analysis = aiExplanation;
      } else {
        // Strip markdown code blocks if present (```json ... ```)
        let jsonString = aiExplanation;
        if (jsonString.includes('```')) {
          // Remove ```json or ``` at the start and ``` at the end
          jsonString = jsonString
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/g, '')
            .trim();
        }
        // Try to parse as JSON
        analysis = JSON.parse(jsonString);
      }
    } catch {
      // If not JSON, display as formatted text
      return (
        <div style={{ marginBottom: '24px', padding: '20px', background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)', borderRadius: '12px', border: '1px solid #c7d2fe' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#4f46e5' }}>
            <Sparkles size={18} /> AI Analysis
          </h4>
          <p style={{ margin: 0, color: '#334155', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{aiExplanation}</p>
        </div>
      );
    }

    const getSeverityColor = (severity) => {
      const colors = { minor: '#10b981', moderate: '#f59e0b', significant: '#f97316', critical: '#ef4444' };
      return colors[severity] || '#6b7280';
    };

    const getUrgencyColor = (urgency) => {
      const colors = { low: '#10b981', medium: '#f59e0b', high: '#f97316', immediate: '#ef4444' };
      return colors[urgency] || '#6b7280';
    };

    return (
      <div style={{ marginBottom: '24px' }}>
        {/* Executive Summary */}
        {analysis.executive_summary && (
          <div style={{ marginBottom: '20px', padding: '20px', background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)', borderRadius: '12px', border: '1px solid #c7d2fe' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#4f46e5' }}>
              <FileText size={18} /> Executive Summary
            </h4>
            <p style={{ margin: 0, color: '#334155', lineHeight: '1.7', fontSize: '15px' }}>{analysis.executive_summary}</p>
          </div>
        )}

        {/* Variance Classification */}
        {analysis.variance_classification && (
          <div style={{ marginBottom: '20px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#1e293b' }}>
              <BarChart3 size={18} /> Variance Classification
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>Type</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: analysis.variance_classification.type === 'favorable' ? '#10b981' : '#ef4444', textTransform: 'capitalize' }}>
                  {analysis.variance_classification.type}
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>Severity</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: getSeverityColor(analysis.variance_classification.severity), textTransform: 'capitalize' }}>
                  {analysis.variance_classification.severity}
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>Urgency</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: getUrgencyColor(analysis.variance_classification.urgency), textTransform: 'capitalize' }}>
                  {analysis.variance_classification.urgency}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Impact Analysis */}
        {analysis.impact_analysis && (
          <div style={{ marginBottom: '20px', padding: '20px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#991b1b' }}>
              <AlertTriangle size={18} /> Impact Analysis
            </h4>
            <div style={{ display: 'grid', gap: '12px' }}>
              {analysis.impact_analysis.financial_impact && (
                <div style={{ padding: '12px 16px', background: 'white', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>Financial Impact</div>
                  <div style={{ color: '#1e293b' }}>{analysis.impact_analysis.financial_impact}</div>
                </div>
              )}
              {analysis.impact_analysis.operational_impact && (
                <div style={{ padding: '12px 16px', background: 'white', borderRadius: '8px', borderLeft: '4px solid #f97316' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>Operational Impact</div>
                  <div style={{ color: '#1e293b' }}>{analysis.impact_analysis.operational_impact}</div>
                </div>
              )}
              {analysis.impact_analysis.strategic_impact && (
                <div style={{ padding: '12px 16px', background: 'white', borderRadius: '8px', borderLeft: '4px solid #8b5cf6' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>Strategic Impact</div>
                  <div style={{ color: '#1e293b' }}>{analysis.impact_analysis.strategic_impact}</div>
                </div>
              )}
              {analysis.impact_analysis.risk_exposure && (
                <div style={{ padding: '12px 16px', background: 'white', borderRadius: '8px', borderLeft: '4px solid #dc2626' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>Risk Exposure</div>
                  <div style={{ color: '#1e293b' }}>{analysis.impact_analysis.risk_exposure}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contributing Factors */}
        {analysis.contributing_factors && Array.isArray(analysis.contributing_factors) && analysis.contributing_factors.length > 0 && (
          <div style={{ marginBottom: '20px', padding: '20px', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#92400e' }}>
              <Activity size={18} /> Contributing Factors
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {analysis.contributing_factors.map((factor, i) => (
                <span key={i} style={{ padding: '8px 16px', background: 'white', borderRadius: '20px', fontSize: '13px', color: '#78350f', border: '1px solid #fde68a' }}>
                  {typeof factor === 'string' ? factor : factor.factor || JSON.stringify(factor)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Historical Context */}
        {analysis.historical_context && (
          <div style={{ marginBottom: '20px', padding: '20px', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#0369a1' }}>
              <Clock size={18} /> Historical Context
            </h4>
            <p style={{ margin: 0, color: '#0c4a6e', lineHeight: '1.7' }}>{analysis.historical_context}</p>
          </div>
        )}

        {/* Preventive Measures */}
        {analysis.preventive_measures && Array.isArray(analysis.preventive_measures) && analysis.preventive_measures.length > 0 && (
          <div style={{ marginBottom: '20px', padding: '20px', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #86efac' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#166534' }}>
              <Shield size={18} /> Preventive Measures
            </h4>
            <div style={{ display: 'grid', gap: '8px' }}>
              {analysis.preventive_measures.map((measure, i) => (
                <div key={i} style={{ padding: '12px 16px', background: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600' }}>
                    {i + 1}
                  </div>
                  <span style={{ color: '#1e293b' }}>{typeof measure === 'string' ? measure : measure.measure || JSON.stringify(measure)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPIs to Monitor */}
        {analysis.kpis_to_monitor && Array.isArray(analysis.kpis_to_monitor) && analysis.kpis_to_monitor.length > 0 && (
          <div style={{ marginBottom: '20px', padding: '20px', background: '#f5f3ff', borderRadius: '12px', border: '1px solid #c4b5fd' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#5b21b6' }}>
              <Lightbulb size={18} /> KPIs to Monitor
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {analysis.kpis_to_monitor.map((kpi, i) => (
                <span key={i} style={{ padding: '8px 16px', background: 'white', borderRadius: '8px', fontSize: '13px', color: '#5b21b6', border: '1px solid #c4b5fd', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Target size={14} />
                  {typeof kpi === 'string' ? kpi : kpi.name || JSON.stringify(kpi)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Root Causes from AI Analysis */}
        {analysis.root_causes && Array.isArray(analysis.root_causes) && analysis.root_causes.length > 0 && (
          <div style={{ marginBottom: '20px', padding: '20px', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#92400e' }}>
              <Target size={18} /> Root Causes Analysis
            </h4>
            {analysis.root_causes.map((cause, i) => (
              <div key={i} style={{ padding: '16px', background: 'white', borderRadius: '8px', marginBottom: '8px', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '8px' }}>
                  {typeof cause === 'string' ? cause : cause.cause || 'Root Cause'}
                </div>
                {typeof cause === 'object' && (
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#78350f', flexWrap: 'wrap' }}>
                    {cause.likelihood && <span style={{ padding: '4px 12px', background: '#fef3c7', borderRadius: '12px' }}>Likelihood: {cause.likelihood}</span>}
                    {cause.evidence && <span style={{ padding: '4px 12px', background: '#fef3c7', borderRadius: '12px' }}>Evidence: {cause.evidence}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Recommendations from AI Analysis */}
        {analysis.recommendations && Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0 && (
          <div style={{ marginBottom: '20px', padding: '20px', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #86efac' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#166534' }}>
              <CheckCircle size={18} /> Recommendations
            </h4>
            {analysis.recommendations.map((rec, i) => (
              <div key={i} style={{ padding: '16px', background: 'white', borderRadius: '8px', marginBottom: '8px', borderLeft: '4px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ fontWeight: '600', color: '#065f46' }}>
                    {typeof rec === 'string' ? rec : rec.action || rec.recommendation || 'Recommendation'}
                  </div>
                  {typeof rec === 'object' && rec.priority && (
                    <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', background: rec.priority === 'high' ? '#fef2f2' : rec.priority === 'medium' ? '#fef3c7' : '#f0f9ff', color: rec.priority === 'high' ? '#dc2626' : rec.priority === 'medium' ? '#d97706' : '#0284c7' }}>
                      {rec.priority}
                    </span>
                  )}
                </div>
                {typeof rec === 'object' && (
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#047857', flexWrap: 'wrap' }}>
                    {rec.timeline && <span style={{ padding: '4px 12px', background: '#dcfce7', borderRadius: '12px' }}>Timeline: {rec.timeline}</span>}
                    {rec.expected_outcome && <span style={{ padding: '4px 12px', background: '#dcfce7', borderRadius: '12px' }}>Expected: {rec.expected_outcome}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="loading"><div className="loading-spinner"></div></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>AI Variance Explainer</h2>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>Explain budget vs actual differences with AI</p>
        </div>
        <button onClick={handleCreate} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> New Variance
        </button>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Company</th>
              <th>Department</th>
              <th>Budgeted</th>
              <th>Actual</th>
              <th>Variance</th>
              <th>Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {variances.map((v) => (
              <tr key={v.id} onClick={() => handleRowClick(v)} style={{ cursor: 'pointer' }}>
                <td style={{ fontWeight: '500' }}>{v.title}</td>
                <td>{v.company_name}</td>
                <td>{v.department}</td>
                <td>{formatCurrency(v.budgeted_amount)}</td>
                <td>{formatCurrency(v.actual_amount)}</td>
                <td style={{ color: getVarianceColor(v.variance_type), fontWeight: '600' }}>
                  {formatCurrency(v.variance_amount)} ({v.variance_percentage}%)
                </td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: getVarianceColor(v.variance_type) }}>
                    {v.variance_type === 'favorable' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {v.variance_type}
                  </span>
                </td>
                <td><span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', background: `${getStatusColor(v.status)}20`, color: getStatusColor(v.status) }}>{v.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedVariance && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: selectedVariance.variance_type === 'favorable' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selectedVariance.variance_type === 'favorable' ? <TrendingUp size={24} color="white" /> : <TrendingDown size={24} color="white" />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px' }}>{selectedVariance.title}</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>{selectedVariance.company_name} - {selectedVariance.period}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Variance Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', textAlign: 'center' }}>
                  <DollarSign size={24} style={{ color: '#64748b', marginBottom: '8px' }} />
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Budgeted</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>{formatCurrency(selectedVariance.budgeted_amount)}</div>
                </div>
                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', textAlign: 'center' }}>
                  <DollarSign size={24} style={{ color: '#64748b', marginBottom: '8px' }} />
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Actual</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>{formatCurrency(selectedVariance.actual_amount)}</div>
                </div>
                <div style={{ padding: '20px', background: selectedVariance.variance_type === 'favorable' ? '#ecfdf5' : '#fef2f2', borderRadius: '12px', textAlign: 'center' }}>
                  {selectedVariance.variance_type === 'favorable' ? <TrendingUp size={24} style={{ color: '#10b981', marginBottom: '8px' }} /> : <TrendingDown size={24} style={{ color: '#ef4444', marginBottom: '8px' }} />}
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Variance</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: getVarianceColor(selectedVariance.variance_type) }}>{formatCurrency(selectedVariance.variance_amount)}</div>
                </div>
                <div style={{ padding: '20px', background: selectedVariance.variance_type === 'favorable' ? '#ecfdf5' : '#fef2f2', borderRadius: '12px', textAlign: 'center' }}>
                  <AlertTriangle size={24} style={{ color: getVarianceColor(selectedVariance.variance_type), marginBottom: '8px' }} />
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Percentage</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: getVarianceColor(selectedVariance.variance_type) }}>{selectedVariance.variance_percentage}%</div>
                </div>
              </div>

              {/* AI Analysis - Professional Display */}
              {selectedVariance.ai_explanation && renderAIAnalysis(selectedVariance.ai_explanation)}

              {/* Root Causes - only show if not already in AI explanation */}
              {selectedVariance.root_causes && !selectedVariance.ai_explanation && renderRootCauses(selectedVariance.root_causes)}

              {/* Recommendations - only show if not already in AI explanation */}
              {selectedVariance.recommendations && !selectedVariance.ai_explanation && renderRecommendations(selectedVariance.recommendations)}

              {/* Impact Analysis - only show if not already in AI explanation */}
              {selectedVariance.impact_analysis && !selectedVariance.ai_explanation && (
                <div style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '8px', color: '#1e293b' }}>Impact Analysis</h4>
                  <p style={{ margin: 0, color: '#475569' }}>{selectedVariance.impact_analysis}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                {selectedVariance.status !== 'analyzed' && (
                  <button onClick={() => handleAnalyze()} disabled={analyzing} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' }}>
                    <Sparkles size={16} /> {analyzing ? 'Analyzing...' : 'Analyze with AI'}
                  </button>
                )}
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{editMode ? 'Edit Variance' : 'New Variance Explanation'}</h3>
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
                <label>Title</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Marketing Q4 Variance" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Period</label>
                  <input type="text" value={formData.period} onChange={(e) => setFormData({ ...formData, period: e.target.value })} placeholder="Q4 2024" required />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <select value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} required>
                    <option value="">Select Department</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Operations">Operations</option>
                    <option value="IT">IT</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                    <option value="R&D">R&D</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Category</label>
                <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="e.g., Salaries, Equipment" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Budgeted Amount ($)</label>
                  <input type="number" value={formData.budgeted_amount} onChange={(e) => setFormData({ ...formData, budgeted_amount: e.target.value })} placeholder="100000" required />
                </div>
                <div className="form-group">
                  <label>Actual Amount ($)</label>
                  <input type="number" value={formData.actual_amount} onChange={(e) => setFormData({ ...formData, actual_amount: e.target.value })} placeholder="120000" required />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowFormModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editMode ? 'Update' : 'Create'}</button>
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
        message="Are you sure you want to delete this variance explanation? This action cannot be undone."
        type="danger"
      />
    </div>
  );
}

export default AiVarianceExplainer;
