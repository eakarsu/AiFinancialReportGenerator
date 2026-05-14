import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Mail, Lock, UserPlus, User, Briefcase, AlertCircle } from 'lucide-react';
import { register as registerApi } from '../services/api';

function Register({ onLogin }) {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'analyst' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const navigate = useNavigate();

  const roles = [
    { value: 'analyst', label: 'Analyst' },
    { value: 'manager', label: 'Manager' },
    { value: 'director', label: 'Director' },
    { value: 'cfo', label: 'CFO' },
    { value: 'viewer', label: 'Viewer' },
  ];

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';
    else if (formData.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!formData.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Invalid email address';
    if (!formData.password) errs.password = 'Password is required';
    else if (formData.password.length < 6) errs.password = 'Password must be at least 6 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])/.test(formData.password)) errs.password = 'Must contain upper and lowercase letters';
    if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError('');
    try {
      const { data } = await registerApi({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
      const user = data.user || data;
      if (data.token) localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(user));
      onLogin(user);
      navigate('/');
    } catch (error) {
      setServerError(error?.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (key) => ({
    width: '100%', padding: '12px 16px', border: `2px solid ${errors[key] ? '#ef4444' : '#e5e7eb'}`,
    borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  });

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', padding: '20px',
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        width: '100%', maxWidth: '480px', padding: '40px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '72px', height: '72px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', color: 'white',
          }}>
            <Building2 size={40} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b', margin: '0 0 6px' }}>Create Account</h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Join AI Financial Report Generator</p>
        </div>

        {serverError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px', borderRadius: '8px', fontSize: '14px', textAlign: 'center', marginBottom: '20px' }}>
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
              <User size={16} /> Full Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)}
              placeholder="John Smith" style={inputStyle('name')} />
            {errors.name && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: '#ef4444', fontSize: '12px' }}><AlertCircle size={12} /> {errors.name}</div>}
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
              <Mail size={16} /> Email <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)}
              placeholder="john@company.com" style={inputStyle('email')} />
            {errors.email && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: '#ef4444', fontSize: '12px' }}><AlertCircle size={12} /> {errors.email}</div>}
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
              <Briefcase size={16} /> Role
            </label>
            <select value={formData.role} onChange={(e) => handleChange('role', e.target.value)}
              style={{ ...inputStyle('role'), cursor: 'pointer', backgroundColor: 'white' }}>
              {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
              <Lock size={16} /> Password <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input type="password" value={formData.password} onChange={(e) => handleChange('password', e.target.value)}
              placeholder="Min 6 chars, upper & lowercase" style={inputStyle('password')} />
            {errors.password && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: '#ef4444', fontSize: '12px' }}><AlertCircle size={12} /> {errors.password}</div>}
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
              <Lock size={16} /> Confirm Password <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input type="password" value={formData.confirmPassword} onChange={(e) => handleChange('confirmPassword', e.target.value)}
              placeholder="Re-enter password" style={inputStyle('confirmPassword')} />
            {errors.confirmPassword && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: '#ef4444', fontSize: '12px' }}><AlertCircle size={12} /> {errors.confirmPassword}</div>}
          </div>

          <button type="submit" disabled={loading} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '14px', fontSize: '16px', fontWeight: '600', borderRadius: '10px',
            background: '#2563eb', color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, marginTop: '4px',
          }}>
            <UserPlus size={18} />
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', margin: '8px 0 0' }}>
            Already have an account? <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>Sign In</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Register;
