import React, { useState, useEffect } from 'react';
import { getAnomalyDetections, getAnomalyDetection, createAnomalyDetection, getCompanies, analyzeAnomaly } from '../services/api';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const columns = [
  { key: 'company_name', label: 'Company' },
  { key: 'anomaly_type', label: 'Type' },
  { key: 'severity', label: 'Severity', render: (val) => (
    <span className={`badge ${val === 'critical' ? 'badge-danger' : val === 'high' ? 'badge-danger' : val === 'medium' ? 'badge-warning' : 'badge-success'}`}>
      {val}
    </span>
  )},
  { key: 'affected_metric', label: 'Affected Metric' },
  { key: 'deviation_percentage', label: 'Deviation', render: (val) => val ? `${parseFloat(val).toFixed(1)}%` : 'N/A' },
  { key: 'detection_date', label: 'Detected', render: (val) => new Date(val).toLocaleDateString() },
  { key: 'resolution_status', label: 'Status', render: (val) => (
    <span className={`badge ${val === 'resolved' ? 'badge-success' : val === 'investigating' ? 'badge-warning' : 'badge-danger'}`}>
      {val}
    </span>
  )}
];

const detailFields = [
  { key: 'company_name', label: 'Company', type: 'text' },
  { key: 'anomaly_type', label: 'Anomaly Type', type: 'text' },
  { key: 'severity', label: 'Severity', type: 'badge', statusMap: { low: 'badge-success', medium: 'badge-warning', high: 'badge-danger', critical: 'badge-danger' } },
  { key: 'description', label: 'Description', type: 'text', fullWidth: true },
  { key: 'affected_metric', label: 'Affected Metric', type: 'text' },
  { key: 'expected_value', label: 'Expected Value', type: 'currency' },
  { key: 'actual_value', label: 'Actual Value', type: 'currency' },
  { key: 'deviation_percentage', label: 'Deviation', type: 'percentage' },
  { key: 'detection_date', label: 'Detection Date', type: 'date' },
  { key: 'resolution_status', label: 'Resolution Status', type: 'badge', statusMap: { open: 'badge-danger', investigating: 'badge-warning', resolved: 'badge-success' } },
  { key: 'resolution_notes', label: 'Resolution Notes', type: 'text', fullWidth: true },
];

function AnomalyDetections() {
  const [data, setData] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchData();
    fetchCompanies();
  }, []);

  const fetchData = async () => {
    try {
      const response = await getAnomalyDetections();
      setData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await getCompanies();
      setCompanies(response.data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const handleRowClick = async (row) => {
    try {
      const response = await getAnomalyDetection(row.id);
      setSelectedItem(response.data);
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching details:', error);
    }
  };

  const handleCreate = async (formData) => {
    await createAnomalyDetection(formData);
    fetchData();
  };

  const handleAiAnalyze = async () => {
    if (!selectedItem) return;
    setAnalyzing(true);
    try {
      const response = await analyzeAnomaly(selectedItem.id);
      setSelectedItem({ ...selectedItem, ai_explanation: response.data.analysis });
    } catch (error) {
      console.error('Error analyzing:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const formFields = [
    { key: 'company_id', label: 'Company', type: 'select', options: companies.map(c => ({ value: c.id, label: c.name })) },
    { key: 'anomaly_type', label: 'Anomaly Type', type: 'select', options: [
      { value: 'expense_spike', label: 'Expense Spike' },
      { value: 'revenue_drop', label: 'Revenue Drop' },
      { value: 'unusual_transaction', label: 'Unusual Transaction' },
      { value: 'pattern_deviation', label: 'Pattern Deviation' },
      { value: 'threshold_breach', label: 'Threshold Breach' }
    ]},
    { key: 'severity', label: 'Severity', type: 'select', options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'critical', label: 'Critical' }
    ]},
    { key: 'description', label: 'Description', type: 'textarea', fullWidth: true, defaultValue: 'Unexpected deviation detected in financial metrics requiring investigation', placeholder: 'Describe the anomaly...' },
    { key: 'affected_metric', label: 'Affected Metric', type: 'text', defaultValue: 'Monthly Revenue', placeholder: 'e.g., Monthly Revenue' },
    { key: 'expected_value', label: 'Expected Value ($)', type: 'number', defaultValue: '100000', placeholder: '0.00' },
    { key: 'actual_value', label: 'Actual Value ($)', type: 'number', defaultValue: '75000', placeholder: '0.00' },
    { key: 'detection_date', label: 'Detection Date', type: 'date' },
    { key: 'resolution_status', label: 'Resolution Status', type: 'select', defaultValue: 'open', options: [
      { value: 'open', label: 'Open' },
      { value: 'investigating', label: 'Investigating' },
      { value: 'resolved', label: 'Resolved' }
    ]}
  ];

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Anomaly Detections</h3>
          <button className="btn btn-primary" onClick={() => setFormModalOpen(true)}>Report Anomaly</button>
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
        title="Anomaly Detection Details"
        data={selectedItem || {}}
        fields={detailFields}
        aiField="ai_explanation"
        onAiAnalyze={handleAiAnalyze}
        analyzing={analyzing}
      />

      <FormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title="Report Anomaly"
        fields={formFields}
        onSubmit={handleCreate}
      />
    </div>
  );
}

export default AnomalyDetections;
