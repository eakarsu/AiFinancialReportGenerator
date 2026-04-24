import React, { useState, useEffect } from 'react';
import {
  Brain, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp,
  Trash2, Eye, Filter, RefreshCw, Sparkles, FileText, TrendingUp,
  PieChart, Shield, Presentation, Zap, BarChart3, Target, Lightbulb, X
} from 'lucide-react';
import { getAiResponses, getAiResponse, getAiResponseStats, deleteAiResponse, analyzeAiHistory, summarizeAiResponse } from '../services/api';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const featureIcons = {
  forecast_generator: TrendingUp,
  variance_explainer: PieChart,
  audit_analyzer: Shield,
  board_report_writer: FileText,
  presentation_generator: Presentation,
  expense_categorizer: Target
};

const featureColors = {
  forecast_generator: { color: '#10b981', bg: '#ecfdf5' },
  variance_explainer: { color: '#ec4899', bg: '#fdf2f8' },
  audit_analyzer: { color: '#8b5cf6', bg: '#f5f3ff' },
  board_report_writer: { color: '#3b82f6', bg: '#eff6ff' },
  presentation_generator: { color: '#f59e0b', bg: '#fffbeb' },
  expense_categorizer: { color: '#06b6d4', bg: '#ecfeff' }
};

const featureLabels = {
  forecast_generator: 'Forecast Generator',
  variance_explainer: 'Variance Explainer',
  audit_analyzer: 'Audit Analyzer',
  board_report_writer: 'Board Report Writer',
  presentation_generator: 'Presentation Generator',
  expense_categorizer: 'Expense Categorizer'
};

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
    return null;
  }
};

