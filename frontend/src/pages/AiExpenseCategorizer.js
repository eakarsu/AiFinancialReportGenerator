import React, { useState, useEffect } from 'react';
import { Tag, Plus, Sparkles, Eye, Edit2, Trash2, X, DollarSign, CheckCircle, AlertTriangle, TrendingUp, Shield, Receipt } from 'lucide-react';
import {
  getAiExpenseCategorizationsAI, getAiExpenseCategorizationAI, createAiExpenseCategorizationAI,
  updateAiExpenseCategorizationAI, deleteAiExpenseCategorizationAI, categorizeExpenseAI, getCompanies
} from '../services/api';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

// Helper function to parse AI response - strips markdown code blocks
const parseAIResponse = (data) => {
  if (!data) return null;
  if (typeof data === 'object') return data;
  let jsonString = data;
  if (jsonString.includes('```')) {
    jsonString = jsonString.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  }
  try {
    return JSON.parse(jsonString);
  } catch {
    return data; // Return as-is if not valid JSON
  }
};

function AiExpenseCategorizer() {
  const [expenses, setExpenses] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    company_id: '', expense_description: '', amount: '', vendor: '', date: new Date().toISOString().split('T')[0], receipt_text: ''
  });
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [expRes, compRes] = await Promise.all([getAiExpenseCategorizationsAI(), getCompanies()]);
      setExpenses(expRes.data);
      setCompanies(compRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (expense) => {
    try {
      const res = await getAiExpenseCategorizationAI(expense.id);
      setSelectedExpense(res.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching expense:', error);
    }
  };

  const handleCreate = () => {
    setEditMode(false);
    setFormData({ company_id: companies[0]?.id || '', expense_description: '', amount: '', vendor: '', date: new Date().toISOString().split('T')[0], receipt_text: '' });
    setShowFormModal(true);
  };

  const handleEdit = () => {
    setEditMode(true);
    setFormData({
      company_id: selectedExpense.company_id,
      expense_description: selectedExpense.expense_description || '',
      amount: selectedExpense.amount || '',
      vendor: selectedExpense.vendor || '',
      date: selectedExpense.date?.split('T')[0] || '',
      receipt_text: selectedExpense.receipt_text || ''
    });
    setShowDetailModal(false);
    setShowFormModal(true);
  };

  const handleDelete = () => {
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteAiExpenseCategorizationAI(selectedExpense.id);
      setConfirmOpen(false);
      setShowDetailModal(false);
      toast.success('Expense categorization deleted successfully!');
      fetchData();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense categorization. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await updateAiExpenseCategorizationAI(selectedExpense.id, formData);
        toast.success('Expense updated successfully!');
      } else {
        await createAiExpenseCategorizationAI(formData);
        toast.success('Expense created successfully!');
      }
      setShowFormModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense. Please try again.');
    }
  };

  const handleCategorize = async (expenseId) => {
    setAnalyzing(true);
    try {
      await categorizeExpenseAI({ id: expenseId || selectedExpense.id });
      const res = await getAiExpenseCategorizationAI(expenseId || selectedExpense.id);
      setSelectedExpense(res.data);
      fetchData();
      toast.success('Expense categorized successfully!');
    } catch (error) {
      console.error('Error categorizing expense:', error);
      toast.error('Failed to categorize expense. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Technology': '#3b82f6', 'Travel': '#8b5cf6', 'Marketing': '#ec4899', 'Office Supplies': '#f59e0b',
      'Professional Services': '#10b981', 'Utilities': '#06b6d4', 'Equipment': '#f97316', 'Software': '#6366f1',
      'Entertainment': '#ef4444', 'Training': '#84cc16'
    };
    return colors[category] || '#64748b';
  };

  const getStatusColor = (status) => {
    const colors = { categorized: '#10b981', pending: '#f59e0b', reviewed: '#3b82f6' };
    return colors[status] || '#6b7280';
  };

  const getConfidenceColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const renderPolicyCompliance = (compliance) => {
    if (!compliance) return null;
    const data = parseAIResponse(compliance);

    return (
      <div style={{ marginBottom: '24px', padding: '20px', background: data.is_compliant ? '#ecfdf5' : '#fef2f2', borderRadius: '12px', border: `1px solid ${data.is_compliant ? '#86efac' : '#fecaca'}` }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: data.is_compliant ? '#166534' : '#991b1b' }}>
          {data.is_compliant ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          Policy Compliance
        </h4>
        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Status:</span>
            <span style={{ fontWeight: '600', color: data.is_compliant ? '#166534' : '#991b1b' }}>{data.is_compliant ? 'Compliant' : 'Non-Compliant'}</span>
          </div>
          {data.policy_notes && (
            <div style={{ fontSize: '14px', color: '#475569', padding: '12px', background: 'white', borderRadius: '8px' }}>{data.policy_notes}</div>
          )}
          {data.approval_required && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Approval Required:</span>
              <span style={{ fontWeight: '600', color: '#f59e0b', textTransform: 'capitalize' }}>{data.approval_level}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFraudRisk = (risk) => {
    if (!risk) return null;
    const data = parseAIResponse(risk);
    const riskColors = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' };

    return (
      <div style={{ marginBottom: '24px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#1e293b' }}>
          <Shield size={18} /> Fraud Risk Assessment
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ color: '#64748b' }}>Risk Level:</span>
          <span style={{ padding: '4px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', background: `${riskColors[data.risk_level]}20`, color: riskColors[data.risk_level] }}>
            {data.risk_level}
          </span>
        </div>
        {data.risk_factors && data.risk_factors.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Risk Factors:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {data.risk_factors.map((factor, i) => (
                <span key={i} style={{ padding: '4px 12px', background: '#fef2f2', color: '#dc2626', borderRadius: '16px', fontSize: '12px' }}>{factor}</span>
              ))}
            </div>
          </div>
        )}
        {data.recommended_actions && data.recommended_actions.length > 0 && (
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Recommended Actions:</div>
            {data.recommended_actions.map((action, i) => (
              <div key={i} style={{ padding: '8px 12px', background: '#ecfdf5', borderRadius: '8px', marginBottom: '4px', fontSize: '13px', color: '#065f46' }}>{action}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderOptimizations = (suggestions) => {
    if (!suggestions) return null;
    const data = parseAIResponse(suggestions);
    if (!Array.isArray(data) || data.length === 0) return null;

    return (
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#1e293b' }}>
          <TrendingUp size={18} /> Cost Optimization Suggestions
        </h4>
        {data.map((item, i) => (
          <div key={i} style={{ padding: '16px', background: '#eff6ff', borderRadius: '8px', marginBottom: '8px', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>{item.suggestion}</div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#1e40af' }}>
              {item.potential_savings && <span>Potential Savings: {item.potential_savings}</span>}
              {item.implementation && <span>How: {item.implementation}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAIReasoning = (reasoning) => {
    if (!reasoning) return null;

    // Try to parse as JSON first
    const parsed = parseAIResponse(reasoning);

    // If parsed successfully and is an object, render structured
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return (
        <div style={{ marginBottom: '24px', padding: '20px', background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)', borderRadius: '12px', border: '1px solid #c7d2fe' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#4f46e5' }}>
            <Sparkles size={18} /> AI Analysis
          </h4>
          {parsed.reasoning && (
            <p style={{ margin: '0 0 16px 0', color: '#334155', lineHeight: '1.7', fontSize: '15px' }}>{parsed.reasoning}</p>
          )}
          {parsed.category_rationale && (
            <div style={{ padding: '12px 16px', background: 'white', borderRadius: '8px', marginBottom: '12px', borderLeft: '3px solid #8b5cf6' }}>
              <div style={{ fontWeight: '600', color: '#4f46e5', marginBottom: '4px', fontSize: '13px' }}>Category Rationale</div>
              <span style={{ color: '#334155' }}>{parsed.category_rationale}</span>
            </div>
          )}
          {parsed.confidence_explanation && (
            <div style={{ padding: '12px 16px', background: 'white', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
              <div style={{ fontWeight: '600', color: '#059669', marginBottom: '4px', fontSize: '13px' }}>Confidence Explanation</div>
              <span style={{ color: '#334155' }}>{parsed.confidence_explanation}</span>
            </div>
          )}
        </div>
      );
    }

    // Fallback to plain text display
    const displayText = typeof reasoning === 'string' ? reasoning : JSON.stringify(reasoning, null, 2);
    return (
      <div style={{ marginBottom: '24px', padding: '20px', background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)', borderRadius: '12px', border: '1px solid #c7d2fe' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#4f46e5' }}>
          <Sparkles size={18} /> AI Analysis
        </h4>
        <p style={{ margin: 0, color: '#334155', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{displayText}</p>
      </div>
    );
  };

  if (loading) return <div className="loading"><div className="loading-spinner"></div></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>AI Expense Categorizer</h2>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>Automatically categorize expenses with AI-powered analysis</p>
        </div>
        <button onClick={handleCreate} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> New Expense
        </button>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Company</th>
              <th>Amount</th>
              <th>Vendor</th>
              <th>Category</th>
              <th>Confidence</th>
              <th>Tax Deductible</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp) => (
              <tr key={exp.id} onClick={() => handleRowClick(exp)} style={{ cursor: 'pointer' }}>
                <td style={{ fontWeight: '500', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.expense_description}</td>
                <td>{exp.company_name}</td>
                <td style={{ fontWeight: '600', color: '#1e293b' }}>{formatCurrency(exp.amount)}</td>
                <td>{exp.vendor || '-'}</td>
                <td>
                  {exp.category ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', background: `${getCategoryColor(exp.category)}15`, color: getCategoryColor(exp.category) }}>
                      <Tag size={12} /> {exp.category}
                    </span>
                  ) : <span style={{ color: '#9ca3af' }}>Pending</span>}
                </td>
                <td>
                  {exp.confidence_score ? (
                    <span style={{ fontWeight: '600', color: getConfidenceColor(exp.confidence_score) }}>{exp.confidence_score}%</span>
                  ) : '-'}
                </td>
                <td>
                  {exp.tax_deductible !== null ? (
                    <span style={{ color: exp.tax_deductible ? '#10b981' : '#ef4444' }}>{exp.tax_deductible ? 'Yes' : 'No'}</span>
                  ) : '-'}
                </td>
                <td><span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', background: `${getStatusColor(exp.status)}20`, color: getStatusColor(exp.status) }}>{exp.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedExpense && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `linear-gradient(135deg, ${getCategoryColor(selectedExpense.category)} 0%, ${getCategoryColor(selectedExpense.category)}99 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Receipt size={24} color="white" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px' }}>{selectedExpense.expense_description}</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>{selectedExpense.company_name} - {selectedExpense.vendor || 'Unknown Vendor'}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Expense Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', textAlign: 'center' }}>
                  <DollarSign size={24} style={{ color: '#64748b', marginBottom: '8px' }} />
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Amount</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>{formatCurrency(selectedExpense.amount)}</div>
                </div>
                <div style={{ padding: '20px', background: selectedExpense.category ? `${getCategoryColor(selectedExpense.category)}10` : '#f8fafc', borderRadius: '12px', textAlign: 'center' }}>
                  <Tag size={24} style={{ color: getCategoryColor(selectedExpense.category), marginBottom: '8px' }} />
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Category</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: getCategoryColor(selectedExpense.category) }}>{selectedExpense.category || 'Pending'}</div>
                  {selectedExpense.subcategory && <div style={{ fontSize: '12px', color: '#64748b' }}>{selectedExpense.subcategory}</div>}
                </div>
                <div style={{ padding: '20px', background: selectedExpense.confidence_score ? `${getConfidenceColor(selectedExpense.confidence_score)}10` : '#f8fafc', borderRadius: '12px', textAlign: 'center' }}>
                  <Sparkles size={24} style={{ color: getConfidenceColor(selectedExpense.confidence_score), marginBottom: '8px' }} />
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Confidence</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: getConfidenceColor(selectedExpense.confidence_score) }}>{selectedExpense.confidence_score || 0}%</div>
                </div>
                <div style={{ padding: '20px', background: selectedExpense.tax_deductible ? '#ecfdf5' : '#fef2f2', borderRadius: '12px', textAlign: 'center' }}>
                  <Receipt size={24} style={{ color: selectedExpense.tax_deductible ? '#10b981' : '#ef4444', marginBottom: '8px' }} />
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Tax Deductible</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: selectedExpense.tax_deductible ? '#10b981' : '#ef4444' }}>{selectedExpense.tax_deductible ? 'Yes' : 'No'}</div>
                </div>
              </div>

              {/* AI Reasoning */}
              {selectedExpense.ai_reasoning && renderAIReasoning(selectedExpense.ai_reasoning)}

              {/* Additional Info */}
              {(selectedExpense.gl_account || selectedExpense.cost_center) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  {selectedExpense.gl_account && (
                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>GL Account</div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{selectedExpense.gl_account}</div>
                    </div>
                  )}
                  {selectedExpense.cost_center && (
                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Cost Center</div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{selectedExpense.cost_center}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {selectedExpense.tags && selectedExpense.tags.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Tags</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedExpense.tags.map((tag, i) => (
                      <span key={i} style={{ padding: '4px 12px', background: '#e0e7ff', color: '#4338ca', borderRadius: '16px', fontSize: '12px' }}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {renderPolicyCompliance(selectedExpense.policy_compliance)}
              {renderFraudRisk(selectedExpense.fraud_risk)}
              {renderOptimizations(selectedExpense.optimization_suggestions)}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                {selectedExpense.status !== 'categorized' && (
                  <button onClick={() => handleCategorize()} disabled={analyzing} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' }}>
                    <Sparkles size={16} /> {analyzing ? 'Categorizing...' : 'Categorize with AI'}
                  </button>
                )}
                <button onClick={handleEdit} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Edit2 size={16} /> Edit
                </button>
                <button onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer' }}>
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showFormModal && (
        <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{editMode ? 'Edit Expense' : 'New Expense for Categorization'}</h3>
              <button onClick={() => setShowFormModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              <div className="form-group">
                <label>Company</label>
                <select value={formData.company_id} onChange={(e) => setFormData({ ...formData, company_id: e.target.value })} required>
                  <option value="">Select Company</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Expense Description</label>
                <input type="text" value={formData.expense_description} onChange={(e) => setFormData({ ...formData, expense_description: e.target.value })} placeholder="e.g., Software subscription renewal" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Amount ($)</label>
                  <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" required />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Vendor</label>
                <input type="text" value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} placeholder="e.g., Amazon Web Services" />
              </div>
              <div className="form-group">
                <label>Receipt Details (Optional)</label>
                <textarea value={formData.receipt_text} onChange={(e) => setFormData({ ...formData, receipt_text: e.target.value })} placeholder="Paste receipt text or additional details for better categorization..." rows={4} style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowFormModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editMode ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Confirm Delete"
        message="Are you sure you want to delete this expense categorization? This action cannot be undone."
        type="danger"
      />
    </div>
  );
}

export default AiExpenseCategorizer;
