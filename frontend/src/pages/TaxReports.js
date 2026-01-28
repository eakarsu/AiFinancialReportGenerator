import React, { useState, useEffect } from 'react';
import { getTaxReports, getTaxReport, createTaxReport, deleteTaxReport, getCompanies, analyzeTaxReport } from '../services/api';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const columns = [
  { key: 'company_name', label: 'Company' },
  { key: 'tax_type', label: 'Tax Type' },
  { key: 'tax_period', label: 'Period' },
  { key: 'taxable_income', label: 'Taxable Income', render: (val) => val ? `$${parseFloat(val).toLocaleString()}` : 'N/A' },
  { key: 'tax_liability', label: 'Tax Liability', render: (val) => val ? `$${parseFloat(val).toLocaleString()}` : 'N/A' },
  { key: 'effective_rate', label: 'Effective Rate', render: (val) => val ? `${val}%` : 'N/A' },
  { key: 'filing_status', label: 'Status', render: (val) => (
    <span className={`badge ${val === 'filed' ? 'badge-success' : val === 'pending' ? 'badge-warning' : val === 'overdue' ? 'badge-danger' : 'badge-gray'}`}>
      {val}
    </span>
  )},
  { key: 'due_date', label: 'Due Date', render: (val) => val ? new Date(val).toLocaleDateString() : 'N/A' }
];

const detailFields = [
  { key: 'company_name', label: 'Company', type: 'text' },
  { key: 'tax_type', label: 'Tax Type', type: 'text' },
  { key: 'tax_period', label: 'Tax Period', type: 'text' },
  { key: 'taxable_income', label: 'Taxable Income', type: 'currency', large: true },
  { key: 'tax_liability', label: 'Tax Liability', type: 'currency', large: true },
  { key: 'deductions', label: 'Deductions', type: 'currency' },
  { key: 'credits', label: 'Credits', type: 'currency' },
  { key: 'effective_rate', label: 'Effective Tax Rate', type: 'percentage' },
  { key: 'filing_status', label: 'Filing Status', type: 'badge', statusMap: { pending: 'badge-warning', filed: 'badge-success', overdue: 'badge-danger' } },
  { key: 'due_date', label: 'Due Date', type: 'date' },
  { key: 'created_at', label: 'Created', type: 'datetime' },
];

function TaxReports() {
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
      const response = await getTaxReports();
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
      const response = await getTaxReport(row.id);
      setSelectedItem(response.data);
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching details:', error);
    }
  };

  const handleCreate = async (formData) => {
    await createTaxReport(formData);
    fetchData();
  };

  const handleAiAnalyze = async () => {
    if (!selectedItem) return;
    setAnalyzing(true);
    try {
      const response = await analyzeTaxReport(selectedItem.id);
      setSelectedItem({ ...selectedItem, ai_optimization_suggestions: response.data.analysis });
    } catch (error) {
      console.error('Error analyzing:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteTaxReport(id);
    fetchData();
  };

  const formFields = [
    { key: 'company_id', label: 'Company', type: 'select', options: companies.map(c => ({ value: c.id, label: c.name })) },
    { key: 'tax_type', label: 'Tax Type', type: 'select', options: [
      { value: 'Federal Income Tax', label: 'Federal Income Tax' },
      { value: 'State Income Tax', label: 'State Income Tax' },
      { value: 'Sales Tax', label: 'Sales Tax' },
      { value: 'Payroll Tax', label: 'Payroll Tax' },
      { value: 'Property Tax', label: 'Property Tax' },
      { value: 'Excise Tax', label: 'Excise Tax' },
      { value: 'VAT', label: 'Value Added Tax (VAT)' },
      { value: 'Estimated Tax', label: 'Estimated Quarterly Tax' }
    ]},
    { key: 'tax_period', label: 'Tax Period', type: 'select', options: [
      { value: 'Q1 2024', label: 'Q1 2024' },
      { value: 'Q2 2024', label: 'Q2 2024' },
      { value: 'Q3 2024', label: 'Q3 2024' },
      { value: 'Q4 2024', label: 'Q4 2024' },
      { value: 'FY 2024', label: 'Full Year 2024' }
    ]},
    { key: 'taxable_income', label: 'Taxable Income ($)', type: 'number', defaultValue: '500000', placeholder: '0.00' },
    { key: 'tax_liability', label: 'Tax Liability ($)', type: 'number', defaultValue: '125000', placeholder: '0.00' },
    { key: 'deductions', label: 'Deductions ($)', type: 'number', defaultValue: '50000', placeholder: '0.00' },
    { key: 'credits', label: 'Tax Credits ($)', type: 'number', defaultValue: '10000', placeholder: '0.00' },
    { key: 'effective_rate', label: 'Effective Rate (%)', type: 'number', defaultValue: '25', placeholder: '0.00' },
    { key: 'filing_status', label: 'Filing Status', type: 'select', defaultValue: 'pending', options: [
      { value: 'pending', label: 'Pending' },
      { value: 'filed', label: 'Filed' },
      { value: 'overdue', label: 'Overdue' }
    ]},
    { key: 'due_date', label: 'Due Date', type: 'date' }
  ];

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Tax Reports</h3>
          <button className="btn btn-primary" onClick={() => setFormModalOpen(true)}>Add Tax Report</button>
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
        title="Tax Report Details"
        data={selectedItem || {}}
        fields={detailFields}
        aiField="ai_optimization_suggestions"
        onAiAnalyze={handleAiAnalyze}
        analyzing={analyzing}
        onDelete={handleDelete}
      />

      <FormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title="Add Tax Report"
        fields={formFields}
        onSubmit={handleCreate}
      />
    </div>
  );
}

export default TaxReports;
