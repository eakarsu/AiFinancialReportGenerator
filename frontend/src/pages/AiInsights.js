import React, { useState, useEffect } from 'react';
import { getAiInsights, getAiInsight, createAiInsight, deleteAiInsight, getCompanies } from '../services/api';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const columns = [
  { key: 'company_name', label: 'Company' },
  { key: 'insight_type', label: 'Type' },
  { key: 'title', label: 'Title' },
  { key: 'impact_level', label: 'Impact', render: (val) => (
    <span className={`badge ${val === 'high' || val === 'critical' ? 'badge-danger' : val === 'medium' ? 'badge-warning' : 'badge-success'}`}>
      {val}
    </span>
  )},
  { key: 'confidence_score', label: 'Confidence', render: (val) => val ? `${val}%` : 'N/A' },
  { key: 'status', label: 'Status', render: (val) => (
    <span className={`badge ${val === 'new' ? 'badge-info' : val === 'acknowledged' ? 'badge-success' : 'badge-gray'}`}>
      {val}
    </span>
  )},
  { key: 'created_at', label: 'Generated', render: (val) => new Date(val).toLocaleDateString() }
];

const detailFields = [
  { key: 'company_name', label: 'Company', type: 'text' },
  { key: 'insight_type', label: 'Insight Type', type: 'text' },
  { key: 'title', label: 'Title', type: 'text', fullWidth: true },
  { key: 'description', label: 'Description', type: 'text', fullWidth: true },
  { key: 'impact_level', label: 'Impact Level', type: 'badge', statusMap: { low: 'badge-success', medium: 'badge-warning', high: 'badge-danger', critical: 'badge-danger' } },
  { key: 'confidence_score', label: 'Confidence Score', type: 'percentage' },
  { key: 'status', label: 'Status', type: 'badge', statusMap: { new: 'badge-info', acknowledged: 'badge-success', dismissed: 'badge-gray' } },
  { key: 'created_at', label: 'Generated', type: 'datetime' },
];

function AiInsights() {
  const [data, setData] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
    fetchCompanies();
  }, []);

  const fetchData = async () => {
    try {
      const response = await getAiInsights();
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
      const response = await getAiInsight(row.id);
      setSelectedItem(response.data);
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching details:', error);
    }
  };

  const handleCreate = async (formData) => {
    await createAiInsight(formData);
    fetchData();
  };

  const handleDelete = async (id) => {
    await deleteAiInsight(id);
    fetchData();
  };

  const formFields = [
    { key: 'company_id', label: 'Company', type: 'select', options: companies.map(c => ({ value: c.id, label: c.name })) },
    { key: 'insight_type', label: 'Insight Type', type: 'select', options: [
      { value: 'cost_optimization', label: 'Cost Optimization' },
      { value: 'revenue_opportunity', label: 'Revenue Opportunity' },
      { value: 'risk_alert', label: 'Risk Alert' },
      { value: 'trend_insight', label: 'Trend Insight' },
      { value: 'anomaly_finding', label: 'Anomaly Finding' },
      { value: 'compliance_warning', label: 'Compliance Warning' }
    ]},
    { key: 'title', label: 'Title', type: 'text', defaultValue: 'Cost Reduction Opportunity Identified', placeholder: 'Brief insight title' },
    { key: 'description', label: 'Description', type: 'textarea', fullWidth: true, defaultValue: 'Analysis indicates potential for significant cost savings in operational expenses', placeholder: 'Detailed description of the insight...' },
    { key: 'impact_level', label: 'Impact Level', type: 'select', options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'critical', label: 'Critical' }
    ]},
    { key: 'confidence_score', label: 'Confidence Score (%)', type: 'number', defaultValue: '85', placeholder: '85', min: 0, max: 100 },
    { key: 'status', label: 'Status', type: 'select', defaultValue: 'new', options: [
      { value: 'new', label: 'New' },
      { value: 'acknowledged', label: 'Acknowledged' },
      { value: 'resolved', label: 'Resolved' }
    ]}
  ];

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">AI Insights</h3>
          <button className="btn btn-primary" onClick={() => setFormModalOpen(true)}>Add Insight</button>
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
        title="AI Insight Details"
        data={selectedItem || {}}
        fields={detailFields}
        onDelete={handleDelete}
      />

      <FormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title="Add AI Insight"
        fields={formFields}
        onSubmit={handleCreate}
      />
    </div>
  );
}

export default AiInsights;
