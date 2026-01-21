import React, { useState, useEffect } from 'react';
import { getAuditLogs, getAuditLog, analyzeAuditLog } from '../services/api';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';

const columns = [
  { key: 'created_at', label: 'Timestamp', render: (val) => new Date(val).toLocaleString() },
  { key: 'user_name', label: 'User' },
  { key: 'action', label: 'Action' },
  { key: 'entity_type', label: 'Entity Type' },
  { key: 'risk_level', label: 'Risk Level', render: (val) => (
    <span className={`badge ${val === 'low' ? 'badge-success' : val === 'medium' ? 'badge-warning' : val === 'high' ? 'badge-danger' : 'badge-gray'}`}>
      {val}
    </span>
  )},
  { key: 'ip_address', label: 'IP Address' }
];

const detailFields = [
  { key: 'created_at', label: 'Timestamp', type: 'datetime' },
  { key: 'user_name', label: 'User', type: 'text' },
  { key: 'action', label: 'Action', type: 'text' },
  { key: 'entity_type', label: 'Entity Type', type: 'text' },
  { key: 'entity_id', label: 'Entity ID', type: 'text' },
  { key: 'risk_level', label: 'Risk Level', type: 'badge', statusMap: { low: 'badge-success', medium: 'badge-warning', high: 'badge-danger', critical: 'badge-danger' } },
  { key: 'ip_address', label: 'IP Address', type: 'text' },
  { key: 'user_agent', label: 'User Agent', type: 'text', fullWidth: true },
  { key: 'old_values', label: 'Old Values', type: 'json', fullWidth: true },
  { key: 'new_values', label: 'New Values', type: 'json', fullWidth: true },
];

function AuditLogs() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await getAuditLogs();
      setData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (row) => {
    try {
      const response = await getAuditLog(row.id);
      setSelectedItem(response.data);
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching details:', error);
    }
  };

  const handleAiAnalyze = async () => {
    if (!selectedItem) return;
    setAnalyzing(true);
    try {
      const response = await analyzeAuditLog(selectedItem.id);
      setSelectedItem({ ...selectedItem, ai_risk_assessment: response.data.analysis });
    } catch (error) {
      console.error('Error analyzing:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Audit Logs</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <select className="btn btn-secondary" style={{ padding: '8px 12px' }}>
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
            <button className="btn btn-secondary">Export</button>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          onRowClick={handleRowClick}
        />
      </div>

      <DetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Audit Log Details"
        data={selectedItem || {}}
        fields={detailFields}
        aiField="ai_risk_assessment"
        onAiAnalyze={handleAiAnalyze}
        analyzing={analyzing}
      />
    </div>
  );
}

export default AuditLogs;
