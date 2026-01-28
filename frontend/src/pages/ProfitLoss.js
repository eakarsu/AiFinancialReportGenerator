import React, { useState, useEffect } from 'react';
import { getProfitLossRecords, getProfitLossRecord, createProfitLossRecord, deleteProfitLossRecord, getCompanies, analyzeProfitLoss } from '../services/api';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const columns = [
  { key: 'company_name', label: 'Company' },
  { key: 'period', label: 'Period' },
  { key: 'revenue', label: 'Revenue', render: (val) => val ? `$${parseFloat(val).toLocaleString()}` : 'N/A' },
  { key: 'gross_profit', label: 'Gross Profit', render: (val) => val ? `$${parseFloat(val).toLocaleString()}` : 'N/A' },
  { key: 'operating_income', label: 'Operating Income', render: (val) => val ? `$${parseFloat(val).toLocaleString()}` : 'N/A' },
  { key: 'net_income', label: 'Net Income', render: (val) => {
    if (!val) return 'N/A';
    const num = parseFloat(val);
    return <span style={{ color: num >= 0 ? '#10b981' : '#ef4444' }}>${num.toLocaleString()}</span>;
  }}
];

const detailFields = [
  { key: 'company_name', label: 'Company', type: 'text' },
  { key: 'period', label: 'Period', type: 'text' },
  { key: 'revenue', label: 'Total Revenue', type: 'currency', large: true },
  { key: 'cost_of_goods_sold', label: 'Cost of Goods Sold', type: 'currency' },
  { key: 'gross_profit', label: 'Gross Profit', type: 'currency', large: true },
  { key: 'operating_expenses', label: 'Operating Expenses', type: 'currency' },
  { key: 'operating_income', label: 'Operating Income', type: 'currency', large: true },
  { key: 'net_income', label: 'Net Income', type: 'currency', large: true },
  { key: 'earnings_per_share', label: 'EPS', type: 'currency' },
  { key: 'created_at', label: 'Created', type: 'datetime' },
];

function ProfitLoss() {
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
      const response = await getProfitLossRecords();
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
      const response = await getProfitLossRecord(row.id);
      setSelectedItem(response.data);
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching details:', error);
    }
  };

  const handleCreate = async (formData) => {
    await createProfitLossRecord(formData);
    fetchData();
  };

  const handleAiAnalyze = async () => {
    if (!selectedItem) return;
    setAnalyzing(true);
    try {
      const response = await analyzeProfitLoss(selectedItem.id);
      setSelectedItem({ ...selectedItem, ai_insights: response.data.analysis });
    } catch (error) {
      console.error('Error analyzing:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteProfitLossRecord(id);
    fetchData();
  };

  const formFields = [
    { key: 'company_id', label: 'Company', type: 'select', options: companies.map(c => ({ value: c.id, label: c.name })) },
    { key: 'period', label: 'Period', type: 'select', options: [
      { value: 'Q1 2024', label: 'Q1 2024' },
      { value: 'Q2 2024', label: 'Q2 2024' },
      { value: 'Q3 2024', label: 'Q3 2024' },
      { value: 'Q4 2024', label: 'Q4 2024' },
      { value: 'FY 2024', label: 'Full Year 2024' }
    ]},
    { key: 'revenue', label: 'Total Revenue ($)', type: 'number', defaultValue: '1000000', placeholder: '0.00' },
    { key: 'cost_of_goods_sold', label: 'Cost of Goods Sold ($)', type: 'number', defaultValue: '400000', placeholder: '0.00' },
    { key: 'operating_expenses', label: 'Operating Expenses ($)', type: 'number', defaultValue: '300000', placeholder: '0.00' },
    { key: 'earnings_per_share', label: 'Earnings Per Share ($)', type: 'number', defaultValue: '2.50', step: '0.01', placeholder: '0.00' }
  ];

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Profit & Loss Statements</h3>
          <button className="btn btn-primary" onClick={() => setFormModalOpen(true)}>Add P&L Record</button>
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
        title="Profit & Loss Details"
        data={selectedItem || {}}
        fields={detailFields}
        aiField="ai_insights"
        onAiAnalyze={handleAiAnalyze}
        analyzing={analyzing}
        onDelete={handleDelete}
      />

      <FormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title="Add Profit & Loss Record"
        fields={formFields}
        onSubmit={handleCreate}
      />
    </div>
  );
}

export default ProfitLoss;
