import React, { useState, useEffect } from 'react';
import { getCustomReports, getCustomReport, createCustomReport, getCompanies, analyzeCustomReport } from '../services/api';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const columns = [
  { key: 'company_name', label: 'Company' },
  { key: 'report_name', label: 'Report Name' },
  { key: 'report_type', label: 'Type' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'last_generated', label: 'Last Generated', render: (val) => val ? new Date(val).toLocaleDateString() : 'Never' },
  { key: 'ai_generated', label: 'AI Generated', render: (val) => (
    <span className={`badge ${val ? 'badge-info' : 'badge-gray'}`}>
      {val ? 'Yes' : 'No'}
    </span>
  )},
  { key: 'created_by_name', label: 'Created By' }
];

const detailFields = [
  { key: 'company_name', label: 'Company', type: 'text' },
  { key: 'report_name', label: 'Report Name', type: 'text' },
  { key: 'report_type', label: 'Report Type', type: 'text' },
  { key: 'description', label: 'Description', type: 'text', fullWidth: true },
  { key: 'schedule', label: 'Schedule', type: 'text' },
  { key: 'last_generated', label: 'Last Generated', type: 'datetime' },
  { key: 'ai_generated', label: 'AI Generated', type: 'text' },
  { key: 'created_by_name', label: 'Created By', type: 'text' },
  { key: 'created_at', label: 'Created', type: 'datetime' },
];

function CustomReports() {
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
      const response = await getCustomReports();
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
      const response = await getCustomReport(row.id);
      setSelectedItem(response.data);
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching details:', error);
    }
  };

  const handleCreate = async (formData) => {
    await createCustomReport(formData);
    fetchData();
  };

  const handleAiAnalyze = async () => {
    if (!selectedItem) return;
    setAnalyzing(true);
    try {
      const response = await analyzeCustomReport(selectedItem.id);
      setSelectedItem({ ...selectedItem, ai_content: response.data.analysis });
    } catch (error) {
      console.error('Error analyzing:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const formFields = [
    { key: 'company_id', label: 'Company', type: 'select', options: companies.map(c => ({ value: c.id, label: c.name })) },
    { key: 'report_name', label: 'Report Name', type: 'text', defaultValue: 'Monthly Financial Summary', placeholder: 'Monthly Financial Summary' },
    { key: 'report_type', label: 'Report Type', type: 'select', options: [
      { value: 'financial_summary', label: 'Financial Summary' },
      { value: 'expense_analysis', label: 'Expense Analysis' },
      { value: 'revenue_breakdown', label: 'Revenue Breakdown' },
      { value: 'budget_variance', label: 'Budget Variance' },
      { value: 'kpi_dashboard', label: 'KPI Dashboard' },
      { value: 'cash_flow_analysis', label: 'Cash Flow Analysis' },
      { value: 'profitability_report', label: 'Profitability Report' }
    ]},
    { key: 'description', label: 'Description', type: 'textarea', fullWidth: true, defaultValue: 'Comprehensive financial overview including key metrics and trends', placeholder: 'Describe what this report includes...' },
    { key: 'schedule', label: 'Schedule', type: 'select', options: [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'on_demand', label: 'On Demand' }
    ]}
  ];

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Custom Reports</h3>
          <button className="btn btn-primary" onClick={() => setFormModalOpen(true)}>Create Report</button>
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
        title="Custom Report Details"
        data={selectedItem || {}}
        fields={detailFields}
        aiField="ai_content"
        onAiAnalyze={handleAiAnalyze}
        analyzing={analyzing}
      />

      <FormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title="Create Custom Report"
        fields={formFields}
        onSubmit={handleCreate}
      />
    </div>
  );
}

export default CustomReports;
