import React, { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { TableSkeleton } from './LoadingSkeleton';
import EmptyState from './EmptyState';

function DataTable({ columns, data, onRowClick, loading, pageSize = 10 }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Search
  const filtered = useMemo(() => {
    if (!data) return [];
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = row[col.key];
        if (val == null) return false;
        return String(val).toLowerCase().includes(term);
      })
    );
  }, [data, searchTerm, columns]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      // Try numeric sort
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
      }
      // String sort
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const getSortIcon = (key) => {
    if (sortKey !== key) return <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />;
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  if (loading) return <TableSkeleton rows={pageSize} columns={columns.length} />;

  return (
    <div>
      {/* Search Bar */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
          background: '#f9fafb', borderRadius: '8px', padding: '8px 12px',
          border: '1px solid #e5e7eb',
        }}>
          <Search size={16} color="#9ca3af" />
          <input
            type="text"
            placeholder="Search records..."
            value={searchTerm}
            onChange={handleSearch}
            style={{
              border: 'none', outline: 'none', background: 'none',
              fontSize: '14px', flex: 1, color: '#111827',
            }}
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}>
              <X size={14} color="#9ca3af" />
            </button>
          )}
        </div>
        <div style={{ fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      {paginated.length === 0 ? (
        searchTerm ? (
          <EmptyState preset="noResults" />
        ) : (
          <EmptyState preset="noData" />
        )
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {col.label}
                      {getSortIcon(col.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((row, index) => (
                <tr key={row.id || index} onClick={() => onRowClick && onRowClick(row)}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {sorted.length > pageSize && (
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            Showing {((safePage - 1) * pageSize) + 1}-{Math.min(safePage * pageSize, sorted.length)} of {sorted.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setCurrentPage(1)}
              disabled={safePage === 1}
              style={{
                padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db',
                background: 'white', cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                opacity: safePage === 1 ? 0.5 : 1, fontSize: '13px', color: '#374151',
              }}>
              First
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              style={{
                padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db',
                background: 'white', cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                opacity: safePage === 1 ? 0.5 : 1, display: 'flex', alignItems: 'center',
              }}>
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (safePage <= 3) {
                page = i + 1;
              } else if (safePage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = safePage - 2 + i;
              }
              return (
                <button key={page} onClick={() => setCurrentPage(page)}
                  style={{
                    padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '500',
                    border: safePage === page ? '1px solid #3b82f6' : '1px solid #d1d5db',
                    background: safePage === page ? '#3b82f6' : 'white',
                    color: safePage === page ? 'white' : '#374151',
                    cursor: 'pointer',
                  }}>
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              style={{
                padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db',
                background: 'white', cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                opacity: safePage === totalPages ? 0.5 : 1, display: 'flex', alignItems: 'center',
              }}>
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage === totalPages}
              style={{
                padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db',
                background: 'white', cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                opacity: safePage === totalPages ? 0.5 : 1, fontSize: '13px', color: '#374151',
              }}>
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
