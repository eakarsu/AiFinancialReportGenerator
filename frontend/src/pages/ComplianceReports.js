import React, { useState, useEffect } from 'react';
import { getComplianceReports, getComplianceReport, createComplianceReport, getCompanies, analyzeComplianceReport } from '../services/api';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const columns = [
  { key: 'company_name', label: 'Company' },
  { key: 'regulation_type', label: 'Regulation' },
  { key: 'report_period', label: 'Period' },
  { key: 'compliance_status', label: 'Status', render: (val) => (
    <span className={`badge ${val === 'compliant' ? 'badge-success' : val === 'partially_compliant' ? 'badge-warning' : 'badge-danger'}`}>
      {val?.replace('_', ' ')}
    </span>
  )},
  { key: 'score', label: 'Score', render: (val) => val ? `${val}%` : 'N/A' },
  { key: 'due_date', label: 'Due Date', render: (val) => val ? new Date(val).toLocaleDateString() : 'N/A' },
  { key: 'submitted_date', label: 'Submitted', render: (val) => val ? new Date(val).toLocaleDateString() : 'Not Submitted' }
];

const detailFields = [
  { key: 'company_name', label: 'Company', type: 'text' },
  { key: 'regulation_type', label: 'Regulation Type', type: 'text' },
  { key: 'report_period', label: 'Report Period', type: 'text' },
  { key: 'compliance_status', label: 'Compliance Status', type: 'badge', statusMap: { compliant: 'badge-success', partially_compliant: 'badge-warning', non_compliant: 'badge-danger' } },
  { key: 'score', label: 'Compliance Score', type: 'percentage', large: true },
  { key: 'due_date', label: 'Due Date', type: 'date' },
  { key: 'submitted_date', label: 'Submitted Date', type: 'date' },
  { key: 'created_at', label: 'Created', type: 'datetime' },
];

function ComplianceReports() {
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
      const response = await getComplianceReports();
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
      const response = await getComplianceReport(row.id);
      setSelectedItem(response.data);
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching details:', error);
    }
  };

  const handleCreate = async (formData) => {
    await createComplianceReport(formData);
    fetchData();
  };

  const handleAiAnalyze = async () => {
    if (!selectedItem) return;
    setAnalyzing(true);
    try {
      const response = await analyzeComplianceReport(selectedItem.id);
      setSelectedItem({ ...selectedItem, ai_compliance_check: response.data.analysis });
    } catch (error) {
      console.error('Error analyzing:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const formFields = [
    { key: 'company_id', label: 'Company', type: 'select', options: companies.map(c => ({ value: c.id, label: c.name })) },
    { key: 'regulation_type', label: 'Regulation Type', type: 'select', options: [
      { value: 'SOX', label: 'SOX (Sarbanes-Oxley)' },
      { value: 'GAAP', label: 'GAAP' },
      { value: 'IFRS', label: 'IFRS' },
      { value: 'SEC', label: 'SEC Reporting' },
      { value: 'GDPR', label: 'GDPR' },
      { value: 'HIPAA', label: 'HIPAA' },
      { value: 'PCI-DSS', label: 'PCI-DSS' },
      { value: 'Internal', label: 'Internal Policy' }
    ]},
    { key: 'report_period', label: 'Report Period', type: 'select', options: [
      { value: 'Q1 2024', label: 'Q1 2024' },
      { value: 'Q2 2024', label: 'Q2 2024' },
      { value: 'Q3 2024', label: 'Q3 2024' },
      { value: 'Q4 2024', label: 'Q4 2024' },
      { value: 'FY 2024', label: 'Full Year 2024' }
    ]},
    { key: 'compliance_status', label: 'Compliance Status', type: 'select', options: [
      { value: 'compliant', label: 'Compliant' },
      { value: 'partially_compliant', label: 'Partially Compliant' },
      { value: 'non_compliant', label: 'Non-Compliant' }
    ]},
    { key: 'score', label: 'Compliance Score (%)', type: 'number', defaultValue: '95', placeholder: '0-100', min: 0, max: 100 },
    { key: 'due_date', label: 'Due Date', type: 'date' },
    { key: 'submitted_date', label: 'Submitted Date', type: 'date' }
  ];

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Compliance Reports</h3>
          <button className="btn btn-primary" onClick={() => setFormModalOpen(true)}>New Compliance Check</button>
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
        title="Compliance Report Details"
        data={selectedItem || {}}
        fields={detailFields}
        aiField="ai_compliance_check"
        onAiAnalyze={handleAiAnalyze}
        analyzing={analyzing}
      />

      <FormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title="New Compliance Report"
        fields={formFields}
        onSubmit={handleCreate}
      />
    </div>
  );
}

export default ComplianceReports;
