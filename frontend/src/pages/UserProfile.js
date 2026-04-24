import React, { useState } from 'react';
import { User, Mail, Briefcase, Building2, Calendar, Shield, Bell, Key, Edit3, Save, X, AlertCircle } from 'lucide-react';
import { useToast } from '../components/Toast';

function UserProfile({ user, onUpdateUser }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || 'Demo CFO',
    email: user?.email || 'demo@financialreports.ai',
    company: 'Acme Corporation',
    department: 'Finance',
  });
  const [errors, setErrors] = useState({});
  const toast = useToast();

  const profileData = {
    name: user?.name || 'Demo CFO',
    email: user?.email || 'demo@financialreports.ai',
    role: user?.role || 'CFO',
    company: 'Acme Corporation',
    department: 'Finance',
    joinDate: 'January 15, 2024',
    lastLogin: new Date().toLocaleString(),
    permissions: ['View Reports', 'Create Reports', 'Manage Budgets', 'AI Insights', 'Export Data', 'Admin Access']
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Name is required';
    if (!formData.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Invalid email';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const updatedUser = { ...user, name: formData.name, email: formData.email };
    if (onUpdateUser) onUpdateUser(updatedUser);
    setEditing(false);
    toast.success('Profile updated successfully!');
  };

  const handleCancel = () => {
    setFormData({ name: user?.name || '', email: user?.email || '', company: 'Acme Corporation', department: 'Finance' });
    setErrors({});
    setEditing(false);
  };

  const inputStyle = (key) => ({
    padding: '10px 14px', border: `2px solid ${errors[key] ? '#ef4444' : '#e5e7eb'}`,
    borderRadius: '8px', fontSize: '15px', outline: 'none', width: '100%', boxSizing: 'border-box',
  });

  return (
    <div>
      {/* Profile Header */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ padding: '32px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{
            width: '100px', height: '100px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0,
          }}>
            <User size={48} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: '0 0 8px' }}>{profileData.name}</h2>
            <p style={{ fontSize: '16px', color: '#6b7280', margin: '0 0 4px' }}>{profileData.role} at {profileData.company}</p>
            <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>{profileData.email}</p>
          </div>
          <button className={editing ? 'btn btn-secondary' : 'btn btn-primary'}
            onClick={() => editing ? handleCancel() : setEditing(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {editing ? <><X size={16} /> Cancel</> : <><Edit3 size={16} /> Edit Profile</>}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
        {/* Personal Information */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Personal Information</h3>
            {editing && (
              <button className="btn btn-primary" onClick={handleSave} style={{ padding: '8px 16px', fontSize: '13px' }}>
                <Save size={14} /> Save Changes
              </button>
            )}
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                { icon: User, color: '#3b82f6', bg: '#eff6ff', label: 'Full Name', key: 'name', value: profileData.name },
                { icon: Mail, color: '#10b981', bg: '#ecfdf5', label: 'Email', key: 'email', value: profileData.email },
                { icon: Briefcase, color: '#8b5cf6', bg: '#f5f3ff', label: 'Role', value: profileData.role },
                { icon: Building2, color: '#f59e0b', bg: '#fef3c7', label: 'Company', key: 'company', value: profileData.company },
              ].map((item, i) => {
                const Icon = item.icon;
                const isEditable = editing && item.key && (item.key === 'name' || item.key === 'email');
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={20} color={item.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
                      {isEditable ? (
                        <div>
                          <input value={formData[item.key]} onChange={(e) => setFormData(prev => ({ ...prev, [item.key]: e.target.value }))}
                            style={inputStyle(item.key)} />
                          {errors[item.key] && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: '#ef4444', fontSize: '12px' }}><AlertCircle size={12} /> {errors[item.key]}</div>}
                        </div>
                      ) : (
                        <div style={{ fontSize: '16px', fontWeight: '500', color: '#111827' }}>{item.value}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Account Details</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                { icon: Calendar, color: '#ec4899', bg: '#fce7f3', label: 'Member Since', value: profileData.joinDate },
                { icon: Bell, color: '#0ea5e9', bg: '#e0f2fe', label: 'Last Login', value: profileData.lastLogin },
                { icon: Key, color: '#22c55e', bg: '#dcfce7', label: 'Account Status', value: 'Active', valueColor: '#22c55e' },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={20} color={item.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
                      <div style={{ fontSize: '16px', fontWeight: '500', color: item.valueColor || '#111827' }}>{item.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <h3 className="card-title">Permissions & Access</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {profileData.permissions.map((permission, index) => (
                <div key={index} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0',
                }}>
                  <Shield size={16} color="#22c55e" />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#166534' }}>{permission}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
