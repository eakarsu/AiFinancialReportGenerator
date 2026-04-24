import React, { useState, useEffect } from 'react';
import { getFinancialStatements, getFinancialStatement, createFinancialStatement, updateFinancialStatement, analyzeStatement, getCompanies, deleteFinancialStatement } from '../services/api';
import { useToast } from '../components/Toast';
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
  const [editMode, setEditMode] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const toast = useToast();

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
      toast.error('Failed to load financial statements');
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
      toast.error('Failed to load record details');
    }
  };

  const handleAiAnalyze = async () => {
    if (!selectedItem) return;
    setAnalyzing(true);
    try {
      const response = await analyzeStatement(selectedItem.id);
      setSelectedItem({ ...selectedItem, ai_summary: response.data.analysis });
      toast.success('AI analysis completed and saved!');
    } catch (error) {
      console.error('Error analyzing:', error);
      toast.error('AI analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreate = async (formData) => {
    await createFinancialStatement(formData);
    toast.success('Financial statement created successfully!');
    fetchData();
  };

  const handleEdit = (item) => {
    setEditMode(true);
    setSelectedItem(item);
    setModalOpen(false);
    setFormModalOpen(true);
  };

  const handleUpdate = async (formData) => {
    await updateFinancialStatement(selectedItem.id, formData);
    toast.success('Financial statement updated successfully!');
    setEditMode(false);
    fetchData();
  };

  const handleDelete = async (id) => {
    await deleteFinancialStatement(id);
    toast.success('Financial statement deleted successfully!');
    fetchData();
  };

  const formFields = [
    { key: 'company_id', label: 'Company', type: 'select', required: true, options: companies.map(c => ({ value: c.id, label: c.name })) },
    { key: 'statement_type', label: 'Statement Type', type: 'select', required: true, options: [
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'annual', label: 'Annual' },
      { value: 'monthly', label: 'Monthly' }
    ]},
    { key: 'period_start', label: 'Period Start', type: 'date', required: true },
    { key: 'period_end', label: 'Period End', type: 'date', required: true },
    { key: 'total_revenue', label: 'Total Revenue ($)', type: 'number', required: true, min: 0 },
    { key: 'total_expenses', label: 'Total Expenses ($)', type: 'number', required: true, min: 0 },
    { key: 'net_income', label: 'Net Income ($)', type: 'number', required: true },
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
          <button className="btn btn-primary" onClick={() => { setEditMode(false); setFormModalOpen(true); }}>Add Statement</button>
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
        onDelete={handleDelete}
        onEdit={handleEdit}
      />

      <FormModal
        isOpen={formModalOpen}
        onClose={() => { setFormModalOpen(false); setEditMode(false); }}
        title={editMode ? 'Edit Financial Statement' : 'Add Financial Statement'}
        fields={formFields}
        onSubmit={editMode ? handleUpdate : handleCreate}
        initialData={editMode ? selectedItem : {}}
      />
    </div>
  );
}

export default FinancialStatements;
