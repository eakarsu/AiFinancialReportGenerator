import React, { useState, useEffect } from 'react';
import { Presentation, Plus, Sparkles, Eye, Edit2, Trash2, X, ChevronRight, FileText, Layers, CheckCircle, Download } from 'lucide-react';
import {
  getAiPresentations, getAiPresentation, createAiPresentation, updateAiPresentation,
  deleteAiPresentation, generateAiPresentation, getCompanies
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

// Helper function to get slides array from ANY format
const getSlidesArray = (data) => {
  if (!data) return [];

  // Parse string if needed
  let obj = data;
  if (typeof data === 'string') {
    try { obj = JSON.parse(data); } catch { return []; }
  }

  // Direct array: [{slide1}, {slide2}]
  if (Array.isArray(obj)) return obj;

  // Wrapped: {slides: [{slide1}, {slide2}]}
  if (obj.slides && Array.isArray(obj.slides)) return obj.slides;

  // Double wrapped string: obj.slides is a string
  if (obj.slides && typeof obj.slides === 'string') {
    try {
      const inner = JSON.parse(obj.slides);
      if (Array.isArray(inner)) return inner;
      if (inner.slides && Array.isArray(inner.slides)) return inner.slides;
    } catch {}
  }

  return [];
};

function AiPresentations() {
  const [presentations, setPresentations] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedPresentation, setSelectedPresentation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [justGenerated, setJustGenerated] = useState(false);
  const [formData, setFormData] = useState({
    company_id: '', title: '', description: '', source_type: 'financial_statement', theme: 'professional', num_slides: 8
  });
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [presRes, compRes] = await Promise.all([getAiPresentations(), getCompanies()]);
      setPresentations(presRes.data);
      setCompanies(compRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (presentation) => {
    try {
      const res = await getAiPresentation(presentation.id);
      setSelectedPresentation(res.data);
      setJustGenerated(false); // Reset when viewing existing presentation
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching presentation:', error);
    }
  };

  const handleCreate = () => {
    setEditMode(false);
    setFormData({ company_id: companies[0]?.id || '', title: '', description: '', source_type: 'financial_statement', theme: 'professional', num_slides: 8 });
    setShowFormModal(true);
  };

  const handleEdit = () => {
    setEditMode(true);
    setFormData({
      company_id: selectedPresentation.company_id,
      title: selectedPresentation.title,
      description: selectedPresentation.description || '',
      source_type: selectedPresentation.source_type,
      theme: selectedPresentation.theme || 'professional',
      num_slides: 8
    });
    setShowDetailModal(false);
    setShowFormModal(true);
  };

  const handleDelete = () => {
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteAiPresentation(selectedPresentation.id);
      setConfirmOpen(false);
      setShowDetailModal(false);
      toast.success('Presentation deleted successfully!');
      fetchData();
    } catch (error) {
      console.error('Error deleting presentation:', error);
      toast.error('Failed to delete presentation. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await updateAiPresentation(selectedPresentation.id, formData);
      } else {
        await createAiPresentation(formData);
      }
      setShowFormModal(false);
      toast.success(editMode ? 'Presentation updated successfully!' : 'Presentation created successfully!');
      fetchData();
    } catch (error) {
      console.error('Error saving presentation:', error);
      toast.error('Failed to save presentation. Please try again.');
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const sourceData = { period: 'Q4 2024', metrics: { revenue: 10000000, expenses: 7500000, netIncome: 2500000 } };
      const res = await generateAiPresentation({ ...formData, source_data: sourceData });
      setShowFormModal(false);
      fetchData();
      const fullPresentation = await getAiPresentation(res.data.presentation.id);
      setSelectedPresentation(fullPresentation.data);
      setJustGenerated(true);
      setShowDetailModal(true);
      toast.success('Presentation generated successfully!');
      // Clear the justGenerated flag after 5 seconds
      setTimeout(() => setJustGenerated(false), 5000);
    } catch (error) {
      console.error('Error generating presentation:', error);
      toast.error('Failed to generate presentation. Please check your OpenRouter API key.');
    } finally {
      setGenerating(false);
    }
  };

  const renderSlideContent = (slide) => {
    const content = parseAIResponse(slide.content);

    const renderItem = (item) => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item !== null) {
        return item.title || item.name || item.text || item.description || JSON.stringify(item);
      }
      return String(item);
    };

    return (
      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600' }}>
            {slide.slideNumber}
          </div>
          <div>
            <div style={{ fontWeight: '600', color: '#1e293b' }}>{slide.title}</div>
            <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'capitalize' }}>{slide.type} Slide</div>
          </div>
        </div>
        {content?.mainTitle && <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>{content.mainTitle}</div>}
        {content?.subtitle && <div style={{ color: '#64748b' }}>{content.subtitle}</div>}
        {content?.keyPoints && Array.isArray(content.keyPoints) && (
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            {content.keyPoints.map((point, i) => <li key={i} style={{ color: '#334155', marginBottom: '4px' }}>{renderItem(point)}</li>)}
          </ul>
        )}
        {content?.metrics && Array.isArray(content.metrics) && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {content.metrics.map((m, i) => (
              <div key={i} style={{ padding: '8px 16px', background: '#e0f2fe', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#0369a1' }}>{m.name || m.metric || 'Metric'}</div>
                <div style={{ fontWeight: '600', color: '#0c4a6e' }}>{m.value || m.amount || '-'}</div>
              </div>
            ))}
          </div>
        )}
        {content?.recommendations && Array.isArray(content.recommendations) && (
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            {content.recommendations.map((rec, i) => (
              <li key={i} style={{ color: '#334155', marginBottom: '4px' }}>
                {typeof rec === 'object' ? (
                  <div>
                    <strong>{rec.title || rec.action || 'Recommendation'}</strong>
                    {rec.description && <span style={{ color: '#64748b' }}> - {rec.description}</span>}
                    {rec.priority && <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: rec.priority === 'high' ? '#fee2e2' : '#fef3c7', color: rec.priority === 'high' ? '#dc2626' : '#d97706' }}>{rec.priority}</span>}
                  </div>
                ) : renderItem(rec)}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const getStatusColor = (status) => {
    const colors = { generated: '#3b82f6', reviewed: '#10b981', presented: '#8b5cf6', draft: '#6b7280' };
    return colors[status] || '#6b7280';
  };

  if (loading) return <div className="loading"><div className="loading-spinner"></div></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>AI Presentation Generator</h2>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>Auto-create slides from financial reports</p>
        </div>
        <button onClick={handleCreate} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> New Presentation
        </button>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Company</th>
              <th>Source Type</th>
              <th>Theme</th>
              <th>Slides</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {presentations.map((pres) => (
              <tr key={pres.id} onClick={() => handleRowClick(pres)} style={{ cursor: 'pointer' }}>
                <td style={{ fontWeight: '500' }}>{pres.title}</td>
                <td>{pres.company_name}</td>
                <td style={{ textTransform: 'capitalize' }}>{pres.source_type?.replace('_', ' ')}</td>
                <td style={{ textTransform: 'capitalize' }}>{pres.theme}</td>
                <td>{getSlidesArray(pres.slides).length}</td>
                <td><span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', background: `${getStatusColor(pres.status)}20`, color: getStatusColor(pres.status) }}>{pres.status}</span></td>
                <td>{new Date(pres.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedPresentation && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Presentation size={24} color="white" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px' }}>{selectedPresentation.title}</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>{selectedPresentation.company_name}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Success Banner when just generated */}
              {justGenerated && (
                <div style={{ marginBottom: '20px', padding: '16px 20px', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', borderRadius: '12px', border: '1px solid #86efac', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <CheckCircle size={24} color="#16a34a" />
                  <div>
                    <div style={{ fontWeight: '600', color: '#166534' }}>Presentation Generated & Saved!</div>
                    <div style={{ fontSize: '13px', color: '#15803d' }}>Your presentation has been saved to the database and is ready to use.</div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <span style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', background: `${getStatusColor(selectedPresentation.status)}15`, color: getStatusColor(selectedPresentation.status) }}>
                  {selectedPresentation.status}
                </span>
                <span style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '13px', background: '#f1f5f9', color: '#475569' }}>
                  {selectedPresentation.theme}
                </span>
                {selectedPresentation.ai_generated && (
                  <span style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '13px', background: '#fef3c7', color: '#92400e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={14} /> AI Generated
                  </span>
                )}
                <span style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '13px', background: '#ecfdf5', color: '#166534', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={14} /> Saved to Database
                </span>
              </div>

              {selectedPresentation.description && (
                <div style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#64748b' }}>Description</h4>
                  <p style={{ margin: 0, color: '#334155' }}>{selectedPresentation.description}</p>
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                {/* Debug info - remove after fixing */}
                <div style={{ background: '#fef3c7', padding: '8px', marginBottom: '12px', fontSize: '12px', borderRadius: '4px' }}>
                  <strong>DEBUG:</strong> slides type: {typeof selectedPresentation.slides} |
                  raw: {JSON.stringify(selectedPresentation.slides)?.substring(0, 200)}...
                </div>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Layers size={18} /> Slides ({getSlidesArray(selectedPresentation.slides).length})
                </h4>
                {getSlidesArray(selectedPresentation.slides).map((slide, index) => (
                  <div key={index}>{renderSlideContent(slide)}</div>
                ))}
              </div>

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
              <h3>{editMode ? 'Edit Presentation' : 'Create AI Presentation'}</h3>
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
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Presentation title" required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description" rows={3} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Source Type</label>
                  <select value={formData.source_type} onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}>
                    <option value="financial_statement">Financial Statement</option>
                    <option value="quarterly_report">Quarterly Report</option>
                    <option value="annual_report">Annual Report</option>
                    <option value="budget_analysis">Budget Analysis</option>
                    <option value="forecast">Forecast</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Theme</label>
                  <select value={formData.theme} onChange={(e) => setFormData({ ...formData, theme: e.target.value })}>
                    <option value="professional">Professional</option>
                    <option value="modern">Modern</option>
                    <option value="executive">Executive</option>
                    <option value="minimal">Minimal</option>
                    <option value="corporate">Corporate</option>
                  </select>
                </div>
              </div>
              {!editMode && (
                <div className="form-group">
                  <label>Number of Slides</label>
                  <input type="number" value={formData.num_slides} onChange={(e) => setFormData({ ...formData, num_slides: parseInt(e.target.value) })} min={4} max={20} />
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowFormModal(false)} className="btn-secondary">Cancel</button>
                {!editMode && (
                  <button type="button" onClick={handleGenerate} disabled={generating || !formData.company_id || !formData.title} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' }}>
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
        message="Are you sure you want to delete this presentation? This action cannot be undone."
        type="danger"
      />
    </div>
  );
}

export default AiPresentations;
