import React, { useState } from 'react';
import { X, Brain, CheckCircle, AlertTriangle, TrendingUp, Lightbulb, Target, Shield, Trash2, Edit3 } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

function DetailModal({ isOpen, onClose, title, data, fields, aiField, onAiAnalyze, analyzing, onDelete, onEdit, onSaveAi, savingAi }) {
  const [deleting, setDeleting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (!isOpen) return null;

  const parseAiContent = (content) => {
    if (!content) return null;
    const sections = [];
    const lines = content.split('\n');
    let currentSection = null;
    let currentItems = [];

    const sectionIcons = {
      'executive summary': <TrendingUp size={16} />, 'summary': <TrendingUp size={16} />,
      'analysis': <Target size={16} />, 'assessment': <Target size={16} />,
      'recommendation': <Lightbulb size={16} />, 'recommendations': <Lightbulb size={16} />,
      'action': <CheckCircle size={16} />, 'risk': <AlertTriangle size={16} />,
      'compliance': <Shield size={16} />, 'optimization': <TrendingUp size={16} />,
      'insight': <Lightbulb size={16} />, 'insights': <Lightbulb size={16} />,
      'forecast': <TrendingUp size={16} />, 'validation': <CheckCircle size={16} />,
      'impact': <AlertTriangle size={16} />, 'default': <CheckCircle size={16} />
    };

    const getIconForSection = (t) => {
      const lower = t.toLowerCase();
      for (const [key, icon] of Object.entries(sectionIcons)) {
        if (lower.includes(key)) return icon;
      }
      return sectionIcons.default;
    };

    const getSectionColor = (t) => {
      const lower = t.toLowerCase();
      if (lower.includes('risk') || lower.includes('alert') || lower.includes('warning')) return '#ef4444';
      if (lower.includes('success') || lower.includes('strength') || lower.includes('positive')) return '#10b981';
      if (lower.includes('recommendation') || lower.includes('action') || lower.includes('suggestion')) return '#3b82f6';
      if (lower.includes('insight') || lower.includes('opportunity')) return '#8b5cf6';
      return '#6366f1';
    };

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;
      const sectionMatch = trimmedLine.match(/^\*?\*?(\d+)\.\s*\*?\*?(.+?)\*?\*?:?\s*$/);
      const boldSectionMatch = trimmedLine.match(/^\*\*(.+?)\*\*:?\s*$/);
      if (sectionMatch || boldSectionMatch) {
        if (currentSection) {
          sections.push({ title: currentSection, items: currentItems, icon: getIconForSection(currentSection), color: getSectionColor(currentSection) });
        }
        currentSection = sectionMatch ? sectionMatch[2].replace(/\*\*/g, '') : boldSectionMatch[1];
        currentItems = [];
      } else if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•') || trimmedLine.match(/^[a-z]\)/i)) {
        currentItems.push(trimmedLine.replace(/^[-•]\s*/, '').replace(/^[a-z]\)\s*/i, ''));
      } else if (trimmedLine.match(/^\d+\.\s/) && currentSection) {
        currentItems.push(trimmedLine.replace(/^\d+\.\s*/, ''));
      } else if (currentSection) {
        if (currentItems.length > 0 && !trimmedLine.match(/^\d+\./)) {
          currentItems[currentItems.length - 1] += ' ' + trimmedLine;
        } else {
          currentItems.push(trimmedLine);
        }
      } else {
        if (!currentSection) { currentSection = 'Overview'; currentItems.push(trimmedLine); }
      }
    });
    if (currentSection) {
      sections.push({ title: currentSection, items: currentItems, icon: getIconForSection(currentSection), color: getSectionColor(currentSection) });
    }
    return sections.length > 0 ? sections : null;
  };

  const renderAiContent = (content) => {
    const sections = parseAiContent(content);
    if (!sections) return <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{content}</div>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sections.map((section, idx) => (
          <div key={idx} style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', paddingBottom: '10px', borderBottom: '2px solid ' + section.color + '20' }}>
              <div style={{ background: section.color + '15', color: section.color, padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {section.icon}
              </div>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#1e293b', textTransform: 'capitalize' }}>{section.title}</h4>
            </div>
            <ul style={{ margin: 0, paddingLeft: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {section.items.map((item, itemIdx) => (
                <li key={itemIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', lineHeight: '1.6', color: '#475569' }}>
                  <span style={{ color: section.color, fontWeight: 'bold', fontSize: '10px', marginTop: '6px' }}>●</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  const formatValue = (value, type) => {
    if (value === null || value === undefined) return 'N/A';
    switch (type) {
      case 'currency': return `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'percentage': return `${parseFloat(value).toFixed(2)}%`;
      case 'date': return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      case 'datetime': return new Date(value).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      case 'json': return JSON.stringify(value, null, 2);
      default: return String(value);
    }
  };

  const getBadgeClass = (value, statusMap) => {
    if (!statusMap) return 'badge-gray';
    return statusMap[value?.toLowerCase()] || 'badge-gray';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            {fields.map((field) => (
              <div key={field.key} className="detail-item" style={field.fullWidth ? { gridColumn: 'span 2' } : {}}>
                <div className="detail-label">{field.label}</div>
                <div className={`detail-value ${field.large ? 'large' : ''}`}>
                  {field.type === 'badge' ? (
                    <span className={`badge ${getBadgeClass(data[field.key], field.statusMap)}`}>{data[field.key] || 'N/A'}</span>
                  ) : formatValue(data[field.key], field.type)}
                </div>
              </div>
            ))}
          </div>

          {aiField && (
            <div className="ai-section" style={{ marginTop: '24px', background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)', borderRadius: '16px', padding: '20px', border: '1px solid #e0e7ff' }}>
              <div className="ai-section-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #c7d2fe' }}>
                <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(99, 102, 241, 0.25)' }}>
                  <Brain size={20} color="white" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>AI-Powered Analysis</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Intelligent insights generated by Claude AI</p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {justSaved && (
                    <span style={{ color: '#10b981', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={14} /> Saved!
                    </span>
                  )}
                  {onAiAnalyze && (
                    <button className="btn"
                      style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '500', background: analyzing ? '#94a3b8' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: analyzing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(99, 102, 241, 0.25)' }}
                      onClick={async () => { await onAiAnalyze(); setJustSaved(true); setTimeout(() => setJustSaved(false), 3000); }}
                      disabled={analyzing}>
                      {analyzing ? (<><span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>Analyzing & Saving...</>) : (<><Brain size={14} />{data[aiField] ? 'Regenerate & Save' : 'Generate & Save'}</>)}
                    </button>
                  )}
                </div>
              </div>
              <div className="ai-section-content">
                {data[aiField] ? renderAiContent(data[aiField]) : (
                  <div style={{ textAlign: 'center', padding: '32px 20px', color: '#64748b' }}>
                    <Brain size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p style={{ margin: 0, fontSize: '14px' }}>No AI analysis available yet.</p>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>Click "Generate Analysis" to get AI-powered insights.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {onDelete && (
              <button className="btn btn-danger"
                onClick={() => setConfirmOpen(true)}
                disabled={deleting}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trash2 size={16} />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
            {onEdit && (
              <button className="btn btn-secondary"
                onClick={() => onEdit(data)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Edit3 size={16} /> Edit
              </button>
            )}
          </div>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await onDelete(data.id);
            onClose();
          } catch (error) {
            console.error('Error deleting:', error);
          } finally {
            setDeleting(false);
          }
        }}
        title="Delete Record"
        message="Are you sure you want to delete this item? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}

export default DetailModal;
