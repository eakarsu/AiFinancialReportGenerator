import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Table,
  BarChart2,
  PieChart,
  Save,
  Bookmark,
  Trash2,
  RefreshCw,
  Building,
  Database,
  AlertCircle
} from 'lucide-react';
import * as api from '../services/api';

function NaturalLanguageQuery() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [savedQueries, setSavedQueries] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [queryName, setQueryName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [suggestionsRes, companiesRes, savedRes] = await Promise.all([
        api.getQuerySuggestions(),
        api.getCompanies(),
        api.getSavedQueries()
      ]);
      setSuggestions(suggestionsRes.data);
      setCompanies(companiesRes.data);
      setSavedQueries(savedRes.data);
      if (companiesRes.data.length > 0) {
        setSelectedCompany(companiesRes.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await api.executeNaturalLanguageQuery({
        query: query.trim(),
        company_id: selectedCompany || null
      });
      setResult(response.data);
    } catch (error) {
      console.error('Error executing query:', error);
      setResult({
        type: 'error',
        error: 'Failed to process query. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    inputRef.current?.focus();
  };

  const handleSaveQuery = async () => {
    if (!queryName.trim() || !query.trim()) return;

    try {
      await api.saveQuery({
        company_id: selectedCompany,
        query_name: queryName,
        query_text: query,
        visualization_type: result?.visualization || 'table'
      });
      const savedRes = await api.getSavedQueries();
      setSavedQueries(savedRes.data);
      setShowSaveModal(false);
      setQueryName('');
    } catch (error) {
      console.error('Error saving query:', error);
    }
  };

  const handleDeleteSavedQuery = async (id) => {
    try {
      await api.deleteSavedQuery(id);
      setSavedQueries(savedQueries.filter(q => q.id !== id));
    } catch (error) {
      console.error('Error deleting query:', error);
    }
  };

  const handleLoadSavedQuery = (saved) => {
    setQuery(saved.query_text);
    if (saved.company_id) {
      setSelectedCompany(saved.company_id);
    }
  };

  const renderDataTable = (data) => {
    if (!data || data.length === 0) {
      return <p className="no-data">No data found</p>;
    }

    const columns = Object.keys(data[0]);

    return (
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col}>{col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx}>
                {columns.map(col => (
                  <td key={col}>
                    {typeof row[col] === 'number'
                      ? row[col].toLocaleString()
                      : row[col] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const getVisualizationIcon = (type) => {
    switch (type) {
      case 'chart':
      case 'bar':
        return <BarChart2 size={16} />;
      case 'pie':
        return <PieChart size={16} />;
      default:
        return <Table size={16} />;
    }
  };

  return (
    <div className="nlq-page">
      <div className="page-header">
        <div className="header-content">
          <h1><MessageSquare size={28} /> Natural Language Query</h1>
          <p>Ask questions about your financial data in plain English</p>
        </div>
      </div>

      <div className="nlq-container">
        <div className="main-content">
          {/* Query Input */}
          <div className="query-section">
            <div className="company-selector">
              <Building size={20} />
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
              >
                <option value="">All Companies</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <form onSubmit={handleSubmit} className="query-form">
              <div className="query-input-container">
                <Sparkles size={20} className="input-icon" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask anything about your financial data..."
                  className="query-input"
                />
                <button type="submit" className="submit-btn" disabled={loading || !query.trim()}>
                  {loading ? <RefreshCw size={20} className="spinning" /> : <Send size={20} />}
                </button>
              </div>
            </form>

            <div className="quick-suggestions">
              <span className="suggestion-label">Try:</span>
              {['Show total revenue', 'What are the top expenses?', 'Compare profit by quarter'].map(s => (
                <button key={s} onClick={() => handleSuggestionClick(s)} className="quick-suggestion">
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="results-section">
              <div className="results-header">
                <div className="result-meta">
                  {result.type === 'data' && (
                    <>
                      <span className="meta-badge">
                        {getVisualizationIcon(result.visualization)}
                        {result.visualization}
                      </span>
                      <span className="meta-badge">
                        <Database size={14} />
                        {result.rowCount} rows
                      </span>
                    </>
                  )}
                </div>
                {result.type === 'data' && (
                  <button className="save-btn" onClick={() => setShowSaveModal(true)}>
                    <Save size={16} /> Save Query
                  </button>
                )}
              </div>

              {result.type === 'error' ? (
                <div className="error-result">
                  <AlertCircle size={24} />
                  <p>{result.error}</p>
                  {result.sql && (
                    <div className="sql-debug">
                      <strong>Generated SQL:</strong>
                      <code>{result.sql}</code>
                    </div>
                  )}
                </div>
              ) : result.type === 'conversational' ? (
                <div className="conversational-result">
                  <p>{result.response}</p>
                </div>
              ) : (
                <>
                  {result.intent && (
                    <div className="intent-info">
                      <strong>Understanding:</strong> {result.intent}
                    </div>
                  )}

                  {result.summary && (
                    <div className="summary-box">
                      <Sparkles size={18} />
                      <p>{result.summary}</p>
                    </div>
                  )}

                  {result.data && renderDataTable(result.data)}

                  {result.sql && (
                    <div className="sql-section">
                      <strong>Generated SQL:</strong>
                      <code>{result.sql}</code>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Suggestions */}
          {!result && (
            <div className="suggestions-section">
              <h3>Suggested Queries</h3>
              <div className="suggestion-categories">
                {suggestions.map((category, idx) => (
                  <div key={idx} className="suggestion-category">
                    <h4>{category.category}</h4>
                    <div className="suggestion-list">
                      {category.queries?.map((q, qIdx) => (
                        <button
                          key={qIdx}
                          className="suggestion-item"
                          onClick={() => handleSuggestionClick(q)}
                        >
                          <MessageSquare size={16} />
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Saved Queries Sidebar */}
        <div className="sidebar">
          <h3><Bookmark size={20} /> Saved Queries</h3>
          {savedQueries.length === 0 ? (
            <div className="empty-saved">
              <p>No saved queries yet</p>
            </div>
          ) : (
            <div className="saved-list">
              {savedQueries.map(saved => (
                <div key={saved.id} className="saved-item">
                  <div className="saved-content" onClick={() => handleLoadSavedQuery(saved)}>
                    <span className="saved-name">{saved.query_name}</span>
                    <span className="saved-query">{saved.query_text}</span>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteSavedQuery(saved.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Save Query</h3>
            <div className="form-group">
              <label>Query Name</label>
              <input
                type="text"
                value={queryName}
                onChange={(e) => setQueryName(e.target.value)}
                placeholder="e.g., Monthly Revenue Report"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Query</label>
              <p className="saved-query-preview">{query}</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowSaveModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveQuery} disabled={!queryName.trim()}>
                <Save size={16} /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .nlq-page {
          padding: 0;
        }

        .page-header {
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

        .nlq-container {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 1.5rem;
        }

        .main-content {
          min-width: 0;
        }

        .query-section {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .company-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          color: #94a3b8;
        }

        .company-selector select {
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 0.5rem;
          padding: 0.5rem 1rem;
          color: #f1f5f9;
          flex: 1;
          max-width: 300px;
        }

        .query-form {
          margin-bottom: 1rem;
        }

        .query-input-container {
          display: flex;
          align-items: center;
          background: #0f172a;
          border: 2px solid #334155;
          border-radius: 0.75rem;
          padding: 0.5rem 1rem;
          transition: border-color 0.2s;
        }

        .query-input-container:focus-within {
          border-color: #3b82f6;
        }

        .input-icon {
          color: #3b82f6;
          margin-right: 0.75rem;
        }

        .query-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #f1f5f9;
          font-size: 1rem;
          outline: none;
        }

        .query-input::placeholder {
          color: #64748b;
        }

        .submit-btn {
          background: #3b82f6;
          border: none;
          border-radius: 0.5rem;
          padding: 0.5rem 1rem;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: background 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          background: #2563eb;
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .quick-suggestions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .suggestion-label {
          color: #64748b;
          font-size: 0.9rem;
        }

        .quick-suggestion {
          background: #334155;
          border: none;
          border-radius: 1rem;
          padding: 0.35rem 0.75rem;
          color: #94a3b8;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .quick-suggestion:hover {
          background: #475569;
          color: #f1f5f9;
        }

        .results-section {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 0.75rem;
          padding: 1.5rem;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .result-meta {
          display: flex;
          gap: 0.75rem;
        }

        .meta-badge {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.75rem;
          background: #0f172a;
          border-radius: 0.5rem;
          color: #94a3b8;
          font-size: 0.85rem;
          text-transform: capitalize;
        }

        .save-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #334155;
          border: none;
          border-radius: 0.5rem;
          color: #f1f5f9;
          cursor: pointer;
        }

        .save-btn:hover {
          background: #475569;
        }

        .error-result {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem;
          color: #ef4444;
          text-align: center;
        }

        .error-result p {
          margin: 1rem 0;
        }

        .sql-debug {
          background: #0f172a;
          padding: 1rem;
          border-radius: 0.5rem;
          width: 100%;
          text-align: left;
        }

        .sql-debug code {
          display: block;
          margin-top: 0.5rem;
          color: #94a3b8;
          word-break: break-all;
        }

        .conversational-result {
          padding: 1rem;
          background: #0f172a;
          border-radius: 0.5rem;
          color: #e2e8f0;
          line-height: 1.7;
        }

        .intent-info {
          padding: 0.75rem 1rem;
          background: #0f172a;
          border-radius: 0.5rem;
          color: #94a3b8;
          margin-bottom: 1rem;
        }

        .summary-box {
          display: flex;
          gap: 0.75rem;
          padding: 1rem;
          background: linear-gradient(135deg, #3b82f620 0%, #8b5cf620 100%);
          border: 1px solid #3b82f640;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
        }

        .summary-box svg {
          color: #3b82f6;
          flex-shrink: 0;
        }

        .summary-box p {
          margin: 0;
          color: #e2e8f0;
          line-height: 1.6;
        }

        .data-table-container {
          overflow-x: auto;
          margin-bottom: 1rem;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th, .data-table td {
          padding: 0.75rem 1rem;
          text-align: left;
          border-bottom: 1px solid #334155;
        }

        .data-table th {
          background: #0f172a;
          color: #94a3b8;
          font-weight: 600;
          white-space: nowrap;
        }

        .data-table td {
          color: #e2e8f0;
        }

        .data-table tr:hover td {
          background: #0f172a;
        }

        .no-data {
          text-align: center;
          color: #64748b;
          padding: 2rem;
        }

        .sql-section {
          padding: 1rem;
          background: #0f172a;
          border-radius: 0.5rem;
        }

        .sql-section strong {
          color: #94a3b8;
          display: block;
          margin-bottom: 0.5rem;
        }

        .sql-section code {
          color: #22c55e;
          font-family: monospace;
          font-size: 0.9rem;
        }

        .suggestions-section {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 0.75rem;
          padding: 1.5rem;
        }

        .suggestions-section h3 {
          margin: 0 0 1rem;
          color: #f1f5f9;
        }

        .suggestion-categories {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .suggestion-category h4 {
          margin: 0 0 0.75rem;
          color: #3b82f6;
          font-size: 0.9rem;
        }

        .suggestion-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .suggestion-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: #0f172a;
          border: 1px solid transparent;
          border-radius: 0.5rem;
          color: #94a3b8;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
        }

        .suggestion-item:hover {
          border-color: #3b82f6;
          color: #f1f5f9;
        }

        .sidebar {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 0.75rem;
          padding: 1.5rem;
          height: fit-content;
          position: sticky;
          top: 1rem;
        }

        .sidebar h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 0 1rem;
          color: #f1f5f9;
        }

        .empty-saved {
          text-align: center;
          color: #64748b;
          padding: 2rem 0;
        }

        .saved-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .saved-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: #0f172a;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .saved-item:hover {
          background: #334155;
        }

        .saved-content {
          flex: 1;
          min-width: 0;
        }

        .saved-name {
          display: block;
          color: #f1f5f9;
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .saved-query {
          display: block;
          color: #64748b;
          font-size: 0.8rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .delete-btn {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 0.25rem;
        }

        .delete-btn:hover {
          color: #ef4444;
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
        }

        .modal {
          background: #1e293b;
          border-radius: 0.75rem;
          padding: 1.5rem;
          width: 100%;
          max-width: 400px;
        }

        .modal h3 {
          margin: 0 0 1.5rem;
          color: #f1f5f9;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          color: #94a3b8;
          margin-bottom: 0.5rem;
        }

        .form-group input {
          width: 100%;
          padding: 0.75rem;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 0.5rem;
          color: #f1f5f9;
        }

        .saved-query-preview {
          padding: 0.75rem;
          background: #0f172a;
          border-radius: 0.5rem;
          color: #94a3b8;
          margin: 0;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
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
        }

        .btn-primary { background: #3b82f6; color: white; }
        .btn-secondary { background: #334155; color: #f1f5f9; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 900px) {
          .nlq-container {
            grid-template-columns: 1fr;
          }

          .sidebar {
            position: static;
          }
        }
      `}</style>
    </div>
  );
}

export default NaturalLanguageQuery;
