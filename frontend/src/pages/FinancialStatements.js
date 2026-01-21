import React, { useState, useEffect } from 'react';
import { getFinancialStatements, getFinancialStatement, createFinancialStatement, analyzeStatement, getCompanies } from '../services/api';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const columns = [
  { key: 'company_name', label: 'Company' },
  { key: 'statement_type', label: 'Type' },
  { key: 'period_start', label: 'Period Start', render: (val) => new Date(val).toLocaleDateString() },
  { key: 'period_end', label: 'Period End', render: (val) => new Date(val).toLocaleDateString() },
  { key: 'total_revenue', label: 'Revenue', render: (val) => val ? `$${parseFloat(val).toLocaleString()}` : 'N/A' },
  { key: 'net_income', label: 'Net Income', render: (val) => val ? `$${parseFloat(val).toLocaleString()}` : 'N/A' },
  { key: 'status', label: 'Status', render: (val) => (
    <span className={`badge ${val === 'approved' ? 'badge-success' : val === 'draft' ? 'badge-warning' : 'badge-gray'}`}>
      {val}
    </span>
  )}
];

const detailFields = [
  { key: 'company_name', label: 'Company', type: 'text' },
  { key: 'statement_type', label: 'Statement Type', type: 'text' },
  { key: 'period_start', label: 'Period Start', type: 'date' },
  { key: 'period_end', label: 'Period End', type: 'date' },
  { key: 'total_revenue', label: 'Total Revenue', type: 'currency', large: true },
  { key: 'total_expenses', label: 'Total Expenses', type: 'currency', large: true },
  { key: 'net_income', label: 'Net Income', type: 'currency', large: true },
  { key: 'status', label: 'Status', type: 'badge', statusMap: { approved: 'badge-success', draft: 'badge-warning', pending: 'badge-info' } },
  { key: 'created_at', label: 'Created', type: 'datetime' },
  { key: 'updated_at', label: 'Last Updated', type: 'datetime' },
];

function FinancialStatements() {
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
      const response = await getFinancialStatements();
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
      const response = await getFinancialStatement(row.id);
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
      const response = await analyzeStatement(selectedItem.id);
      setSelectedItem({ ...selectedItem, ai_summary: response.data.analysis });
    } catch (error) {
      console.error('Error analyzing:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreate = async (formData) => {
    await createFinancialStatement(formData);
    fetchData();
  };

  const formFields = [
    { key: 'company_id', label: 'Company', type: 'select', options: companies.map(c => ({ value: c.id, label: c.name })) },
    { key: 'statement_type', label: 'Statement Type', type: 'select', options: [
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'annual', label: 'Annual' },
      { value: 'monthly', label: 'Monthly' }
    ]},
    { key: 'period_start', label: 'Period Start', type: 'date' },
    { key: 'period_end', label: 'Period End', type: 'date' },
    { key: 'total_revenue', label: 'Total Revenue ($)', type: 'number', defaultValue: '100000' },
    { key: 'total_expenses', label: 'Total Expenses ($)', type: 'number', defaultValue: '80000' },
    { key: 'net_income', label: 'Net Income ($)', type: 'number', defaultValue: '20000' },
    { key: 'status', label: 'Status', type: 'select', defaultValue: 'draft', options: [
      { value: 'draft', label: 'Draft' },
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' }
    ]}
  ];

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Financial Statements</h3>
          <button className="btn btn-primary" onClick={() => setFormModalOpen(true)}>Add Statement</button>
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
        title="Financial Statement Details"
        data={selectedItem || {}}
        fields={detailFields}
        aiField="ai_summary"
        onAiAnalyze={handleAiAnalyze}
        analyzing={analyzing}
      />

      <FormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title="Add Financial Statement"
        fields={formFields}
        onSubmit={handleCreate}
      />
    </div>
  );
}

export default FinancialStatements;
