import React, { useState, useEffect } from 'react';
import { Shield, Plus, Sparkles, Edit2, Trash2, X, AlertTriangle, CheckCircle, FileSearch, Activity, Lock } from 'lucide-react';
import {
  getAiAuditAnalyses, getAiAuditAnalysis, createAiAuditAnalysis, updateAiAuditAnalysis,
  deleteAiAuditAnalysis, analyzeAuditTrail, getCompanies
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

function AiAuditAnalyzer() {
  const [analyses, setAnalyses] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    company_id: '', analysis_name: '', analysis_period: 'Q4 2024'
  });
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [analysesRes, compRes] = await Promise.all([getAiAuditAnalyses(), getCompanies()]);
      setAnalyses(analysesRes.data);
      setCompanies(compRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (analysis) => {
    try {
      const res = await getAiAuditAnalysis(analysis.id);
      setSelectedAnalysis(res.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching analysis:', error);
    }
  };

  const handleCreate = () => {
    setEditMode(false);
    setFormData({ company_id: companies[0]?.id || '', analysis_name: '', analysis_period: 'Q4 2024' });
    setShowFormModal(true);
  };

  const handleEdit = () => {
    setEditMode(true);
    setFormData({
      company_id: selectedAnalysis.company_id,
      analysis_name: selectedAnalysis.analysis_name,
      analysis_period: selectedAnalysis.analysis_period
    });
    setShowDetailModal(false);
    setShowFormModal(true);
  };

  const handleDelete = () => {
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteAiAuditAnalysis(selectedAnalysis.id);
      setConfirmOpen(false);
      setShowDetailModal(false);
      toast.success('Analysis deleted successfully!');
      fetchData();
    } catch (error) {
      console.error('Error deleting analysis:', error);
      toast.error('Failed to delete analysis. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await updateAiAuditAnalysis(selectedAnalysis.id, formData);
      } else {
        await createAiAuditAnalysis(formData);
      }
      setShowFormModal(false);
      toast.success(editMode ? 'Analysis updated successfully!' : 'Analysis created successfully!');
      fetchData();
    } catch (error) {
      console.error('Error saving analysis:', error);
      toast.error('Failed to save analysis. Please try again.');
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await analyzeAuditTrail(formData);
      setShowFormModal(false);
      fetchData();
      const fullAnalysis = await getAiAuditAnalysis(res.data.audit_analysis.id);
      setSelectedAnalysis(fullAnalysis.data);
      setShowDetailModal(true);
      toast.success('Audit trail analyzed successfully!');
    } catch (error) {
      console.error('Error analyzing audit trail:', error);
      toast.error('Failed to analyze audit trail. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const getRiskColor = (score) => {
    if (score >= 70) return '#ef4444';
    if (score >= 40) return '#f59e0b';
    return '#10b981';
  };

  const getComplianceColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const renderHighRiskEvents = (events) => {
    if (!events) return null;
    const data = parseAIResponse(events);
    if (!Array.isArray(data) || data.length === 0) return null;

    return (
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#1e293b' }}>
          <AlertTriangle size={18} color="#ef4444" /> High Risk Events
        </h4>
        {data.map((event, i) => (
          <div key={i} style={{ padding: '16px', background: '#fef2f2', borderRadius: '8px', marginBottom: '8px', borderLeft: '4px solid #ef4444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ fontWeight: '600', color: '#991b1b' }}>{event.event_type}</div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{event.timestamp}</span>
            </div>
            <div style={{ fontSize: '13px', color: '#7f1d1d', marginBottom: '8px' }}>
              <strong>User:</strong> {event.user} | <strong>Risk:</strong> {event.risk_reason}
            </div>
            <div style={{ fontSize: '12px', color: '#059669', background: '#ecfdf5', padding: '8px 12px', borderRadius: '6px' }}>
              <strong>Recommended Action:</strong> {event.recommended_action}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPatterns = (patterns) => {
    if (!patterns) return null;
    const data = parseAIResponse(patterns);
    if (!Array.isArray(data) || data.length === 0) return null;

    return (
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#1e293b' }}>
          <Activity size={18} /> Detected Patterns
        </h4>
        {data.map((pattern, i) => (
          <div key={i} style={{ padding: '16px', background: pattern.concern_level === 'high' ? '#fef2f2' : pattern.concern_level === 'medium' ? '#fef3c7' : '#f0fdf4', borderRadius: '8px', marginBottom: '8px', borderLeft: `4px solid ${pattern.concern_level === 'high' ? '#ef4444' : pattern.concern_level === 'medium' ? '#f59e0b' : '#10b981'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ fontWeight: '600', color: '#1e293b' }}>{pattern.pattern}</div>
              <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', background: pattern.concern_level === 'high' ? '#fecaca' : pattern.concern_level === 'medium' ? '#fde68a' : '#bbf7d0', color: pattern.concern_level === 'high' ? '#dc2626' : pattern.concern_level === 'medium' ? '#d97706' : '#059669' }}>
                {pattern.concern_level}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              <strong>Frequency:</strong> {pattern.frequency}
            </div>
            <div style={{ fontSize: '13px', color: '#334155', marginTop: '8px' }}>{pattern.explanation}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderFindings = (findings) => {
    if (!findings) return null;
    const data = parseAIResponse(findings);
    if (!Array.isArray(data) || data.length === 0) return null;

    return (
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#1e293b' }}>
          <FileSearch size={18} /> Compliance Findings
        </h4>
        {data.map((finding, i) => (
          <div key={i} style={{ padding: '16px', background: '#fff7ed', borderRadius: '8px', marginBottom: '8px', borderLeft: '4px solid #f97316' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ fontWeight: '600', color: '#9a3412' }}>{finding.gap}</div>
              <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: '#fed7aa', color: '#c2410c' }}>
                {finding.regulation}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#ea580c', marginBottom: '8px' }}>Severity: {finding.severity}</div>
            <div style={{ fontSize: '12px', color: '#059669', background: '#ecfdf5', padding: '8px 12px', borderRadius: '6px' }}>
              <strong>Remediation:</strong> {finding.remediation}
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
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#1e293b' }}>
          <CheckCircle size={18} color="#10b981" /> Recommendations
        </h4>
        {data.map((rec, i) => (
          <div key={i} style={{ padding: '16px', background: '#ecfdf5', borderRadius: '8px', marginBottom: '8px', borderLeft: '4px solid #10b981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ fontWeight: '600', color: '#065f46' }}>{rec.recommendation}</div>
              <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', background: rec.priority === 'high' ? '#fef2f2' : rec.priority === 'medium' ? '#fef3c7' : '#f0f9ff', color: rec.priority === 'high' ? '#dc2626' : rec.priority === 'medium' ? '#d97706' : '#0284c7' }}>
                {rec.priority}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#047857' }}>
              <span>Category: {rec.category}</span>
              {rec.expected_impact && <span>Impact: {rec.expected_impact}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAISummary = (summary) => {
    if (!summary) return null;

    // Try to parse as JSON first
    const parsed = parseAIResponse(summary);

    // If parsed successfully and is an object, render structured
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const getRiskColor = (level) => {
        const colors = { low: '#10b981', medium: '#f59e0b', high: '#ef4444', critical: '#dc2626' };
        return colors[level] || '#6b7280';
      };
      const getComplianceColor = (status) => {
        const colors = { compliant: '#10b981', partially_compliant: '#f59e0b', non_compliant: '#ef4444' };
        return colors[status] || '#6b7280';
      };

      return (
        <div style={{ marginBottom: '24px', padding: '20px', background: 'linear-gradient(135deg, #f5f3ff 0%, #eff6ff 100%)', borderRadius: '12px', border: '1px solid #c7d2fe' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#4f46e5' }}>
            <Sparkles size={18} /> AI Analysis Summary
          </h4>
          {/* Overall Assessment */}
          {(parsed.overall_assessment || parsed.summary || parsed.executive_summary) && (
            <p style={{ margin: '0 0 16px 0', color: '#334155', lineHeight: '1.7', fontSize: '15px' }}>
              {parsed.overall_assessment || parsed.summary || parsed.executive_summary}
            </p>
          )}
          {/* Status Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {parsed.risk_level && (
              <div style={{ padding: '12px 16px', background: 'white', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Risk Level</div>
                <div style={{ fontWeight: '600', color: getRiskColor(parsed.risk_level), textTransform: 'uppercase' }}>{parsed.risk_level}</div>
              </div>
            )}
            {parsed.compliance_status && (
              <div style={{ padding: '12px 16px', background: 'white', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Compliance</div>
                <div style={{ fontWeight: '600', color: getComplianceColor(parsed.compliance_status), textTransform: 'capitalize' }}>{parsed.compliance_status?.replace('_', ' ')}</div>
              </div>
            )}
            {parsed.key_findings_count && (
              <div style={{ padding: '12px 16px', background: 'white', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Key Findings</div>
                <div style={{ fontWeight: '700', color: '#4f46e5', fontSize: '20px' }}>{parsed.key_findings_count}</div>
              </div>
            )}
          </div>
          {/* Key Findings List */}
          {parsed.key_findings && Array.isArray(parsed.key_findings) && parsed.key_findings.length > 0 && (
            <div>
              <div style={{ fontWeight: '600', color: '#4f46e5', marginBottom: '8px', fontSize: '14px' }}>Key Findings</div>
              {parsed.key_findings.map((finding, i) => (
                <div key={i} style={{ padding: '12px', background: 'white', borderRadius: '8px', marginBottom: '8px', borderLeft: '3px solid #8b5cf6' }}>
                  <span style={{ color: '#334155' }}>{typeof finding === 'string' ? finding : finding.finding || finding.description || JSON.stringify(finding)}</span>
                </div>
              ))}
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
      <div style={{ marginBottom: '24px', padding: '20px', background: 'linear-gradient(135deg, #f5f3ff 0%, #eff6ff 100%)', borderRadius: '12px', border: '1px solid #c7d2fe' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#4f46e5' }}>
          <Sparkles size={18} /> AI Analysis Summary
        </h4>
        <p style={{ margin: 0, color: '#334155', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{displayText}</p>
      </div>
    );
  };

  if (loading) return <div className="loading"><div className="loading-spinner"></div></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>AI Audit Trail Analyzer</h2>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>Compliance documentation and risk assessment</p>
        </div>
        <button onClick={handleCreate} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> New Analysis
        </button>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Analysis Name</th>
              <th>Company</th>
              <th>Period</th>
              <th>Events Analyzed</th>
              <th>Risk Score</th>
              <th>Compliance Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {analyses.map((a) => (
              <tr key={a.id} onClick={() => handleRowClick(a)} style={{ cursor: 'pointer' }}>
                <td style={{ fontWeight: '500' }}>{a.analysis_name}</td>
                <td>{a.company_name}</td>
                <td>{a.analysis_period}</td>
                <td>{a.total_events_analyzed}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${a.risk_score || 0}%`, height: '100%', background: getRiskColor(a.risk_score) }} />
                    </div>
                    <span style={{ fontSize: '12px', color: getRiskColor(a.risk_score), fontWeight: '600' }}>{Math.round(parseFloat(a.risk_score) || 0)}%</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${a.compliance_score || 0}%`, height: '100%', background: getComplianceColor(a.compliance_score) }} />
                    </div>
                    <span style={{ fontSize: '12px', color: getComplianceColor(a.compliance_score), fontWeight: '600' }}>{Math.round(parseFloat(a.compliance_score) || 0)}%</span>
                  </div>
                </td>
                <td><span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', background: '#10b98120', color: '#10b981' }}>{a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedAnalysis && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={24} color="white" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px' }}>{selectedAnalysis.analysis_name}</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>{selectedAnalysis.company_name} - {selectedAnalysis.analysis_period}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Score Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', textAlign: 'center' }}>
                  <FileSearch size={24} style={{ color: '#64748b', marginBottom: '8px' }} />
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Events Analyzed</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>{selectedAnalysis.total_events_analyzed}</div>
                </div>
                <div style={{ padding: '20px', background: `${getRiskColor(selectedAnalysis.risk_score)}15`, borderRadius: '12px', textAlign: 'center' }}>
                  <AlertTriangle size={24} style={{ color: getRiskColor(selectedAnalysis.risk_score), marginBottom: '8px' }} />
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Risk Score</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: getRiskColor(selectedAnalysis.risk_score) }}>{Math.round(parseFloat(selectedAnalysis.risk_score) || 0)}%</div>
                </div>
                <div style={{ padding: '20px', background: `${getComplianceColor(selectedAnalysis.compliance_score)}15`, borderRadius: '12px', textAlign: 'center' }}>
                  <CheckCircle size={24} style={{ color: getComplianceColor(selectedAnalysis.compliance_score), marginBottom: '8px' }} />
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Compliance Score</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: getComplianceColor(selectedAnalysis.compliance_score) }}>{Math.round(parseFloat(selectedAnalysis.compliance_score) || 0)}%</div>
                </div>
                <div style={{ padding: '20px', background: '#f0fdf4', borderRadius: '12px', textAlign: 'center' }}>
                  <Lock size={24} style={{ color: '#10b981', marginBottom: '8px' }} />
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Status</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#10b981', textTransform: 'capitalize' }}>{selectedAnalysis.status}</div>
                </div>
              </div>

              {/* AI Summary */}
              {selectedAnalysis.ai_summary && renderAISummary(selectedAnalysis.ai_summary)}

              {renderHighRiskEvents(selectedAnalysis.high_risk_events)}
              {renderPatterns(selectedAnalysis.patterns_detected)}
              {renderFindings(selectedAnalysis.findings)}
              {renderRecommendations(selectedAnalysis.recommendations)}

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
              <h3>{editMode ? 'Edit Analysis' : 'New Audit Trail Analysis'}</h3>
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
                <label>Analysis Name</label>
                <input type="text" value={formData.analysis_name} onChange={(e) => setFormData({ ...formData, analysis_name: e.target.value })} placeholder="e.g., Q4 2024 Compliance Audit" required />
              </div>
              <div className="form-group">
                <label>Analysis Period</label>
                <select value={formData.analysis_period} onChange={(e) => setFormData({ ...formData, analysis_period: e.target.value })}>
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
                  <button type="button" onClick={handleAnalyze} disabled={analyzing || !formData.company_id || !formData.analysis_name} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)' }}>
                    <Sparkles size={16} /> {analyzing ? 'Analyzing...' : 'Analyze with AI'}
                  </button>
                )}
                <button type="submit" className="btn-primary">{editMode ? 'Update' : 'Save'}</button>
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
        message="Are you sure you want to delete this analysis? This action cannot be undone."
        type="danger"
      />
    </div>
  );
}

export default AiAuditAnalyzer;
