import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useToast } from './Toast';

function FormModal({ isOpen, onClose, title, fields, onSubmit, initialData = {} }) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      const initial = {};
      fields.forEach(field => {
        if (initialData[field.key] != null && initialData[field.key] !== '') {
          initial[field.key] = initialData[field.key];
        } else if (field.defaultValue != null) {
          initial[field.key] = field.defaultValue;
        } else {
          initial[field.key] = '';
        }
      });
      setFormData(initial);
      setErrors({});
      setTouched({});
    }
  }, [isOpen, initialData, fields]);

  if (!isOpen) return null;

  const validateField = (field, value) => {
    if (field.required && (!value || String(value).trim() === '')) {
      return `${field.label} is required`;
    }
    if (field.type === 'number' && value) {
      const num = parseFloat(value);
      if (isNaN(num)) return `${field.label} must be a valid number`;
      if (field.min != null && num < field.min) return `${field.label} must be at least ${field.min}`;
      if (field.max != null && num > field.max) return `${field.label} must be at most ${field.max}`;
    }
    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return 'Please enter a valid email address';
    }
    if (field.minLength && value && value.length < field.minLength) {
      return `${field.label} must be at least ${field.minLength} characters`;
    }
    if (field.maxLength && value && value.length > field.maxLength) {
      return `${field.label} must be at most ${field.maxLength} characters`;
    }
    if (field.pattern && value && !new RegExp(field.pattern).test(value)) {
      return field.patternMessage || `${field.label} format is invalid`;
    }
    if (field.validate) {
      return field.validate(value, formData);
    }
    return null;
  };

  const validateAll = () => {
    const newErrors = {};
    let hasErrors = false;
    fields.forEach(field => {
      const error = validateField(field, formData[field.key]);
      if (error) {
        newErrors[field.key] = error;
        hasErrors = true;
      }
    });
    setErrors(newErrors);
    setTouched(fields.reduce((acc, f) => ({ ...acc, [f.key]: true }), {}));
    return !hasErrors;
  };

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    const field = fields.find(f => f.key === key);
    if (field && touched[key]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [key]: error }));
    }
  };

  const handleBlur = (key) => {
    setTouched(prev => ({ ...prev, [key]: true }));
    const field = fields.find(f => f.key === key);
    if (field) {
      const error = validateField(field, formData[key]);
      setErrors(prev => ({ ...prev, [key]: error }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll()) {
      toast.error('Please fix the validation errors before submitting.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit(formData);
      toast.success('Record saved successfully!');
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Error saving data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field) => {
    const value = formData[field.key] != null ? formData[field.key] : '';
    const hasError = touched[field.key] && errors[field.key];
    const borderColor = hasError ? '#ef4444' : '#d1d5db';
    const baseStyle = {
      width: '100%', padding: '10px 12px', border: `2px solid ${borderColor}`,
      borderRadius: '8px', fontSize: '14px', transition: 'border-color 0.2s',
      outline: 'none', boxSizing: 'border-box',
    };

    switch (field.type) {
      case 'select':
        return (
          <select value={value} onChange={(e) => handleChange(field.key, e.target.value)}
            onBlur={() => handleBlur(field.key)} style={{ ...baseStyle, backgroundColor: 'white' }}>
            <option value="">Select {field.label}...</option>
            {field.options && field.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea value={value} onChange={(e) => handleChange(field.key, e.target.value)}
            onBlur={() => handleBlur(field.key)} placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            rows={3} style={{ ...baseStyle, resize: 'vertical' }} />
        );
      case 'number':
        return (
          <input type="number" value={value} onChange={(e) => handleChange(field.key, e.target.value)}
            onBlur={() => handleBlur(field.key)} placeholder={field.placeholder || '0'}
            step={field.step || 'any'} min={field.min} max={field.max} style={baseStyle} />
        );
      case 'date':
        return (
          <input type="date" value={value} onChange={(e) => handleChange(field.key, e.target.value)}
            onBlur={() => handleBlur(field.key)} style={baseStyle} />
        );
      case 'email':
        return (
          <input type="email" value={value} onChange={(e) => handleChange(field.key, e.target.value)}
            onBlur={() => handleBlur(field.key)} placeholder={field.placeholder || 'email@example.com'}
            style={baseStyle} />
        );
      case 'password':
        return (
          <input type="password" value={value} onChange={(e) => handleChange(field.key, e.target.value)}
            onBlur={() => handleBlur(field.key)} placeholder={field.placeholder || '••••••••'}
            style={baseStyle} />
        );
      default:
        return (
          <input type="text" value={value} onChange={(e) => handleChange(field.key, e.target.value)}
            onBlur={() => handleBlur(field.key)} placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            style={baseStyle} />
        );
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {fields.map((field) => (
                <div key={field.key} style={field.fullWidth ? { gridColumn: 'span 2' } : {}}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                    {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  {renderField(field)}
                  {touched[field.key] && errors[field.key] && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: '#ef4444', fontSize: '12px' }}>
                      <AlertCircle size={12} /> {errors[field.key]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FormModal;
