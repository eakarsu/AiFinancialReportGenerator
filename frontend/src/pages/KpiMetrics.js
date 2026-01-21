import React, { useState, useEffect } from 'react';
import { getKpiMetrics, getKpiMetric, createKpiMetric, getCompanies, analyzeKpi } from '../services/api';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const columns = [
  { key: 'company_name', label: 'Company' },
  { key: 'metric_name', label: 'Metric Name' },
  { key: 'metric_category', label: 'Category' },
  { key: 'current_value', label: 'Current', render: (val, row) => val ? `${parseFloat(val).toLocaleString()} ${row.unit || ''}` : 'N/A' },
  { key: 'target_value', label: 'Target', render: (val, row) => val ? `${parseFloat(val).toLocaleString()} ${row.unit || ''}` : 'N/A' },
  { key: 'trend', label: 'Trend', render: (val) => (
    <span className={`badge ${val === 'up' ? 'badge-success' : val === 'down' ? 'badge-danger' : 'badge-gray'}`}>
      {val === 'up' ? '↑ Up' : val === 'down' ? '↓ Down' : '→ Stable'}
    </span>
  )},
  { key: 'period', label: 'Period' }
];

const detailFields = [
  { key: 'company_name', label: 'Company', type: 'text' },
  { key: 'metric_name', label: 'Metric Name', type: 'text' },
  { key: 'metric_category', label: 'Category', type: 'text' },
  { key: 'current_value', label: 'Current Value', type: 'text', large: true },
  { key: 'target_value', label: 'Target Value', type: 'text' },
  { key: 'previous_value', label: 'Previous Value', type: 'text' },
  { key: 'unit', label: 'Unit', type: 'text' },
  { key: 'trend', label: 'Trend', type: 'badge', statusMap: { up: 'badge-success', down: 'badge-danger', stable: 'badge-gray' } },
  { key: 'period', label: 'Period', type: 'text' },
  { key: 'created_at', label: 'Created', type: 'datetime' },
];

function KpiMetrics() {
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
      const response = await getKpiMetrics();
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
      const response = await getKpiMetric(row.id);
      setSelectedItem(response.data);
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching details:', error);
    }
  };

  const handleCreate = async (formData) => {
    await createKpiMetric(formData);
    fetchData();
  };

  const handleAiAnalyze = async () => {
    if (!selectedItem) return;
    setAnalyzing(true);
    try {
      const response = await analyzeKpi(selectedItem.id);
      setSelectedItem({ ...selectedItem, ai_recommendation: response.data.analysis });
    } catch (error) {
      console.error('Error analyzing:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const formFields = [
    { key: 'company_id', label: 'Company', type: 'select', options: companies.map(c => ({ value: c.id, label: c.name })) },
    { key: 'metric_name', label: 'Metric Name', type: 'select', options: [
      { value: 'Revenue Growth', label: 'Revenue Growth' },
      { value: 'Gross Margin', label: 'Gross Margin' },
      { value: 'Net Profit Margin', label: 'Net Profit Margin' },
      { value: 'Current Ratio', label: 'Current Ratio' },
      { value: 'Quick Ratio', label: 'Quick Ratio' },
      { value: 'Debt to Equity', label: 'Debt to Equity' },
      { value: 'ROE', label: 'Return on Equity (ROE)' },
      { value: 'ROA', label: 'Return on Assets (ROA)' },
      { value: 'Customer Acquisition Cost', label: 'Customer Acquisition Cost' },
      { value: 'Customer Lifetime Value', label: 'Customer Lifetime Value' },
      { value: 'Churn Rate', label: 'Churn Rate' },
      { value: 'EBITDA', label: 'EBITDA' }
    ]},
    { key: 'metric_category', label: 'Category', type: 'select', options: [
      { value: 'profitability', label: 'Profitability' },
      { value: 'liquidity', label: 'Liquidity' },
      { value: 'efficiency', label: 'Efficiency' },
      { value: 'growth', label: 'Growth' },
      { value: 'operational', label: 'Operational' }
    ]},
    { key: 'current_value', label: 'Current Value', type: 'number', defaultValue: '15', placeholder: '0.00' },
    { key: 'target_value', label: 'Target Value', type: 'number', defaultValue: '20', placeholder: '0.00' },
    { key: 'previous_value', label: 'Previous Value', type: 'number', defaultValue: '12', placeholder: '0.00' },
    { key: 'unit', label: 'Unit', type: 'select', options: [
      { value: '%', label: 'Percentage (%)' },
      { value: 'USD', label: 'US Dollars ($)' },
      { value: 'ratio', label: 'Ratio' },
      { value: 'days', label: 'Days' }
    ]},
    { key: 'trend', label: 'Trend', type: 'select', options: [
      { value: 'up', label: 'Upward' },
      { value: 'down', label: 'Downward' },
      { value: 'stable', label: 'Stable' }
    ]},
    { key: 'period', label: 'Period', type: 'select', options: [
      { value: 'Q1 2024', label: 'Q1 2024' },
      { value: 'Q2 2024', label: 'Q2 2024' },
      { value: 'Q3 2024', label: 'Q3 2024' },
      { value: 'Q4 2024', label: 'Q4 2024' }
    ]}
  ];

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">KPI Metrics</h3>
          <button className="btn btn-primary" onClick={() => setFormModalOpen(true)}>Add KPI</button>
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
        title="KPI Metric Details"
        data={selectedItem || {}}
        fields={detailFields}
        aiField="ai_recommendation"
        onAiAnalyze={handleAiAnalyze}
        analyzing={analyzing}
      />

      <FormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title="Add KPI Metric"
        fields={formFields}
        onSubmit={handleCreate}
      />
    </div>
  );
}

export default KpiMetrics;
