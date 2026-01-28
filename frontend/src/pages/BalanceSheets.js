import React, { useState, useEffect } from 'react';
import { getBalanceSheets, getBalanceSheet, createBalanceSheet, getCompanies, analyzeBalanceSheet, deleteBalanceSheet } from '../services/api';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const columns = [
  { key: 'company_name', label: 'Company' },
  { key: 'as_of_date', label: 'As Of Date', render: (val) => new Date(val).toLocaleDateString() },
  { key: 'total_assets', label: 'Total Assets', render: (val) => val ? `$${parseFloat(val).toLocaleString()}` : 'N/A' },
  { key: 'total_liabilities', label: 'Total Liabilities', render: (val) => val ? `$${parseFloat(val).toLocaleString()}` : 'N/A' },
  { key: 'shareholders_equity', label: 'Equity', render: (val) => val ? `$${parseFloat(val).toLocaleString()}` : 'N/A' },
  { key: 'ai_health_score', label: 'Health Score', render: (val) => val ? (
    <span className={`badge ${val >= 80 ? 'badge-success' : val >= 60 ? 'badge-warning' : 'badge-danger'}`}>
      {val}/100
    </span>
  ) : 'N/A' }
];

const detailFields = [
  { key: 'company_name', label: 'Company', type: 'text' },
  { key: 'as_of_date', label: 'As Of Date', type: 'date' },
  { key: 'total_assets', label: 'Total Assets', type: 'currency', large: true },
  { key: 'current_assets', label: 'Current Assets', type: 'currency' },
  { key: 'fixed_assets', label: 'Fixed Assets', type: 'currency' },
  { key: 'total_liabilities', label: 'Total Liabilities', type: 'currency', large: true },
  { key: 'current_liabilities', label: 'Current Liabilities', type: 'currency' },
  { key: 'long_term_liabilities', label: 'Long-term Liabilities', type: 'currency' },
  { key: 'shareholders_equity', label: 'Shareholders Equity', type: 'currency', large: true },
  { key: 'retained_earnings', label: 'Retained Earnings', type: 'currency' },
  { key: 'ai_health_score', label: 'AI Health Score', type: 'text' },
  { key: 'created_at', label: 'Created', type: 'datetime' },
];

function BalanceSheets() {
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
      const response = await getBalanceSheets();
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
      const response = await getBalanceSheet(row.id);
      setSelectedItem(response.data);
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching details:', error);
    }
  };

  const handleCreate = async (formData) => {
    await createBalanceSheet(formData);
    fetchData();
  };

  const handleAiAnalyze = async () => {
    if (!selectedItem) return;
    setAnalyzing(true);
    try {
      const response = await analyzeBalanceSheet(selectedItem.id);
      setSelectedItem({ ...selectedItem, ai_analysis: response.data.analysis });
    } catch (error) {
      console.error('Error analyzing:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteBalanceSheet(id);
    fetchData();
  };

  const formFields = [
    { key: 'company_id', label: 'Company', type: 'select', options: companies.map(c => ({ value: c.id, label: c.name })) },
    { key: 'as_of_date', label: 'As Of Date', type: 'date' },
    { key: 'total_assets', label: 'Total Assets ($)', type: 'number', defaultValue: '5000000', placeholder: '0.00' },
    { key: 'current_assets', label: 'Current Assets ($)', type: 'number', defaultValue: '2000000', placeholder: '0.00' },
    { key: 'fixed_assets', label: 'Fixed Assets ($)', type: 'number', defaultValue: '3000000', placeholder: '0.00' },
    { key: 'total_liabilities', label: 'Total Liabilities ($)', type: 'number', defaultValue: '2000000', placeholder: '0.00' },
    { key: 'current_liabilities', label: 'Current Liabilities ($)', type: 'number', defaultValue: '800000', placeholder: '0.00' },
    { key: 'long_term_liabilities', label: 'Long-term Liabilities ($)', type: 'number', defaultValue: '1200000', placeholder: '0.00' },
    { key: 'shareholders_equity', label: 'Shareholders Equity ($)', type: 'number', defaultValue: '3000000', placeholder: '0.00' },
    { key: 'retained_earnings', label: 'Retained Earnings ($)', type: 'number', defaultValue: '1500000', placeholder: '0.00' }
  ];

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Balance Sheets</h3>
          <button className="btn btn-primary" onClick={() => setFormModalOpen(true)}>Add Balance Sheet</button>
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
        title="Balance Sheet Details"
        data={selectedItem || {}}
        fields={detailFields}
        aiField="ai_analysis"
        onAiAnalyze={handleAiAnalyze}
        analyzing={analyzing}
        onDelete={handleDelete}
      />

      <FormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title="Add Balance Sheet"
        fields={formFields}
        onSubmit={handleCreate}
      />
    </div>
  );
}

export default BalanceSheets;
