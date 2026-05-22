import React, { useEffect, useState } from 'react';
import {
  listReportTemplates, createReportTemplate,
  updateReportTemplate, deleteReportTemplate,
} from '../services/api';

const EMPTY_TEMPLATE = {
  name: '', description: '',
  sections: [], kpi_definitions: [],
};

export default function ReportTemplateEditor() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState(EMPTY_TEMPLATE);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await listReportTemplates();
      setItems(r.data?.items || []);
      setError(null);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const addSection = () => setDraft({
    ...draft,
    sections: [...(draft.sections || []), { title: 'New Section', body: '' }],
  });
  const updateSection = (i, patch) => setDraft({
    ...draft,
    sections: draft.sections.map((s, idx) => idx === i ? { ...s, ...patch } : s),
  });
  const removeSection = (i) => setDraft({
    ...draft,
    sections: draft.sections.filter((_, idx) => idx !== i),
  });

  const addKpi = () => setDraft({
    ...draft,
    kpi_definitions: [...(draft.kpi_definitions || []), { name: 'New KPI', formula: '', unit: '' }],
  });
  const updateKpi = (i, patch) => setDraft({
    ...draft,
    kpi_definitions: draft.kpi_definitions.map((k, idx) => idx === i ? { ...k, ...patch } : k),
  });
  const removeKpi = (i) => setDraft({
    ...draft,
    kpi_definitions: draft.kpi_definitions.filter((_, idx) => idx !== i),
  });

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateReportTemplate(editingId, draft);
      } else {
        await createReportTemplate(draft);
      }
      setDraft(EMPTY_TEMPLATE);
      setEditingId(null);
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (it) => {
    setEditingId(it.id);
    setDraft({
      name: it.name || '',
      description: it.description || '',
      sections: Array.isArray(it.sections) ? it.sections : [],
      kpi_definitions: Array.isArray(it.kpi_definitions) ? it.kpi_definitions : [],
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await deleteReportTemplate(id);
      if (editingId === id) {
        setEditingId(null);
        setDraft(EMPTY_TEMPLATE);
      }
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
  };

  const inputStyle = { width: '100%', padding: 6, marginTop: 2, boxSizing: 'border-box' };

  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 24,
    }}>
      <h3 style={{ margin: 0, marginBottom: 12, color: '#1a3a5c' }}>Report Template Editor</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Left: Editor */}
        <div style={{ borderRight: '1px solid #eee', paddingRight: 16 }}>
          <h4 style={{ marginTop: 0 }}>{editingId ? `Editing #${editingId}` : 'New Template'}</h4>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Name</label>
          <input
            type="text" value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            style={inputStyle} placeholder="e.g. Quarterly CFO Report"
          />
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginTop: 10 }}>Description</label>
          <textarea
            rows={2} value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            style={inputStyle}
          />

          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 13 }}>Sections</strong>
              <button onClick={addSection} style={{ fontSize: 12, padding: '4px 8px' }}>+ Add Section</button>
            </div>
            {(draft.sections || []).map((s, i) => (
              <div key={i} style={{ background: '#f9fafb', padding: 8, marginTop: 6, borderRadius: 6 }}>
                <input
                  type="text" value={s.title || ''}
                  onChange={(e) => updateSection(i, { title: e.target.value })}
                  style={inputStyle} placeholder="Section title"
                />
                <textarea
                  rows={2} value={s.body || ''}
                  onChange={(e) => updateSection(i, { body: e.target.value })}
                  style={{ ...inputStyle, marginTop: 4 }}
                  placeholder="Section body / notes"
                />
                <button onClick={() => removeSection(i)} style={{ fontSize: 12, color: '#c00', marginTop: 4 }}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 13 }}>KPI Definitions</strong>
              <button onClick={addKpi} style={{ fontSize: 12, padding: '4px 8px' }}>+ Add KPI</button>
            </div>
            {(draft.kpi_definitions || []).map((k, i) => (
              <div key={i} style={{ background: '#f9fafb', padding: 8, marginTop: 6, borderRadius: 6, display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 4 }}>
                <input
                  type="text" value={k.name || ''} placeholder="KPI name"
                  onChange={(e) => updateKpi(i, { name: e.target.value })}
                  style={{ padding: 4 }}
                />
                <input
                  type="text" value={k.formula || ''} placeholder="Formula (e.g. revenue/expense)"
                  onChange={(e) => updateKpi(i, { formula: e.target.value })}
                  style={{ padding: 4 }}
                />
                <input
                  type="text" value={k.unit || ''} placeholder="Unit"
                  onChange={(e) => updateKpi(i, { unit: e.target.value })}
                  style={{ padding: 4 }}
                />
                <button onClick={() => removeKpi(i)} style={{ gridColumn: '1/-1', fontSize: 12, color: '#c00' }}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button
              onClick={handleSave} disabled={saving || !draft.name}
              style={{
                background: (saving || !draft.name) ? '#9ca3af' : '#1a3a5c', color: 'white',
                border: 'none', padding: '8px 14px', borderRadius: 6,
                cursor: (saving || !draft.name) ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving...' : (editingId ? 'Update' : 'Create')}
            </button>
            {editingId && (
              <button
                onClick={() => { setEditingId(null); setDraft(EMPTY_TEMPLATE); }}
                style={{ padding: '8px 14px', borderRadius: 6 }}
              >Cancel</button>
            )}
          </div>
        </div>

        {/* Right: List */}
        <div>
          <h4 style={{ marginTop: 0 }}>Templates ({items.length})</h4>
          {loading && <div style={{ color: '#888' }}>Loading...</div>}
          {error && <div style={{ color: '#c00' }}>Error: {error}</div>}
          {!loading && items.length === 0 && <div style={{ color: '#888' }}>No templates yet.</div>}
          {items.map((t) => (
            <div key={t.id} style={{
              border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, marginBottom: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{t.name}</strong>
                <span style={{ fontSize: 11, color: '#888' }}>#{t.id}</span>
              </div>
              {t.description && <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{t.description}</div>}
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                {(t.sections || []).length} sections / {(t.kpi_definitions || []).length} KPIs
              </div>
              <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                <button onClick={() => handleEdit(t)} style={{ fontSize: 12, padding: '4px 8px' }}>Edit</button>
                <button onClick={() => handleDelete(t.id)} style={{ fontSize: 12, padding: '4px 8px', color: '#c00' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
