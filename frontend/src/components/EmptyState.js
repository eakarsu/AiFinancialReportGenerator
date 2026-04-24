import React from 'react';
import { FileText, Search, AlertTriangle, Database, Plus, Filter } from 'lucide-react';

const presets = {
  noData: { icon: Database, title: 'No data yet', description: 'Get started by adding your first record.', color: '#6b7280' },
  noResults: { icon: Search, title: 'No results found', description: 'Try adjusting your search or filter criteria.', color: '#3b82f6' },
  noReports: { icon: FileText, title: 'No reports available', description: 'Generate your first report to see it here.', color: '#8b5cf6' },
  error: { icon: AlertTriangle, title: 'Failed to load data', description: 'Something went wrong. Please try again.', color: '#ef4444' },
  noFiltered: { icon: Filter, title: 'No matching records', description: 'No records match the current filters. Try broadening your search.', color: '#f59e0b' },
};

function EmptyState({ preset, icon, title, description, action, actionLabel, color, children }) {
  const config = preset ? presets[preset] || presets.noData : {};
  const Icon = icon || config.icon || Database;
  const finalTitle = title || config.title || 'No data';
  const finalDescription = description || config.description || '';
  const finalColor = color || config.color || '#6b7280';

  return (
    <div style={{
      textAlign: 'center', padding: '48px 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '50%',
        background: `${finalColor}10`, display: 'flex',
        alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
      }}>
        <Icon size={32} color={finalColor} style={{ opacity: 0.7 }} />
      </div>
      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 8px' }}>
        {finalTitle}
      </h3>
      <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 20px', maxWidth: '360px', lineHeight: 1.6 }}>
        {finalDescription}
      </p>
      {action && (
        <button className="btn btn-primary" onClick={action} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> {actionLabel || 'Add New'}
        </button>
      )}
      {children}
    </div>
  );
}

export default EmptyState;
