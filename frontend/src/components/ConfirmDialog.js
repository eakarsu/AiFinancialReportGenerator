import React from 'react';
import { AlertTriangle, Trash2, CheckCircle, X } from 'lucide-react';

const typeConfig = {
  danger: { icon: Trash2, color: '#ef4444', bg: '#fef2f2', btnBg: '#ef4444', btnHover: '#dc2626' },
  warning: { icon: AlertTriangle, color: '#f59e0b', bg: '#fffbeb', btnBg: '#f59e0b', btnHover: '#d97706' },
  info: { icon: CheckCircle, color: '#3b82f6', bg: '#eff6ff', btnBg: '#3b82f6', btnHover: '#2563eb' },
};

function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' }) {
  if (!isOpen) return null;

  const config = typeConfig[type] || typeConfig.danger;
  const Icon = config.icon;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'white', borderRadius: '16px', width: '100%', maxWidth: '420px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.25)', animation: 'modalSlideIn 0.3s ease',
      }}>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%', background: config.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Icon size={28} color={config.color} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 8px' }}>
            {title || 'Are you sure?'}
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
            {message || 'This action cannot be undone.'}
          </p>
        </div>
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #e5e7eb',
          display: 'flex', gap: '12px', justifyContent: 'flex-end',
        }}>
          <button className="btn btn-secondary" onClick={onClose}>{cancelText}</button>
          <button className="btn" onClick={() => { onConfirm(); onClose(); }}
            style={{ background: config.btnBg, color: 'white', border: 'none' }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
