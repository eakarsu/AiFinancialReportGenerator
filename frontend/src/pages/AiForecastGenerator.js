import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus, Sparkles, Edit2, Trash2, X, Target, AlertTriangle, BarChart3, Activity } from 'lucide-react';
import {
  getAiForecasts, getAiForecast, createAiForecast, updateAiForecast,
  deleteAiForecast, generateAiForecast, getCompanies
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
    return null;
  }
};

function AiForecastGenerator() {
  const [forecasts, setForecasts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedForecast, setSelectedForecast] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    company_id: '', forecast_name: '', forecast_type: 'revenue', metric_name: 'Total Revenue', time_horizon: '12 months'
  });
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [forecastRes, compRes] = await Promise.all([getAiForecasts(), getCompanies()]);
      setForecasts(forecastRes.data);
      setCompanies(compRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (forecast) => {
    try {
      const res = await getAiForecast(forecast.id);
      setSelectedForecast(res.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching forecast:', error);
    }
  };

  const handleCreate = () => {
    setEditMode(false);
    setFormData({ company_id: companies[0]?.id || '', forecast_name: '', forecast_type: 'revenue', metric_name: 'Total Revenue', time_horizon: '12 months' });
    setShowFormModal(true);
  };

  const handleEdit = () => {
    setEditMode(true);
    setFormData({
      company_id: selectedForecast.company_id,
      forecast_name: selectedForecast.forecast_name,
      forecast_type: selectedForecast.forecast_type,
      metric_name: selectedForecast.metric_name,
      time_horizon: selectedForecast.time_horizon
    });
    setShowDetailModal(false);
    setShowFormModal(true);
  };

  const handleDelete = () => {
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteAiForecast(selectedForecast.id);
      setConfirmOpen(false);
      setShowDetailModal(false);
      toast.success('Forecast deleted successfully!');
      fetchData();
    } catch (error) {
      console.error('Error deleting forecast:', error);
      toast.error('Failed to delete forecast. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await updateAiForecast(selectedForecast.id, formData);
      } else {
        await createAiForecast(formData);
      }
      setShowFormModal(false);
      toast.success(editMode ? 'Forecast updated successfully!' : 'Forecast created successfully!');
      fetchData();
    } catch (error) {
      console.error('Error saving forecast:', error);
      toast.error('Failed to save forecast. Please try again.');
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await generateAiForecast(formData);
      setShowFormModal(false);
      fetchData();
      const fullForecast = await getAiForecast(res.data.forecast.id);
      setSelectedForecast(fullForecast.data);
      setShowDetailModal(true);
      toast.success('Forecast generated successfully!');
    } catch (error) {
      console.error('Error generating forecast:', error);
      toast.error('Failed to generate forecast. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = { active: '#10b981', generated: '#3b82f6', archived: '#6b7280', draft: '#f59e0b' };
    return colors[status] || '#6b7280';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  const renderPredictions = (predictions) => {
    if (!predictions) return null;
    const data = parseAIResponse(predictions);
    if (!Array.isArray(data)) return null;

    return (
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#1e293b' }}>
          <BarChart3 size={18} /> Predictions
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {data.map((pred, i) => (
            <div key={i} style={{ padding: '16px', background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>{pred.period}</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>{formatCurrency(pred.predicted_value)}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: pred.growth_rate >= 0 ? '#059669' : '#dc2626' }}>
                  {parseFloat(pred.growth_rate) >= 0 ? '+' : ''}{(parseFloat(pred.growth_rate) || 0).toFixed(1)}% growth
                </span>
                <span style={{ color: '#64748b' }}>{pred.confidence}% conf.</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAssumptions = (assumptions) => {
    if (!assumptions) return null;
    const data = parseAIResponse(assumptions);
    if (!Array.isArray(data)) return null;

    return (
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#1e293b' }}>
          <Target size={18} /> Key Assumptions
        </h4>
        {data.map((item, i) => (
          <div key={i} style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', marginBottom: '8px', borderLeft: '3px solid #3b82f6' }}>
            <div style={{ fontWeight: '500', color: '#1e293b', marginBottom: '4px' }}>{item.assumption}</div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b' }}>
              <span>Impact: {item.impact}</span>
              <span>Sensitivity: {item.sensitivity}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderRiskFactors = (risks) => {
    if (!risks) return null;
    const data = parseAIResponse(risks);
    if (!Array.isArray(data)) return null;

    return (
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#1e293b' }}>
          <AlertTriangle size={18} /> Risk Factors
        </h4>
        {data.map((risk, i) => (
          <div key={i} style={{ padding: '16px', background: '#fef2f2', borderRadius: '8px', marginBottom: '8px', borderLeft: '3px solid #ef4444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ fontWeight: '600', color: '#991b1b' }}>{risk.risk}</div>
              <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: '#fecaca', color: '#dc2626' }}>
                {risk.probability}% prob.
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#7f1d1d', marginBottom: '8px' }}>{risk.potential_impact}</div>
            <div style={{ fontSize: '12px', color: '#059669', background: '#ecfdf5', padding: '8px 12px', borderRadius: '6px' }}>
              <strong>Mitigation:</strong> {risk.mitigation}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAIAnalysis = (analysis) => {
    if (!analysis) return null;

    // Try to parse as JSON first
    const parsed = parseAIResponse(analysis);

    // If parsed successfully and is an object, render structured
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return (
        <div style={{ marginBottom: '24px', padding: '20px', background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)', borderRadius: '12px', border: '1px solid #c7d2fe' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#4f46e5' }}>
            <Sparkles size={18} /> AI Analysis
          </h4>
          {parsed.summary && (
            <p style={{ margin: '0 0 16px 0', color: '#334155', lineHeight: '1.7', fontSize: '15px' }}>{parsed.summary}</p>
          )}
          {parsed.key_insights && Array.isArray(parsed.key_insights) && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: '600', color: '#4f46e5', marginBottom: '8px', fontSize: '14px' }}>Key Insights</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {parsed.key_insights.map((insight, i) => (
                  <span key={i} style={{ padding: '8px 16px', background: 'white', borderRadius: '8px', fontSize: '13px', color: '#334155', border: '1px solid #e0e7ff' }}>
                    {typeof insight === 'string' ? insight : insight.insight || JSON.stringify(insight)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {parsed.recommendations && Array.isArray(parsed.recommendations) && (
            <div>
              <div style={{ fontWeight: '600', color: '#4f46e5', marginBottom: '8px', fontSize: '14px' }}>Recommendations</div>
              {parsed.recommendations.map((rec, i) => (
                <div key={i} style={{ padding: '12px', background: 'white', borderRadius: '8px', marginBottom: '8px', borderLeft: '3px solid #10b981' }}>
                  <span style={{ color: '#334155' }}>{typeof rec === 'string' ? rec : rec.recommendation || rec.action || JSON.stringify(rec)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Fallback to plain text display
    const displayText = typeof analysis === 'string' ? analysis : JSON.stringify(analysis, null, 2);
    return (
      <div style={{ marginBottom: '24px', padding: '20px', background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)', borderRadius: '12px', border: '1px solid #c7d2fe' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#4f46e5' }}>
          <Sparkles size={18} /> AI Analysis
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
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>AI Forecast Generator</h2>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>Predictive financial modeling with AI</p>
        </div>
        <button onClick={handleCreate} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> New Forecast
        </button>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Forecast Name</th>
              <th>Company</th>
              <th>Type</th>
              <th>Metric</th>
              <th>Time Horizon</th>
              <th>Methodology</th>
              <th>Accuracy</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {forecasts.map((f) => (
              <tr key={f.id} onClick={() => handleRowClick(f)} style={{ cursor: 'pointer' }}>
                <td style={{ fontWeight: '500' }}>{f.forecast_name}</td>
                <td>{f.company_name}</td>
                <td style={{ textTransform: 'capitalize' }}>{f.forecast_type}</td>
                <td>{f.metric_name}</td>
                <td>{f.time_horizon}</td>
                <td>{f.methodology}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${parseFloat(f.accuracy_score) || 0}%`, height: '100%', background: parseFloat(f.accuracy_score) >= 80 ? '#10b981' : parseFloat(f.accuracy_score) >= 60 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{Math.round(parseFloat(f.accuracy_score) || 0)}%</span>
                  </div>
                </td>
                <td><span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', background: `${getStatusColor(f.status)}20`, color: getStatusColor(f.status) }}>{f.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedForecast && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={24} color="white" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px' }}>{selectedForecast.forecast_name}</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>{selectedForecast.company_name} - {selectedForecast.time_horizon}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '12px', textAlign: 'center' }}>
                  <Activity size={20} style={{ color: '#10b981', marginBottom: '8px' }} />
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Type</div>
                  <div style={{ fontWeight: '600', color: '#1e293b', textTransform: 'capitalize' }}>{selectedForecast.forecast_type}</div>
                </div>
                <div style={{ padding: '16px', background: '#eff6ff', borderRadius: '12px', textAlign: 'center' }}>
                  <Target size={20} style={{ color: '#3b82f6', marginBottom: '8px' }} />
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Metric</div>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{selectedForecast.metric_name}</div>
                </div>
                <div style={{ padding: '16px', background: '#fef3c7', borderRadius: '12px', textAlign: 'center' }}>
                  <BarChart3 size={20} style={{ color: '#d97706', marginBottom: '8px' }} />
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Methodology</div>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{selectedForecast.methodology}</div>
                </div>
                <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '12px', textAlign: 'center' }}>
                  <Sparkles size={20} style={{ color: '#10b981', marginBottom: '8px' }} />
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Accuracy</div>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{Math.round(parseFloat(selectedForecast.accuracy_score) || 0)}%</div>
                </div>
              </div>

              {/* AI Analysis */}
              {selectedForecast.ai_analysis && renderAIAnalysis(selectedForecast.ai_analysis)}

              {renderPredictions(selectedForecast.predictions)}
              {renderAssumptions(selectedForecast.assumptions)}
              {renderRiskFactors(selectedForecast.risk_factors)}

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
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{editMode ? 'Edit Forecast' : 'Generate AI Forecast'}</h3>
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
                <label>Forecast Name</label>
                <input type="text" value={formData.forecast_name} onChange={(e) => setFormData({ ...formData, forecast_name: e.target.value })} placeholder="e.g., Revenue Forecast 2025" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Forecast Type</label>
                  <select value={formData.forecast_type} onChange={(e) => setFormData({ ...formData, forecast_type: e.target.value })}>
                    <option value="revenue">Revenue</option>
                    <option value="expense">Expense</option>
                    <option value="profit">Profit</option>
                    <option value="cash_flow">Cash Flow</option>
                    <option value="growth">Growth</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Time Horizon</label>
                  <select value={formData.time_horizon} onChange={(e) => setFormData({ ...formData, time_horizon: e.target.value })}>
                    <option value="3 months">3 Months</option>
                    <option value="6 months">6 Months</option>
                    <option value="12 months">12 Months</option>
                    <option value="24 months">24 Months</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Metric Name</label>
                <input type="text" value={formData.metric_name} onChange={(e) => setFormData({ ...formData, metric_name: e.target.value })} placeholder="e.g., Total Revenue, Operating Expenses" required />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowFormModal(false)} className="btn-secondary">Cancel</button>
                {!editMode && (
                  <button type="button" onClick={handleGenerate} disabled={generating || !formData.company_id || !formData.forecast_name} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
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
        message="Are you sure you want to delete this forecast? This action cannot be undone."
        type="danger"
      />
    </div>
  );
}

export default AiForecastGenerator;
