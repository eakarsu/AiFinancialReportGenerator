import React, { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileCode,
  Package,
  Check,
  RefreshCw,
  Building
} from 'lucide-react';
import * as api from '../services/api';

function ExportData() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [exporting, setExporting] = useState({});
  const [exportSuccess, setExportSuccess] = useState({});

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await api.getCompanies();
      setCompanies(response.data);
      if (response.data.length > 0) {
        setSelectedCompany(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const handleExport = async (type, format) => {
    const key = `${type}-${format}`;
    setExporting({ ...exporting, [key]: true });

    try {
      let url = '';
      let filename = '';

      switch (type) {
        case 'financial-statements':
          url = `/export/financial-statements/${selectedCompany}?format=${format}`;
          filename = `financial-statements.${format}`;
          break;
        case 'balance-sheets':
          url = `/export/balance-sheets/${selectedCompany}?format=${format}`;
          filename = `balance-sheets.${format}`;
          break;
        case 'profit-loss':
          url = `/export/profit-loss/${selectedCompany}?format=${format}`;
          filename = `profit-loss.${format}`;
          break;
        case 'comprehensive-report':
          url = `/export/comprehensive-report/${selectedCompany}`;
          filename = 'financial-report.html';
          break;
        case 'all-data':
          url = `/export/all-data/${selectedCompany}`;
          filename = 'company-data-export.json';
          break;
        default:
          return;
      }

      const response = await api.default.get(url, { responseType: 'blob' });

      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setExportSuccess({ ...exportSuccess, [key]: true });
      setTimeout(() => {
        setExportSuccess({ ...exportSuccess, [key]: false });
      }, 3000);
    } catch (error) {
      console.error('Error exporting:', error);
    } finally {
      setExporting({ ...exporting, [key]: false });
    }
  };

  const exportOptions = [
    {
      title: 'Financial Statements',
      description: 'Export all financial statements including revenue, expenses, and net income',
      icon: FileText,
      type: 'financial-statements',
      formats: ['csv', 'json'],
      color: '#3b82f6'
    },
    {
      title: 'Balance Sheets',
      description: 'Export balance sheet data including assets, liabilities, and equity',
      icon: FileSpreadsheet,
      type: 'balance-sheets',
      formats: ['csv', 'json'],
      color: '#22c55e'
    },
    {
      title: 'Profit & Loss',
      description: 'Export P&L records with revenue, COGS, and profit margins',
      icon: FileSpreadsheet,
      type: 'profit-loss',
      formats: ['csv', 'json'],
      color: '#f59e0b'
    },
    {
      title: 'Comprehensive Report',
      description: 'Generate a full HTML report with executive summary, charts, and KPIs',
      icon: FileText,
      type: 'comprehensive-report',
      formats: ['html'],
      color: '#8b5cf6'
    },
    {
      title: 'Full Data Export',
      description: 'Export all company data as JSON for backup or data transfer',
      icon: Package,
      type: 'all-data',
      formats: ['json'],
      color: '#ec4899'
    }
  ];

  const getFormatIcon = (format) => {
    switch (format) {
      case 'csv':
        return <FileSpreadsheet size={16} />;
      case 'json':
        return <FileCode size={16} />;
      case 'html':
        return <FileText size={16} />;
      default:
        return <Download size={16} />;
    }
  };

  return (
    <div className="export-data-page">
      <div className="page-header">
        <div className="header-content">
          <h1><Download size={28} /> Export Data</h1>
          <p>Download your financial data in various formats</p>
        </div>
        <div className="header-actions">
          <div className="company-selector">
            <Building size={20} />
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="company-select"
            >
              {companies.map(company => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="export-grid">
        {exportOptions.map((option) => (
          <div key={option.type} className="export-card" style={{ borderColor: option.color }}>
            <div className="card-header">
              <div className="card-icon" style={{ backgroundColor: `${option.color}20`, color: option.color }}>
                <option.icon size={24} />
              </div>
              <div className="card-info">
                <h3>{option.title}</h3>
                <p>{option.description}</p>
              </div>
            </div>
            <div className="card-actions">
              {option.formats.map((format) => {
                const key = `${option.type}-${format}`;
                const isExporting = exporting[key];
                const isSuccess = exportSuccess[key];

                return (
                  <button
                    key={format}
                    className={`export-btn ${isSuccess ? 'success' : ''}`}
                    onClick={() => handleExport(option.type, format)}
                    disabled={isExporting || !selectedCompany}
                    style={{
                      borderColor: option.color,
                      color: isSuccess ? 'white' : option.color,
                      backgroundColor: isSuccess ? option.color : 'transparent'
                    }}
                  >
                    {isExporting ? (
                      <RefreshCw size={16} className="spinning" />
                    ) : isSuccess ? (
                      <Check size={16} />
                    ) : (
                      getFormatIcon(format)
                    )}
                    {isSuccess ? 'Downloaded!' : format.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="export-info">
        <h3>Export Formats</h3>
        <div className="format-info-grid">
          <div className="format-info">
            <FileSpreadsheet size={24} />
            <div>
              <h4>CSV Format</h4>
              <p>Comma-separated values format, compatible with Excel, Google Sheets, and other spreadsheet applications.</p>
            </div>
          </div>
          <div className="format-info">
            <FileCode size={24} />
            <div>
              <h4>JSON Format</h4>
              <p>JavaScript Object Notation, ideal for data transfer between systems and API integrations.</p>
            </div>
          </div>
          <div className="format-info">
            <FileText size={24} />
            <div>
              <h4>HTML Report</h4>
              <p>Formatted HTML report that can be opened in any browser and easily converted to PDF.</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .export-data-page {
          padding: 0;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-content h1 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 0 0.5rem 0;
          color: #f1f5f9;
        }

        .header-content p {
          color: #94a3b8;
          margin: 0;
        }

        .company-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 0.5rem;
          color: #94a3b8;
        }

        .company-select {
          background: transparent;
          border: none;
          color: #f1f5f9;
          font-size: 1rem;
          min-width: 200px;
          cursor: pointer;
        }

        .company-select:focus {
          outline: none;
        }

        .export-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .export-card {
          background: #1e293b;
          border: 2px solid;
          border-radius: 0.75rem;
          padding: 1.5rem;
          transition: all 0.2s;
        }

        .export-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .card-header {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .card-icon {
          width: 50px;
          height: 50px;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .card-info h3 {
          margin: 0 0 0.5rem 0;
          color: #f1f5f9;
        }

        .card-info p {
          margin: 0;
          color: #94a3b8;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .card-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .export-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border: 2px solid;
          border-radius: 0.5rem;
          background: transparent;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .export-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .export-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .export-btn.success {
          animation: pulse 0.3s ease;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .export-info {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 0.75rem;
          padding: 1.5rem;
        }

        .export-info h3 {
          color: #f1f5f9;
          margin: 0 0 1rem 0;
        }

        .format-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .format-info {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: #0f172a;
          border-radius: 0.5rem;
        }

        .format-info svg {
          color: #3b82f6;
          flex-shrink: 0;
        }

        .format-info h4 {
          margin: 0 0 0.5rem 0;
          color: #f1f5f9;
        }

        .format-info p {
          margin: 0;
          color: #94a3b8;
          font-size: 0.85rem;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}

export default ExportData;
