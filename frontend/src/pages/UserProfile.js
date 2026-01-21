import React from 'react';
import { User, Mail, Briefcase, Building2, Calendar, Shield, Bell, Key } from 'lucide-react';

function UserProfile({ user }) {
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

  return (
    <div>
      {/* Profile Header */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ padding: '32px', display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <User size={48} />
          </div>
          <div>
            <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: '0 0 8px 0' }}>
              {profileData.name}
            </h2>
            <p style={{ fontSize: '16px', color: '#6b7280', margin: '0 0 4px 0' }}>
              {profileData.role} at {profileData.company}
            </p>
            <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
              {profileData.email}
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
        {/* Personal Information */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Personal Information</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={20} color="#3b82f6" />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: '#111827' }}>{profileData.name}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={20} color="#10b981" />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: '#111827' }}>{profileData.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={20} color="#8b5cf6" />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: '#111827' }}>{profileData.role}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={20} color="#f59e0b" />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Company</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: '#111827' }}>{profileData.company}</div>
                </div>
              </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={20} color="#ec4899" />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Member Since</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: '#111827' }}>{profileData.joinDate}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={20} color="#0ea5e9" />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Login</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: '#111827' }}>{profileData.lastLogin}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Key size={20} color="#22c55e" />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account Status</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: '#22c55e' }}>Active</div>
                </div>
              </div>
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: '#f0fdf4',
                  borderRadius: '8px',
                  border: '1px solid #bbf7d0'
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
