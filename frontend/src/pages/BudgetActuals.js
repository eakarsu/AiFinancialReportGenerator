import React, { useState, useEffect } from 'react';
import { getBudgetActuals, getBudgetActual, createBudgetActual, analyzeBudgetActual, getCompanies, deleteBudgetActual } from '../services/api';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const columns = [
  { key: 'company_name', label: 'Company' },
  { key: 'department', label: 'Department' },
  { key: 'category', label: 'Category' },
  { key: 'period', label: 'Period' },
  { key: 'budgeted_amount', label: 'Budgeted', render: (val) => val ? `$${parseFloat(val).toLocaleString()}` : 'N/A' },
  { key: 'actual_amount', label: 'Actual', render: (val) => val ? `$${parseFloat(val).toLocaleString()}` : 'N/A' },
  { key: 'variance_percentage', label: 'Variance', render: (val) => {
    if (!val) return 'N/A';
    const num = parseFloat(val);
    return <span style={{ color: num <= 0 ? '#10b981' : '#ef4444' }}>{num > 0 ? '+' : ''}{num.toFixed(1)}%</span>;
  }},
  { key: 'status', label: 'Status', render: (val) => (
    <span className={`badge ${val === 'on_track' ? 'badge-success' : val === 'at_risk' ? 'badge-warning' : val === 'over_budget' ? 'badge-danger' : 'badge-gray'}`}>
      {val?.replace('_', ' ')}
    </span>
  )}
];

const detailFields = [
  { key: 'company_name', label: 'Company', type: 'text' },
  { key: 'department', label: 'Department', type: 'text' },
  { key: 'category', label: 'Category', type: 'text' },
  { key: 'period', label: 'Period', type: 'text' },
  { key: 'budgeted_amount', label: 'Budgeted Amount', type: 'currency', large: true },
  { key: 'actual_amount', label: 'Actual Amount', type: 'currency', large: true },
  { key: 'variance', label: 'Variance ($)', type: 'currency' },
  { key: 'variance_percentage', label: 'Variance (%)', type: 'percentage' },
  { key: 'status', label: 'Status', type: 'badge', statusMap: { on_track: 'badge-success', at_risk: 'badge-warning', over_budget: 'badge-danger' } },
  { key: 'created_at', label: 'Created', type: 'datetime' },
];

function BudgetActuals() {
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
      const response = await getBudgetActuals();
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
      const response = await getBudgetActual(row.id);
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
      const response = await analyzeBudgetActual(selectedItem.id);
      setSelectedItem({ ...selectedItem, ai_explanation: response.data.analysis });
    } catch (error) {
      console.error('Error analyzing:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreate = async (formData) => {
    await createBudgetActual(formData);
    fetchData();
  };

  const handleDelete = async (id) => {
    await deleteBudgetActual(id);
    fetchData();
  };

  const formFields = [
    { key: 'company_id', label: 'Company', type: 'select', options: companies.map(c => ({ value: c.id, label: c.name })) },
    { key: 'department', label: 'Department', type: 'select', options: [
      { value: 'Sales', label: 'Sales' },
      { value: 'Marketing', label: 'Marketing' },
      { value: 'Engineering', label: 'Engineering' },
      { value: 'Operations', label: 'Operations' },
      { value: 'Finance', label: 'Finance' },
      { value: 'HR', label: 'Human Resources' },
      { value: 'Legal', label: 'Legal' },
      { value: 'IT', label: 'IT' }
    ]},
    { key: 'category', label: 'Category', type: 'select', options: [
      { value: 'Salaries', label: 'Salaries' },
      { value: 'Equipment', label: 'Equipment' },
      { value: 'Software', label: 'Software' },
      { value: 'Travel', label: 'Travel' },
      { value: 'Marketing', label: 'Marketing' },
      { value: 'Utilities', label: 'Utilities' },
      { value: 'Other', label: 'Other' }
    ]},
    { key: 'period', label: 'Period', type: 'select', options: [
      { value: 'Q1 2024', label: 'Q1 2024' },
      { value: 'Q2 2024', label: 'Q2 2024' },
      { value: 'Q3 2024', label: 'Q3 2024' },
      { value: 'Q4 2024', label: 'Q4 2024' },
      { value: 'Q1 2025', label: 'Q1 2025' }
    ]},
    { key: 'budgeted_amount', label: 'Budgeted Amount ($)', type: 'number', defaultValue: '100000', placeholder: '0.00' },
    { key: 'actual_amount', label: 'Actual Amount ($)', type: 'number', defaultValue: '95000', placeholder: '0.00' },
    { key: 'status', label: 'Status', type: 'select', defaultValue: 'on_track', options: [
      { value: 'on_track', label: 'On Track' },
      { value: 'at_risk', label: 'At Risk' },
      { value: 'over_budget', label: 'Over Budget' }
    ]}
  ];

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Budget vs Actuals</h3>
          <button className="btn btn-primary" onClick={() => setFormModalOpen(true)}>Add Budget Item</button>
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
        title="Budget vs Actual Details"
        data={selectedItem || {}}
        fields={detailFields}
        aiField="ai_explanation"
        onAiAnalyze={handleAiAnalyze}
        analyzing={analyzing}
        onDelete={handleDelete}
      />

      <FormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title="Add Budget Item"
        fields={formFields}
        onSubmit={handleCreate}
      />
    </div>
  );
}

export default BudgetActuals;
