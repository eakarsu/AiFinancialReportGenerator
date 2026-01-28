import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Mail,
  Play,
  Pause,
  Trash2,
  Plus,
  RefreshCw,
  Check,
  X,
  History,
  FileText,
  AlertCircle,
  Edit
} from 'lucide-react';
import * as api from '../services/api';

function ScheduledReports() {
  const [reports, setReports] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [showHistory, setShowHistory] = useState(null);
  const [executionHistory, setExecutionHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [generating, setGenerating] = useState(null);
  const [formData, setFormData] = useState({
    company_id: '',
    report_name: '',
    report_type: 'financial_summary',
    schedule_frequency: 'weekly',
    schedule_day: 1,
    schedule_time: '09:00',
    recipients: [],
    include_sections: ['summary', 'balance_sheet', 'profit_loss', 'kpis'],
    format: 'pdf',
    is_active: true
  });
  const [recipientInput, setRecipientInput] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reportsRes, companiesRes] = await Promise.all([
        api.getScheduledReports(),
        api.getCompanies()
      ]);
      setReports(reportsRes.data);
      setCompanies(companiesRes.data);
      if (companiesRes.data.length > 0) {
        setFormData(prev => ({ ...prev, company_id: companiesRes.data[0].id }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingReport) {
        await api.updateScheduledReport(editingReport.id, formData);
      } else {
        await api.createScheduledReport(formData);
      }
      fetchData();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving report:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this scheduled report?')) {
      try {
        await api.deleteScheduledReport(id);
        fetchData();
      } catch (error) {
        console.error('Error deleting report:', error);
      }
    }
  };

  const handleToggleActive = async (report) => {
    try {
      await api.updateScheduledReport(report.id, { is_active: !report.is_active });
      fetchData();
    } catch (error) {
      console.error('Error toggling report:', error);
    }
  };

  const handleRunNow = async (id) => {
    setGenerating(id);
    try {
      const response = await api.runScheduledReport(id);
      setGeneratedReport(response.data.report);
      fetchData();
    } catch (error) {
      console.error('Error running report:', error);
      alert('Failed to generate report: ' + (error.response?.data?.error || error.message));
    } finally {
      setGenerating(null);
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'N/A';
    return '$' + num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const handleViewHistory = async (report) => {
    setShowHistory(report);
    try {
      const response = await api.getReportExecutionHistory(report.id);
      setExecutionHistory(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleEdit = (report) => {
    setEditingReport(report);
    setFormData({
      company_id: report.company_id,
      report_name: report.report_name,
      report_type: report.report_type,
      schedule_frequency: report.schedule_frequency,
      schedule_day: report.schedule_day || 1,
      schedule_time: report.schedule_time || '09:00',
      recipients: report.recipients || [],
      include_sections: report.include_sections || ['summary', 'balance_sheet', 'profit_loss', 'kpis'],
      format: report.format || 'pdf',
      is_active: report.is_active
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingReport(null);
    setFormData({
      company_id: companies[0]?.id || '',
      report_name: '',
      report_type: 'financial_summary',
      schedule_frequency: 'weekly',
      schedule_day: 1,
      schedule_time: '09:00',
      recipients: [],
      include_sections: ['summary', 'balance_sheet', 'profit_loss', 'kpis'],
      format: 'pdf',
      is_active: true
    });
    setRecipientInput('');
  };

  const addRecipient = () => {
    if (recipientInput && !formData.recipients.includes(recipientInput)) {
      setFormData({
        ...formData,
        recipients: [...formData.recipients, recipientInput]
      });
      setRecipientInput('');
    }
  };

  const removeRecipient = (email) => {
    setFormData({
      ...formData,
      recipients: formData.recipients.filter(r => r !== email)
    });
  };

  const toggleSection = (section) => {
    const sections = formData.include_sections.includes(section)
      ? formData.include_sections.filter(s => s !== section)
      : [...formData.include_sections, section];
    setFormData({ ...formData, include_sections: sections });
  };

  const formatNextRun = (dateStr) => {
    if (!dateStr) return 'Not scheduled';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const getFrequencyLabel = (freq) => {
    const labels = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly'
    };
    return labels[freq] || freq;
  };

  return (
    <div className="scheduled-reports-page">
      <div className="page-header">
        <div className="header-content">
          <h1><Calendar size={28} /> Scheduled Reports</h1>
          <p>Automate your financial reports with email delivery</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> New Schedule
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <RefreshCw size={40} className="spinning" />
          <p>Loading scheduled reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="empty-state">
          <Calendar size={60} />
          <h3>No Scheduled Reports</h3>
          <p>Create your first scheduled report to automate financial reporting</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Create Schedule
          </button>
        </div>
      ) : (
        <div className="reports-grid">
          {reports.map(report => (
            <div key={report.id} className={`report-card ${!report.is_active ? 'inactive' : ''}`}>
              <div className="card-header">
                <div className="report-status">
                  <span className={`status-badge ${report.is_active ? 'active' : 'paused'}`}>
                    {report.is_active ? 'Active' : 'Paused'}
                  </span>
                </div>
                <div className="card-actions">
                  <button className="icon-btn" onClick={() => handleEdit(report)} title="Edit">
                    <Edit size={16} />
                  </button>
                  <button className="icon-btn" onClick={() => handleViewHistory(report)} title="View History">
                    <History size={16} />
                  </button>
                  <button className="icon-btn danger" onClick={() => handleDelete(report.id)} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <h3>{report.report_name}</h3>
              <p className="company-name">{report.company_name}</p>

              <div className="report-details">
                <div className="detail-item">
                  <Clock size={16} />
                  <span>{getFrequencyLabel(report.schedule_frequency)} at {report.schedule_time}</span>
                </div>
                <div className="detail-item">
                  <Calendar size={16} />
                  <span>Next: {formatNextRun(report.next_run)}</span>
                </div>
                <div className="detail-item">
                  <Mail size={16} />
                  <span>{report.recipients?.length || 0} recipients</span>
                </div>
                <div className="detail-item">
                  <FileText size={16} />
                  <span>{report.format?.toUpperCase()} format</span>
                </div>
              </div>

              <div className="card-footer">
                <button
                  className={`btn btn-sm ${report.is_active ? 'btn-warning' : 'btn-success'}`}
                  onClick={() => handleToggleActive(report)}
                >
                  {report.is_active ? <Pause size={14} /> : <Play size={14} />}
                  {report.is_active ? 'Pause' : 'Activate'}
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleRunNow(report.id)}
                  disabled={!report.is_active || generating === report.id}
                >
                  {generating === report.id ? <RefreshCw size={14} className="spinning" /> : <Play size={14} />}
                  {generating === report.id ? 'Generating...' : 'Run Now'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingReport ? 'Edit Scheduled Report' : 'Create Scheduled Report'}</h2>
              <button className="close-btn" onClick={handleCloseModal}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Company</label>
                <select
                  value={formData.company_id}
                  onChange={e => setFormData({ ...formData, company_id: e.target.value })}
                  required
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Report Name</label>
                <input
                  type="text"
                  value={formData.report_name}
                  onChange={e => setFormData({ ...formData, report_name: e.target.value })}
                  placeholder="Monthly Financial Summary"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Report Type</label>
                  <select
                    value={formData.report_type}
                    onChange={e => setFormData({ ...formData, report_type: e.target.value })}
                  >
                    <option value="financial_summary">Financial Summary</option>
                    <option value="executive_report">Executive Report</option>
                    <option value="detailed_analysis">Detailed Analysis</option>
                    <option value="compliance_report">Compliance Report</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Format</label>
                  <select
                    value={formData.format}
                    onChange={e => setFormData({ ...formData, format: e.target.value })}
                  >
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                    <option value="html">HTML</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Frequency</label>
                  <select
                    value={formData.schedule_frequency}
                    onChange={e => setFormData({ ...formData, schedule_frequency: e.target.value })}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Time</label>
                  <input
                    type="time"
                    value={formData.schedule_time}
                    onChange={e => setFormData({ ...formData, schedule_time: e.target.value })}
                  />
                </div>

                {(formData.schedule_frequency === 'weekly') && (
                  <div className="form-group">
                    <label>Day of Week</label>
                    <select
                      value={formData.schedule_day}
                      onChange={e => setFormData({ ...formData, schedule_day: parseInt(e.target.value) })}
                    >
                      <option value={0}>Sunday</option>
                      <option value={1}>Monday</option>
                      <option value={2}>Tuesday</option>
                      <option value={3}>Wednesday</option>
                      <option value={4}>Thursday</option>
                      <option value={5}>Friday</option>
                      <option value={6}>Saturday</option>
                    </select>
                  </div>
                )}

                {(formData.schedule_frequency === 'monthly' || formData.schedule_frequency === 'quarterly') && (
                  <div className="form-group">
                    <label>Day of Month</label>
                    <input
                      type="number"
                      min="1"
                      max="28"
                      value={formData.schedule_day}
                      onChange={e => setFormData({ ...formData, schedule_day: parseInt(e.target.value) })}
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Recipients</label>
                <div className="recipient-input">
                  <input
                    type="email"
                    value={recipientInput}
                    onChange={e => setRecipientInput(e.target.value)}
                    placeholder="Enter email address"
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
                  />
                  <button type="button" onClick={addRecipient} className="btn btn-secondary">
                    <Plus size={16} />
                  </button>
                </div>
                <div className="recipients-list">
                  {formData.recipients.map(email => (
                    <span key={email} className="recipient-tag">
                      {email}
                      <button type="button" onClick={() => removeRecipient(email)}><X size={12} /></button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Include Sections</label>
                <div className="section-toggles">
                  {['summary', 'balance_sheet', 'profit_loss', 'kpis', 'trends', 'forecasts', 'compliance'].map(section => (
                    <label key={section} className="section-toggle">
                      <input
                        type="checkbox"
                        checked={formData.include_sections.includes(section)}
                        onChange={() => toggleSection(section)}
                      />
                      <span>{section.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingReport ? 'Update Schedule' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Execution History Modal */}
      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Execution History: {showHistory.report_name}</h2>
              <button className="close-btn" onClick={() => setShowHistory(null)}><X size={20} /></button>
            </div>
            <div className="history-list">
              {executionHistory.length === 0 ? (
                <div className="empty-history">
                  <History size={40} />
                  <p>No execution history yet</p>
                </div>
              ) : (
                executionHistory.map(log => (
                  <div key={log.id} className={`history-item ${log.status}`}>
                    <div className="history-status">
                      {log.status === 'completed' ? <Check size={20} /> :
                       log.status === 'running' ? <RefreshCw size={20} className="spinning" /> :
                       <AlertCircle size={20} />}
                    </div>
                    <div className="history-details">
                      <div className="history-time">{new Date(log.started_at).toLocaleString()}</div>
                      <div className="history-meta">
                        Status: {log.status}
                        {log.recipients_notified > 0 && ` | ${log.recipients_notified} recipients notified`}
                        {log.error_message && <span className="error-msg"> | {log.error_message}</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generated Report Modal */}
      {generatedReport && (
        <div className="modal-overlay" onClick={() => setGeneratedReport(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>Generated Report</h2>
              <button className="close-btn" onClick={() => setGeneratedReport(null)}><X size={20} /></button>
            </div>
            <div className="report-preview">
              <h3>{generatedReport.reportName}</h3>
              <p className="report-meta">
                {generatedReport.company?.name} | Generated: {new Date(generatedReport.generatedAt).toLocaleString()}
              </p>

              {generatedReport.sections?.summary && (
                <div className="report-section">
                  <h4>{generatedReport.sections.summary.title}</h4>
                  <div className="report-grid">
                    <div className="report-item">
                      <span className="label">Revenue</span>
                      <span className="value">{formatCurrency(generatedReport.sections.summary.revenue)}</span>
                    </div>
                    <div className="report-item">
                      <span className="label">Net Income</span>
                      <span className={`value ${generatedReport.sections.summary.netIncome >= 0 ? 'positive' : 'negative'}`}>
                        {formatCurrency(generatedReport.sections.summary.netIncome)}
                      </span>
                    </div>
                    <div className="report-item">
                      <span className="label">Total Assets</span>
                      <span className="value">{formatCurrency(generatedReport.sections.summary.totalAssets)}</span>
                    </div>
                    <div className="report-item">
                      <span className="label">Total Liabilities</span>
                      <span className="value">{formatCurrency(generatedReport.sections.summary.totalLiabilities)}</span>
                    </div>
                    <div className="report-item">
                      <span className="label">Equity</span>
                      <span className="value">{formatCurrency(generatedReport.sections.summary.equity)}</span>
                    </div>
                  </div>
                </div>
              )}

              {generatedReport.sections?.balanceSheet && (
                <div className="report-section">
                  <h4>{generatedReport.sections.balanceSheet.title}</h4>
                  <div className="report-grid">
                    <div className="report-item">
                      <span className="label">Current Assets</span>
                      <span className="value">{formatCurrency(generatedReport.sections.balanceSheet.currentAssets)}</span>
                    </div>
                    <div className="report-item">
                      <span className="label">Non-Current Assets</span>
                      <span className="value">{formatCurrency(generatedReport.sections.balanceSheet.nonCurrentAssets)}</span>
                    </div>
                    <div className="report-item">
                      <span className="label">Total Assets</span>
                      <span className="value">{formatCurrency(generatedReport.sections.balanceSheet.totalAssets)}</span>
                    </div>
                    <div className="report-item">
                      <span className="label">Current Liabilities</span>
                      <span className="value">{formatCurrency(generatedReport.sections.balanceSheet.currentLiabilities)}</span>
                    </div>
                    <div className="report-item">
                      <span className="label">Total Liabilities</span>
                      <span className="value">{formatCurrency(generatedReport.sections.balanceSheet.totalLiabilities)}</span>
                    </div>
                    <div className="report-item">
                      <span className="label">Equity</span>
                      <span className="value">{formatCurrency(generatedReport.sections.balanceSheet.equity)}</span>
                    </div>
                  </div>
                </div>
              )}

              {generatedReport.sections?.profitLoss && (
                <div className="report-section">
                  <h4>{generatedReport.sections.profitLoss.title}</h4>
                  <div className="report-grid">
                    <div className="report-item">
                      <span className="label">Revenue</span>
                      <span className="value">{formatCurrency(generatedReport.sections.profitLoss.revenue)}</span>
                    </div>
                    <div className="report-item">
                      <span className="label">Cost of Goods Sold</span>
                      <span className="value">{formatCurrency(generatedReport.sections.profitLoss.costOfGoodsSold)}</span>
                    </div>
                    <div className="report-item">
                      <span className="label">Gross Profit</span>
                      <span className="value">{formatCurrency(generatedReport.sections.profitLoss.grossProfit)}</span>
                    </div>
                    <div className="report-item">
                      <span className="label">Operating Expenses</span>
                      <span className="value">{formatCurrency(generatedReport.sections.profitLoss.operatingExpenses)}</span>
                    </div>
                    <div className="report-item">
                      <span className="label">Operating Income</span>
                      <span className="value">{formatCurrency(generatedReport.sections.profitLoss.operatingIncome)}</span>
                    </div>
                    <div className="report-item">
                      <span className="label">Net Income</span>
                      <span className={`value ${generatedReport.sections.profitLoss.netIncome >= 0 ? 'positive' : 'negative'}`}>
                        {formatCurrency(generatedReport.sections.profitLoss.netIncome)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {generatedReport.sections?.kpis && (
                <div className="report-section">
                  <h4>{generatedReport.sections.kpis.title}</h4>
                  <div className="report-grid">
                    <div className="report-item">
                      <span className="label">Profit Margin</span>
                      <span className="value">{generatedReport.sections.kpis.profitMargin}</span>
                    </div>
                    <div className="report-item">
                      <span className="label">Return on Assets</span>
                      <span className="value">{generatedReport.sections.kpis.returnOnAssets}</span>
                    </div>
                    <div className="report-item">
                      <span className="label">Return on Equity</span>
                      <span className="value">{generatedReport.sections.kpis.returnOnEquity}</span>
                    </div>
                    <div className="report-item">
                      <span className="label">Debt to Equity</span>
                      <span className="value">{generatedReport.sections.kpis.debtToEquity}</span>
                    </div>
                    <div className="report-item">
                      <span className="label">Current Ratio</span>
                      <span className="value">{generatedReport.sections.kpis.currentRatio}</span>
                    </div>
                  </div>
                </div>
              )}

              {generatedReport.aiAnalysis && !generatedReport.aiAnalysis.error && (
                <div className="report-section ai-section">
                  <h4>🤖 AI Analysis</h4>

                  {generatedReport.aiAnalysis.executiveSummary && (
                    <div className="ai-summary">
                      <p>{generatedReport.aiAnalysis.executiveSummary}</p>
                    </div>
                  )}

                  {generatedReport.aiAnalysis.keyInsights && generatedReport.aiAnalysis.keyInsights.length > 0 && (
                    <div className="ai-list">
                      <h5>Key Insights</h5>
                      <ul>
                        {generatedReport.aiAnalysis.keyInsights.map((insight, idx) => (
                          <li key={idx}>{insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {generatedReport.aiAnalysis.recommendations && generatedReport.aiAnalysis.recommendations.length > 0 && (
                    <div className="ai-list recommendations">
                      <h5>Recommendations</h5>
                      <ul>
                        {generatedReport.aiAnalysis.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {generatedReport.aiAnalysis.riskAreas && generatedReport.aiAnalysis.riskAreas.length > 0 && (
                    <div className="ai-list risks">
                      <h5>Risk Areas</h5>
                      <ul>
                        {generatedReport.aiAnalysis.riskAreas.map((risk, idx) => (
                          <li key={idx}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {generatedReport.aiAnalysis.outlook && (
                    <div className="ai-outlook">
                      <h5>Outlook</h5>
                      <p>{generatedReport.aiAnalysis.outlook}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .scheduled-reports-page {
          padding: 0;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
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

        .btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          border: none;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-sm {
          padding: 0.4rem 0.75rem;
          font-size: 0.85rem;
        }

        .btn-primary { background: #3b82f6; color: white; }
        .btn-primary:hover { background: #2563eb; }
        .btn-secondary { background: #334155; color: #f1f5f9; }
        .btn-secondary:hover { background: #475569; }
        .btn-success { background: #22c55e; color: white; }
        .btn-warning { background: #f59e0b; color: white; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          color: #94a3b8;
          text-align: center;
        }

        .empty-state h3 { margin: 1rem 0 0.5rem; color: #f1f5f9; }

        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .reports-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .report-card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 0.75rem;
          padding: 1.5rem;
          transition: all 0.2s;
        }

        .report-card.inactive {
          opacity: 0.7;
        }

        .report-card:hover {
          border-color: #3b82f6;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-badge.active { background: #22c55e20; color: #22c55e; }
        .status-badge.paused { background: #f59e0b20; color: #f59e0b; }

        .card-actions {
          display: flex;
          gap: 0.5rem;
        }

        .icon-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 0.25rem;
        }

        .icon-btn:hover { color: #f1f5f9; background: #334155; }
        .icon-btn.danger:hover { color: #ef4444; }

        .report-card h3 {
          margin: 0 0 0.25rem;
          color: #f1f5f9;
        }

        .company-name {
          color: #64748b;
          font-size: 0.9rem;
          margin: 0 0 1rem;
        }

        .report-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #94a3b8;
          font-size: 0.9rem;
        }

        .card-footer {
          display: flex;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid #334155;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
        }

        .modal {
          background: #1e293b;
          border-radius: 0.75rem;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #334155;
        }

        .modal-header h2 {
          margin: 0;
          color: #f1f5f9;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
        }

        form {
          padding: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-row {
          display: flex;
          gap: 1rem;
        }

        .form-row .form-group {
          flex: 1;
        }

        label {
          display: block;
          color: #94a3b8;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }

        input, select {
          width: 100%;
          padding: 0.75rem;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 0.5rem;
          color: #f1f5f9;
        }

        input:focus, select:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .recipient-input {
          display: flex;
          gap: 0.5rem;
        }

        .recipient-input input {
          flex: 1;
        }

        .recipients-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .recipient-tag {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0.75rem;
          background: #334155;
          border-radius: 1rem;
          font-size: 0.85rem;
          color: #f1f5f9;
        }

        .recipient-tag button {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0;
        }

        .section-toggles {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .section-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: #0f172a;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.85rem;
          color: #f1f5f9;
        }

        .section-toggle input {
          width: auto;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid #334155;
        }

        .history-list {
          padding: 1.5rem;
        }

        .empty-history {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem;
          color: #94a3b8;
        }

        .history-item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: #0f172a;
          border-radius: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .history-item.completed .history-status { color: #22c55e; }
        .history-item.running .history-status { color: #3b82f6; }
        .history-item.failed .history-status { color: #ef4444; }

        .history-time {
          color: #f1f5f9;
          font-weight: 500;
        }

        .history-meta {
          color: #94a3b8;
          font-size: 0.85rem;
        }

        .error-msg { color: #ef4444; }

        .report-preview { padding: 1.5rem; }
        .report-preview h3 { color: #f1f5f9; margin: 0 0 0.5rem; }
        .report-meta { color: #94a3b8; font-size: 0.85rem; margin-bottom: 1.5rem; }
        .report-section { background: #0f172a; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem; }
        .report-section h4 { color: #3b82f6; margin: 0 0 1rem; font-size: 1rem; }
        .report-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
        .report-item { display: flex; justify-content: space-between; }
        .report-item .label { color: #94a3b8; }
        .report-item .value { color: #f1f5f9; font-weight: 500; }
        .report-item .value.positive { color: #22c55e; }
        .report-item .value.negative { color: #ef4444; }

        .ai-section { border: 1px solid #3b82f640; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); }
        .ai-section h4 { color: #3b82f6; }
        .ai-summary { margin-bottom: 1rem; padding: 1rem; background: #3b82f610; border-radius: 0.5rem; }
        .ai-summary p { color: #e2e8f0; line-height: 1.6; margin: 0; }
        .ai-list { margin-top: 1rem; }
        .ai-list h5 { color: #94a3b8; font-size: 0.85rem; margin: 0 0 0.5rem; }
        .ai-list ul { margin: 0; padding-left: 1.25rem; }
        .ai-list li { color: #e2e8f0; font-size: 0.9rem; margin-bottom: 0.5rem; line-height: 1.5; }
        .ai-list.recommendations h5 { color: #22c55e; }
        .ai-list.risks h5 { color: #ef4444; }
        .ai-outlook { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #334155; }
        .ai-outlook h5 { color: #f59e0b; font-size: 0.85rem; margin: 0 0 0.5rem; }
        .ai-outlook p { color: #e2e8f0; font-size: 0.9rem; margin: 0; line-height: 1.5; }
      `}</style>
    </div>
  );
}

export default ScheduledReports;
