import React, { useState, useEffect } from 'react';
import { getRevenueForecasts, getRevenueForecast, createRevenueForecast, updateRevenueForecast, getCompanies, analyzeRevenueForecast, deleteRevenueForecast } from '../services/api';
import { useToast } from '../components/Toast';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const columns = [
  { key: 'company_name', label: 'Company' },
  { key: 'forecast_name', label: 'Forecast Name' },
  { key: 'forecast_period', label: 'Period' },
  { key: 'predicted_revenue', label: 'Predicted Revenue', render: (val) => val ? `$${parseFloat(val).toLocaleString()}` : 'N/A' },
  { key: 'confidence_level', label: 'Confidence', render: (val) => val ? `${val}%` : 'N/A' },
  { key: 'model_used', label: 'Model' },
  { key: 'status', label: 'Status', render: (val) => (
    <span className={`badge ${val === 'approved' ? 'badge-success' : val === 'pending' ? 'badge-warning' : 'badge-gray'}`}>
      {val}
    </span>
  )}
];

const detailFields = [
  { key: 'company_name', label: 'Company', type: 'text' },
  { key: 'forecast_name', label: 'Forecast Name', type: 'text' },
  { key: 'forecast_period', label: 'Forecast Period', type: 'text' },
  { key: 'predicted_revenue', label: 'Predicted Revenue', type: 'currency', large: true },
  { key: 'confidence_level', label: 'Confidence Level', type: 'percentage' },
  { key: 'model_used', label: 'Model Used', type: 'text' },
  { key: 'assumptions', label: 'Assumptions', type: 'text', fullWidth: true },
  { key: 'status', label: 'Status', type: 'badge', statusMap: { approved: 'badge-success', pending: 'badge-warning', rejected: 'badge-danger' } },
  { key: 'created_at', label: 'Created', type: 'datetime' },
];

function RevenueForecasts() {
  const [data, setData] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchData();
    fetchCompanies();
  }, []);

  const fetchData = async () => {
    try {
      const response = await getRevenueForecasts();
      setData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load revenue forecasts');
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
      const response = await getRevenueForecast(row.id);
      setSelectedItem(response.data);
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching details:', error);
      toast.error('Failed to load record details');
    }
  };

  const handleCreate = async (formData) => {
    await createRevenueForecast(formData);
    toast.success('Revenue forecast created successfully!');
    fetchData();
  };

  const handleEdit = (item) => {
    setEditMode(true);
    setSelectedItem(item);
    setModalOpen(false);
    setFormModalOpen(true);
  };

  const handleUpdate = async (formData) => {
    await updateRevenueForecast(selectedItem.id, formData);
    toast.success('Revenue forecast updated successfully!');
    setEditMode(false);
    fetchData();
  };

  const handleAiAnalyze = async () => {
    if (!selectedItem) return;
    setAnalyzing(true);
    try {
      const response = await analyzeRevenueForecast(selectedItem.id);
      setSelectedItem({ ...selectedItem, ai_analysis: response.data.analysis });
      toast.success('AI analysis completed and saved!');
    } catch (error) {
      console.error('Error analyzing:', error);
      toast.error('AI analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteRevenueForecast(id);
    toast.success('Revenue forecast deleted successfully!');
    fetchData();
  };

  const formFields = [
    { key: 'company_id', label: 'Company', type: 'select', options: companies.map(c => ({ value: c.id, label: c.name })) },
    { key: 'forecast_name', label: 'Forecast Name', type: 'text', defaultValue: 'Q1 2025 Revenue Forecast', placeholder: 'Q1 2025 Revenue Forecast' },
    { key: 'forecast_period', label: 'Forecast Period', type: 'select', options: [
      { value: 'Q1 2025', label: 'Q1 2025' },
      { value: 'Q2 2025', label: 'Q2 2025' },
      { value: 'Q3 2025', label: 'Q3 2025' },
      { value: 'Q4 2025', label: 'Q4 2025' },
      { value: 'FY 2025', label: 'Full Year 2025' }
    ]},
    { key: 'predicted_revenue', label: 'Predicted Revenue ($)', type: 'number', defaultValue: '500000', placeholder: '0.00' },
    { key: 'confidence_level', label: 'Confidence Level (%)', type: 'number', defaultValue: '85', placeholder: '85', min: 0, max: 100 },
    { key: 'model_used', label: 'Forecasting Model', type: 'select', options: [
      { value: 'Linear Regression', label: 'Linear Regression' },
      { value: 'ARIMA', label: 'ARIMA' },
      { value: 'Prophet', label: 'Prophet' },
      { value: 'Neural Network', label: 'Neural Network' },
      { value: 'Manual', label: 'Manual Estimation' }
    ]},
    { key: 'assumptions', label: 'Assumptions', type: 'textarea', fullWidth: true, defaultValue: 'Based on historical growth trends and market conditions', placeholder: 'Enter key assumptions for this forecast...' },
    { key: 'status', label: 'Status', type: 'select', defaultValue: 'pending', options: [
      { value: 'pending', label: 'Pending Review' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' }
    ]}
  ];

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Revenue Forecasts</h3>
          <button className="btn btn-primary" onClick={() => { setEditMode(false); setFormModalOpen(true); }}>Add Forecast</button>
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
        title="Revenue Forecast Details"
        data={selectedItem || {}}
        fields={detailFields}
        aiField="ai_analysis"
        onAiAnalyze={handleAiAnalyze}
        analyzing={analyzing}
        onDelete={handleDelete}
        onEdit={handleEdit}
      />

      <FormModal
        isOpen={formModalOpen}
        onClose={() => { setFormModalOpen(false); setEditMode(false); }}
        title={editMode ? 'Edit Revenue Forecast' : 'Add Revenue Forecast'}
        fields={formFields}
        onSubmit={editMode ? handleUpdate : handleCreate}
        initialData={editMode ? selectedItem : {}}
      />
    </div>
  );
}

export default RevenueForecasts;
