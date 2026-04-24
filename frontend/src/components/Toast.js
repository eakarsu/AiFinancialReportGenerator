import React, { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const icons = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const colors = {
  success: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46', icon: '#10b981' },
  warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', icon: '#f59e0b' },
  error: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', icon: '#ef4444' },
  info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', icon: '#3b82f6' },
};

function ToastItem({ toast, onRemove }) {
  const [exiting, setExiting] = useState(false);
  const Icon = icons[toast.type] || Info;
  const color = colors[toast.type] || colors.info;

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '14px 16px', borderRadius: '12px',
      background: color.bg, border: `1px solid ${color.border}`,
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
      minWidth: '320px', maxWidth: '480px',
      animation: exiting ? 'toastOut 0.3s ease forwards' : 'toastIn 0.3s ease',
      transition: 'all 0.3s ease',
    }}>
      <Icon size={20} color={color.icon} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        {toast.title && <div style={{ fontWeight: 600, fontSize: '14px', color: color.text, marginBottom: '2px' }}>{toast.title}</div>}
        <div style={{ fontSize: '13px', color: color.text, opacity: 0.9 }}>{toast.message}</div>
      </div>
      <button onClick={() => { setExiting(true); setTimeout(() => onRemove(toast.id), 300); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', color: color.text, opacity: 0.5 }}>
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message, title, duration) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message, title, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useMemo(() => ({
    success: (message, title) => addToast('success', message, title),
    error: (message, title) => addToast('error', message, title),
    warning: (message, title) => addToast('warning', message, title),
    info: (message, title) => addToast('info', message, title),
  }), [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { success: () => {}, error: () => {}, warning: () => {}, info: () => {} };
  }
  return ctx;
}

export default ToastProvider;
