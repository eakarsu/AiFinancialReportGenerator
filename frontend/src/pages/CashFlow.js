import React, { useState, useEffect } from 'react';
import { getCashFlowRecords, getCashFlowRecord, createCashFlowRecord, getCompanies, analyzeCashFlow } from '../services/api';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const columns = [
  { key: 'company_name', label: 'Company' },
  { key: 'record_type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount', render: (val) => {
    const num = parseFloat(val);
    return <span style={{ color: num >= 0 ? '#10b981' : '#ef4444' }}>{num >= 0 ? '+' : ''}${num.toLocaleString()}</span>;
  }},
  { key: 'date', label: 'Date', render: (val) => new Date(val).toLocaleDateString() },
  { key: 'source', label: 'Source' }
];

const detailFields = [
  { key: 'company_name', label: 'Company', type: 'text' },
  { key: 'record_type', label: 'Record Type', type: 'text' },
  { key: 'category', label: 'Category', type: 'text' },
  { key: 'amount', label: 'Amount', type: 'currency', large: true },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'source', label: 'Source', type: 'text' },
  { key: 'description', label: 'Description', type: 'text', fullWidth: true },
  { key: 'created_at', label: 'Created', type: 'datetime' },
];

function CashFlow() {
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
      const response = await getCashFlowRecords();
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
      const response = await getCashFlowRecord(row.id);
      setSelectedItem(response.data);
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching details:', error);
    }
  };

  const handleCreate = async (formData) => {
    await createCashFlowRecord(formData);
    fetchData();
  };

  const handleAiAnalyze = async () => {
    if (!selectedItem) return;
    setAnalyzing(true);
    try {
      const response = await analyzeCashFlow(selectedItem.id);
      setSelectedItem({ ...selectedItem, ai_classification: response.data.analysis });
    } catch (error) {
      console.error('Error analyzing:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const formFields = [
    { key: 'company_id', label: 'Company', type: 'select', options: companies.map(c => ({ value: c.id, label: c.name })) },
    { key: 'record_type', label: 'Record Type', type: 'select', options: [
      { value: 'operating', label: 'Operating' },
      { value: 'investing', label: 'Investing' },
      { value: 'financing', label: 'Financing' }
    ]},
    { key: 'category', label: 'Category', type: 'select', options: [
      { value: 'Revenue', label: 'Revenue (Inflow)' },
      { value: 'Expense', label: 'Expense (Outflow)' },
      { value: 'Investment', label: 'Investment' },
      { value: 'Loan Payment', label: 'Loan Payment' },
      { value: 'Dividend', label: 'Dividend' },
      { value: 'Asset Sale', label: 'Asset Sale' },
      { value: 'Asset Purchase', label: 'Asset Purchase' }
    ]},
    { key: 'amount', label: 'Amount ($)', type: 'number', defaultValue: '25000', placeholder: 'Use negative for outflows' },
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'source', label: 'Source', type: 'text', defaultValue: 'Customer Payment', placeholder: 'e.g., Customer Payment, Vendor' },
    { key: 'description', label: 'Description', type: 'textarea', fullWidth: true, defaultValue: 'Sample cash flow record', placeholder: 'Describe this cash flow...' }
  ];

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Cash Flow Records</h3>
          <button className="btn btn-primary" onClick={() => setFormModalOpen(true)}>Add Record</button>
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
        title="Cash Flow Details"
        data={selectedItem || {}}
        fields={detailFields}
        aiField="ai_classification"
        onAiAnalyze={handleAiAnalyze}
        analyzing={analyzing}
      />

      <FormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title="Add Cash Flow Record"
        fields={formFields}
        onSubmit={handleCreate}
      />
    </div>
  );
}

export default CashFlow;
