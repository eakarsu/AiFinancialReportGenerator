import React, { useState, useEffect } from 'react';
import { getTrendAnalyses, getTrendAnalysis, createTrendAnalysis, getCompanies, analyzeTrendRecord, deleteTrendAnalysis } from '../services/api';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const columns = [
  { key: 'company_name', label: 'Company' },
  { key: 'metric_name', label: 'Metric' },
  { key: 'analysis_period', label: 'Period' },
  { key: 'trend_direction', label: 'Trend', render: (val) => (
    <span className={`badge ${val === 'upward' ? 'badge-success' : val === 'downward' ? 'badge-danger' : 'badge-gray'}`}>
      {val === 'upward' ? '↑ Upward' : val === 'downward' ? '↓ Downward' : '→ Stable'}
    </span>
  )},
  { key: 'growth_rate', label: 'Growth Rate', render: (val) => {
    if (!val) return 'N/A';
    const num = parseFloat(val);
    return <span style={{ color: num >= 0 ? '#10b981' : '#ef4444' }}>{num >= 0 ? '+' : ''}{num.toFixed(1)}%</span>;
  }},
  { key: 'seasonality_detected', label: 'Seasonality', render: (val) => val ? 'Yes' : 'No' },
  { key: 'forecast_next_period', label: 'Next Period Forecast', render: (val) => val ? `$${parseFloat(val).toLocaleString()}` : 'N/A' }
];

const detailFields = [
  { key: 'company_name', label: 'Company', type: 'text' },
  { key: 'metric_name', label: 'Metric Name', type: 'text' },
  { key: 'analysis_period', label: 'Analysis Period', type: 'text' },
  { key: 'trend_direction', label: 'Trend Direction', type: 'badge', statusMap: { upward: 'badge-success', downward: 'badge-danger', stable: 'badge-gray', volatile: 'badge-warning' } },
  { key: 'growth_rate', label: 'Growth Rate', type: 'percentage' },
  { key: 'seasonality_detected', label: 'Seasonality Detected', type: 'text' },
  { key: 'forecast_next_period', label: 'Next Period Forecast', type: 'currency', large: true },
  { key: 'created_at', label: 'Created', type: 'datetime' },
];

function TrendAnalyses() {
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
      const response = await getTrendAnalyses();
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
      const response = await getTrendAnalysis(row.id);
      setSelectedItem(response.data);
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching details:', error);
    }
  };

  const handleCreate = async (formData) => {
    await createTrendAnalysis(formData);
    fetchData();
  };

  const handleAiAnalyze = async () => {
    if (!selectedItem) return;
    setAnalyzing(true);
    try {
      const response = await analyzeTrendRecord(selectedItem.id);
      setSelectedItem({ ...selectedItem, ai_narrative: response.data.analysis });
    } catch (error) {
      console.error('Error analyzing:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteTrendAnalysis(id);
    fetchData();
  };

  const formFields = [
    { key: 'company_id', label: 'Company', type: 'select', options: companies.map(c => ({ value: c.id, label: c.name })) },
    { key: 'metric_name', label: 'Metric Name', type: 'select', options: [
      { value: 'Revenue', label: 'Revenue' },
      { value: 'Gross Profit', label: 'Gross Profit' },
      { value: 'Net Income', label: 'Net Income' },
      { value: 'Operating Expenses', label: 'Operating Expenses' },
      { value: 'EBITDA', label: 'EBITDA' },
      { value: 'Cash Flow', label: 'Cash Flow' },
      { value: 'Customer Acquisition', label: 'Customer Acquisition' },
      { value: 'Market Share', label: 'Market Share' }
    ]},
    { key: 'analysis_period', label: 'Analysis Period', type: 'select', options: [
      { value: 'Q1 2024', label: 'Q1 2024' },
      { value: 'Q2 2024', label: 'Q2 2024' },
      { value: 'Q3 2024', label: 'Q3 2024' },
      { value: 'Q4 2024', label: 'Q4 2024' },
      { value: 'YTD 2024', label: 'Year to Date 2024' },
      { value: 'FY 2024', label: 'Full Year 2024' }
    ]},
    { key: 'trend_direction', label: 'Trend Direction', type: 'select', options: [
      { value: 'upward', label: 'Upward' },
      { value: 'downward', label: 'Downward' },
      { value: 'stable', label: 'Stable' },
      { value: 'volatile', label: 'Volatile' }
    ]},
    { key: 'growth_rate', label: 'Growth Rate (%)', type: 'number', defaultValue: '12.5', placeholder: '0.00' },
    { key: 'seasonality_detected', label: 'Seasonality Detected', type: 'select', options: [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' }
    ]},
    { key: 'forecast_next_period', label: 'Next Period Forecast ($)', type: 'number', defaultValue: '550000', placeholder: '0.00' }
  ];

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Trend Analyses</h3>
          <button className="btn btn-primary" onClick={() => setFormModalOpen(true)}>New Analysis</button>
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
        title="Trend Analysis Details"
        data={selectedItem || {}}
        fields={detailFields}
        aiField="ai_narrative"
        onAiAnalyze={handleAiAnalyze}
        analyzing={analyzing}
        onDelete={handleDelete}
      />

      <FormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title="New Trend Analysis"
        fields={formFields}
        onSubmit={handleCreate}
      />
    </div>
  );
}

export default TrendAnalyses;
