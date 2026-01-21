import React, { useState, useEffect } from 'react';
import { getExpenseRecords, getExpenseRecord, createExpenseRecord, getCompanies, analyzeExpense } from '../services/api';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const columns = [
  { key: 'company_name', label: 'Company' },
  { key: 'category', label: 'Category' },
  { key: 'subcategory', label: 'Subcategory' },
  { key: 'amount', label: 'Amount', render: (val) => val ? `$${parseFloat(val).toLocaleString()}` : 'N/A' },
  { key: 'date', label: 'Date', render: (val) => new Date(val).toLocaleDateString() },
  { key: 'vendor', label: 'Vendor' },
  { key: 'status', label: 'Status', render: (val) => (
    <span className={`badge ${val === 'approved' ? 'badge-success' : val === 'pending' ? 'badge-warning' : val === 'rejected' ? 'badge-danger' : 'badge-gray'}`}>
      {val}
    </span>
  )}
];

const detailFields = [
  { key: 'company_name', label: 'Company', type: 'text' },
  { key: 'category', label: 'Category', type: 'text' },
  { key: 'subcategory', label: 'Subcategory', type: 'text' },
  { key: 'amount', label: 'Amount', type: 'currency', large: true },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'vendor', label: 'Vendor', type: 'text' },
  { key: 'description', label: 'Description', type: 'text', fullWidth: true },
  { key: 'status', label: 'Status', type: 'badge', statusMap: { approved: 'badge-success', pending: 'badge-warning', rejected: 'badge-danger' } },
  { key: 'created_at', label: 'Created', type: 'datetime' },
];

function ExpenseRecords() {
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
      const response = await getExpenseRecords();
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
      const response = await getExpenseRecord(row.id);
      setSelectedItem(response.data);
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching details:', error);
    }
  };

  const handleCreate = async (formData) => {
    await createExpenseRecord(formData);
    fetchData();
  };

  const handleAiAnalyze = async () => {
    if (!selectedItem) return;
    setAnalyzing(true);
    try {
      const response = await analyzeExpense(selectedItem.id);
      setSelectedItem({ ...selectedItem, ai_categorization: response.data.analysis });
    } catch (error) {
      console.error('Error analyzing:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const formFields = [
    { key: 'company_id', label: 'Company', type: 'select', options: companies.map(c => ({ value: c.id, label: c.name })) },
    { key: 'category', label: 'Category', type: 'select', options: [
      { value: 'Marketing', label: 'Marketing' },
      { value: 'Operations', label: 'Operations' },
      { value: 'Technology', label: 'Technology' },
      { value: 'Human Resources', label: 'Human Resources' },
      { value: 'Travel', label: 'Travel' },
      { value: 'Office Supplies', label: 'Office Supplies' },
      { value: 'Legal', label: 'Legal' },
      { value: 'R&D', label: 'R&D' },
      { value: 'Other', label: 'Other' }
    ]},
    { key: 'subcategory', label: 'Subcategory', type: 'text', defaultValue: 'General', placeholder: 'e.g., Digital Advertising' },
    { key: 'amount', label: 'Amount ($)', type: 'number', defaultValue: '5000', placeholder: '0.00' },
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'vendor', label: 'Vendor', type: 'text', defaultValue: 'Sample Vendor', placeholder: 'Vendor name' },
    { key: 'description', label: 'Description', type: 'textarea', fullWidth: true, defaultValue: 'Sample expense record', placeholder: 'Describe this expense...' },
    { key: 'status', label: 'Status', type: 'select', defaultValue: 'pending', options: [
      { value: 'pending', label: 'Pending Approval' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' }
    ]}
  ];

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Expense Records</h3>
          <button className="btn btn-primary" onClick={() => setFormModalOpen(true)}>Add Expense</button>
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
        title="Expense Details"
        data={selectedItem || {}}
        fields={detailFields}
        aiField="ai_categorization"
        onAiAnalyze={handleAiAnalyze}
        analyzing={analyzing}
      />

      <FormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title="Add Expense Record"
        fields={formFields}
        onSubmit={handleCreate}
      />
    </div>
  );
}

export default ExpenseRecords;