function AiResponsesHistory() {
  const [responses, setResponses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [summarizing, setSummarizing] = useState(null);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [historyAnalysis, setHistoryAnalysis] = useState(null);
  const [responseSummary, setResponseSummary] = useState(null);
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { feature_type: filter } : {};
      const [responsesRes, statsRes] = await Promise.all([
        getAiResponses({ ...params, limit: 100 }),
        getAiResponseStats()
      ]);
      setResponses(responsesRes.data.responses || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching AI responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (id) => {
    try {
      const res = await getAiResponse(id);
      setSelectedResponse(res.data);
      setResponseSummary(null);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching response detail:', error);
    }
  };

  const handleDelete = (id) => {
    setDeleteTargetId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteAiResponse(deleteTargetId);
      setConfirmOpen(false);
      setDeleteTargetId(null);
      toast.success('AI response deleted successfully!');
      fetchData();
    } catch (error) {
      console.error('Error deleting response:', error);
      toast.error('Failed to delete AI response. Please try again.');
    }
  };

  const handleAnalyzeHistory = async () => {
    setAnalyzing(true);
    try {
      const res = await analyzeAiHistory({
        feature_type: filter,
        days: 30
      });
      setHistoryAnalysis(res.data);
      setShowAnalysisModal(true);
      toast.success('History analysis completed successfully!');
    } catch (error) {
      console.error('Error analyzing history:', error);
      toast.error('Failed to analyze history. Please check your API key.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSummarizeResponse = async (id) => {
    setSummarizing(id);
    try {
      const res = await summarizeAiResponse(id);
      setResponseSummary(res.data.summary);
    } catch (error) {
      console.error('Error summarizing response:', error);
    } finally {
      setSummarizing(null);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderParsedResponse = (parsed) => {
    if (!parsed) return <p className="text-gray-500">No parsed data available</p>;

    const data = parseAIResponse(parsed);
    if (!data) return <p className="text-gray-500">Could not parse response</p>;

    return (
      <div style={{ maxHeight: '400px', overflow: 'auto' }}>
        {Object.entries(data).map(([key, value]) => (
          <div key={key} style={{ marginBottom: '16px' }}>
            <div style={{
              fontWeight: '600',
              color: '#374151',
              textTransform: 'capitalize',
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              {key.replace(/_/g, ' ')}
            </div>
            <div style={{
              background: '#f9fafb',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '13px'
            }}>
              {typeof value === 'object' ? (
                Array.isArray(value) ? (
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {value.slice(0, 10).map((item, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>
                        {typeof item === 'object' ? (item.recommendation || item.insight || item.action || JSON.stringify(item)) : String(item)}
                      </li>
                    ))}
                    {value.length > 10 && <li>...and {value.length - 10} more</li>}
                  </ul>
                ) : (
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                    {JSON.stringify(value, null, 2)}
                  </pre>
                )
              ) : (
                <span>{String(value)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAnalysisResults = () => {
    if (!historyAnalysis?.analysis) return null;
    const analysis = historyAnalysis.analysis;

    return (
      <div>
        {/* Executive Summary */}
        {analysis.executive_summary && (
          <div style={{ marginBottom: '24px', padding: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', color: 'white' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#e0e7ff' }}>
              <Brain size={18} /> Executive Summary
            </h4>
            <p style={{ margin: 0, lineHeight: '1.7', fontSize: '15px' }}>{analysis.executive_summary}</p>
          </div>
        )}

        {/* Performance Summary */}
        {analysis.performance_summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '12px', textAlign: 'center' }}>
              <BarChart3 size={24} style={{ color: '#10b981', marginBottom: '8px' }} />
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>{analysis.performance_summary.total_requests || historyAnalysis.total_responses}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Total Requests</div>
            </div>
            <div style={{ padding: '16px', background: '#eff6ff', borderRadius: '12px', textAlign: 'center' }}>
              <CheckCircle size={24} style={{ color: '#3b82f6', marginBottom: '8px' }} />
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>{analysis.performance_summary.success_rate || '95%'}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Success Rate</div>
            </div>
            <div style={{ padding: '16px', background: '#fef3c7', borderRadius: '12px', textAlign: 'center' }}>
              <Sparkles size={24} style={{ color: '#d97706', marginBottom: '8px' }} />
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#d97706' }}>{analysis.performance_summary.most_used_feature || 'N/A'}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Most Used</div>
            </div>
            <div style={{ padding: '16px', background: '#f5f3ff', borderRadius: '12px', textAlign: 'center' }}>
              <Target size={24} style={{ color: '#8b5cf6', marginBottom: '8px' }} />
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#8b5cf6' }}>{analysis.performance_summary.avg_response_quality || 'Good'}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Quality</div>
            </div>
          </div>
        )}

        {/* Usage Insights */}
        {analysis.usage_insights && analysis.usage_insights.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#1e293b' }}>
              <Lightbulb size={18} /> Usage Insights
            </h4>
            {analysis.usage_insights.map((insight, i) => (
              <div key={i} style={{ padding: '16px', background: '#fffbeb', borderRadius: '8px', marginBottom: '8px', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600', color: '#92400e' }}>{insight.insight}</span>
                  <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', background: insight.impact === 'high' ? '#fef2f2' : insight.impact === 'medium' ? '#fef3c7' : '#f0f9ff', color: insight.impact === 'high' ? '#dc2626' : insight.impact === 'medium' ? '#d97706' : '#0284c7' }}>
                    {insight.impact}
                  </span>
                </div>
                {insight.category && <span style={{ fontSize: '12px', color: '#78350f' }}>Category: {insight.category}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Feature Analysis */}
        {analysis.feature_analysis && analysis.feature_analysis.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#1e293b' }}>
              <BarChart3 size={18} /> Feature Analysis
            </h4>
            <div style={{ display: 'grid', gap: '12px' }}>
              {analysis.feature_analysis.map((feature, i) => (
                <div key={i} style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>{feature.feature}</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{feature.observations}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: feature.quality_score >= 80 ? '#10b981' : feature.quality_score >= 60 ? '#f59e0b' : '#ef4444' }}>{feature.quality_score}%</div>
                    <div style={{ fontSize: '12px', color: feature.usage_trend === 'increasing' ? '#10b981' : feature.usage_trend === 'decreasing' ? '#ef4444' : '#64748b' }}>
                      {feature.usage_trend === 'increasing' ? '↑' : feature.usage_trend === 'decreasing' ? '↓' : '→'} {feature.usage_trend}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations && analysis.recommendations.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#1e293b' }}>
              <CheckCircle size={18} color="#10b981" /> Recommendations
            </h4>
            {analysis.recommendations.map((rec, i) => (
              <div key={i} style={{ padding: '16px', background: '#ecfdf5', borderRadius: '8px', marginBottom: '8px', borderLeft: '4px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', color: '#065f46' }}>{rec.recommendation}</span>
                  <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', background: rec.priority === 'high' ? '#fef2f2' : rec.priority === 'medium' ? '#fef3c7' : '#f0f9ff', color: rec.priority === 'high' ? '#dc2626' : rec.priority === 'medium' ? '#d97706' : '#0284c7' }}>
                    {rec.priority}
                  </span>
                </div>
                {rec.expected_benefit && <span style={{ fontSize: '13px', color: '#047857' }}>Expected: {rec.expected_benefit}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>AI Response History</h2>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>Track and analyze all AI-generated responses</p>
        </div>
        <button
          onClick={handleAnalyzeHistory}
          disabled={analyzing}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <Zap size={18} />
          {analyzing ? 'Analyzing...' : 'Analyze History with AI'}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Brain size={24} color="#3b82f6" />
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#3b82f6' }}>{stats.total}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Total AI Responses</div>
              </div>
            </div>
          </div>
          {stats.byFeature?.slice(0, 3).map((feature) => {
            const colors = featureColors[feature.feature_type] || { color: '#6b7280', bg: '#f3f4f6' };
            const Icon = featureIcons[feature.feature_type] || Sparkles;
            return (
              <div key={feature.feature_type} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={24} color={colors.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: colors.color }}>{feature.count}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>{featureLabels[feature.feature_type] || feature.feature_type}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter Bar */}
      <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Filter size={18} color="#6b7280" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '14px',
                minWidth: '200px'
              }}
            >
              <option value="all">All Features</option>
              <option value="forecast_generator">Forecast Generator</option>
              <option value="variance_explainer">Variance Explainer</option>
              <option value="audit_analyzer">Audit Analyzer</option>
              <option value="board_report_writer">Board Report Writer</option>
              <option value="presentation_generator">Presentation Generator</option>
              <option value="expense_categorizer">Expense Categorizer</option>
            </select>
          </div>
          <button onClick={fetchData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Responses List */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>AI Response History</h3>
          <span style={{ color: '#6b7280', fontSize: '14px' }}>{responses.length} responses</span>
        </div>
        <div style={{ padding: 0 }}>
          {responses.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
              <Brain size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
              <p>No AI responses found</p>
            </div>
          ) : (
            responses.map((response) => {
              const colors = featureColors[response.feature_type] || { color: '#6b7280', bg: '#f3f4f6' };
              const Icon = featureIcons[response.feature_type] || Sparkles;
              const isExpanded = expandedId === response.id;

              return (
                <div
                  key={response.id}
                  style={{
                    borderBottom: '1px solid #f3f4f6',
                    padding: '16px 20px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: colors.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Icon size={20} color={colors.color} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                          {response.feature_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#6b7280' }}>
                          <span style={{
                            background: colors.bg,
                            color: colors.color,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {featureLabels[response.feature_type] || response.feature_type}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={14} />
                            {formatDate(response.created_at)}
                          </span>
                          {response.status === 'completed' ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                              <CheckCircle size={14} />
                              Completed
                            </span>
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>
                              <AlertCircle size={14} />
                              {response.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => handleViewDetail(response.id)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '13px' }}
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : response.id)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '13px' }}
                        title="Expand"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button
                        onClick={() => handleDelete(response.id)}
                        className="btn btn-danger"
                        style={{ padding: '6px 12px', fontSize: '13px', background: '#fee2e2', color: '#dc2626', border: 'none' }}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                      {response.prompt_summary && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>PROMPT</div>
                          <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
                            {response.prompt_summary}
                          </div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>RAW RESPONSE</div>
                        <div style={{
                          background: '#1f2937',
                          color: '#e5e7eb',
                          padding: '12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          maxHeight: '200px',
                          overflow: 'auto',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {response.raw_response?.substring(0, 1000)}
                          {response.raw_response?.length > 1000 && '...'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedResponse && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>AI Response Details</h3>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              {/* Header Info */}
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '24px',
                borderRadius: '12px',
                color: 'white',
                marginBottom: '24px'
              }}>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>{selectedResponse.feature_name}</h2>
                <div style={{ display: 'flex', gap: '24px', fontSize: '14px', opacity: 0.9 }}>
                  <span>{featureLabels[selectedResponse.feature_type] || selectedResponse.feature_type}</span>
                  <span>{formatDate(selectedResponse.created_at)}</span>
                  {selectedResponse.model_used && <span>Model: {selectedResponse.model_used}</span>}
                </div>
              </div>

              {/* Summarize Button */}
              <div style={{ marginBottom: '24px' }}>
                <button
                  onClick={() => handleSummarizeResponse(selectedResponse.id)}
                  disabled={summarizing === selectedResponse.id}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                >
                  <Sparkles size={16} />
                  {summarizing === selectedResponse.id ? 'Summarizing...' : 'Summarize with AI'}
                </button>
              </div>

              {/* AI Summary */}
              {responseSummary && (
                <div style={{ marginBottom: '24px', padding: '20px', background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)', borderRadius: '12px', border: '1px solid #86efac' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#166534' }}>
                    <Sparkles size={18} /> AI Summary
                  </h4>
                  <p style={{ margin: '0 0 16px 0', color: '#064e3b', lineHeight: '1.7' }}>{responseSummary.summary}</p>
                  {responseSummary.key_points && responseSummary.key_points.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontWeight: '600', color: '#166534', marginBottom: '8px', fontSize: '14px' }}>Key Points</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {responseSummary.key_points.map((point, i) => (
                          <span key={i} style={{ padding: '6px 12px', background: 'white', borderRadius: '6px', fontSize: '13px', color: '#166534' }}>
                            • {point}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {responseSummary.actionable_insights && responseSummary.actionable_insights.length > 0 && (
                    <div>
                      <div style={{ fontWeight: '600', color: '#166534', marginBottom: '8px', fontSize: '14px' }}>Actionable Insights</div>
                      {responseSummary.actionable_insights.map((insight, i) => (
                        <div key={i} style={{ padding: '8px 12px', background: 'white', borderRadius: '6px', marginBottom: '4px', fontSize: '13px', color: '#064e3b' }}>
                          → {insight}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Prompt */}
              {selectedResponse.prompt_summary && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#374151' }}>Prompt Summary</h4>
                  <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                    {selectedResponse.prompt_summary}
                  </div>
                </div>
              )}

              {/* Parsed Response */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#374151' }}>Parsed Response</h4>
                {renderParsedResponse(selectedResponse.parsed_response)}
              </div>

              {/* Raw Response */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', color: '#374151' }}>Raw AI Response</h4>
                <div style={{
                  background: '#1f2937',
                  color: '#e5e7eb',
                  padding: '16px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  maxHeight: '300px',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedResponse.raw_response}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Analysis Modal */}
      {showAnalysisModal && historyAnalysis && (
        <div className="modal-overlay" onClick={() => setShowAnalysisModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>AI History Analysis</h3>
                <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
                  Analysis of {historyAnalysis.total_responses} responses over the last {historyAnalysis.period_days} days
                </p>
              </div>
              <button onClick={() => setShowAnalysisModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              {renderAnalysisResults()}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Confirm Delete"
        message="Are you sure you want to delete this AI response? This action cannot be undone."
        type="danger"
      />
    </div>
  );
}

export default AiResponsesHistory;
