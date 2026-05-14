import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Mail, Lock, LogIn, Sparkles } from 'lucide-react';
import { login as loginApi } from '../services/api';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleDemoLogin = () => {
    setEmail('demo@financialreports.ai');
    setPassword('demo123456');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email || !password) {
      setError('Please enter email and password');
      setLoading(false);
      return;
    }

    try {
      const { data } = await loginApi(email, password);
      const user = data.user || {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
      };
      if (data.token) localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(user));
      onLogin(user);
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', padding: '20px',
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        width: '100%', maxWidth: '420px', padding: '40px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '80px', height: '80px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', color: 'white',
          }}>
            <Building2 size={48} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px' }}>
            AI Financial Report Generator
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Enterprise SaaS for CFOs</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px', borderRadius: '8px', fontSize: '14px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              <Mail size={18} /> Email Address
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email" required
              style={{ padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '16px', outline: 'none' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                <Lock size={18} /> Password
              </label>
              <Link to="/password-reset" style={{ fontSize: '13px', color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>
                Forgot password?
              </Link>
            </div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password" required
              style={{ padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '16px', outline: 'none' }} />
          </div>

          <button type="submit" disabled={loading} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '14px 24px', fontSize: '16px', fontWeight: '600', borderRadius: '10px',
            cursor: 'pointer', background: '#2563eb', color: 'white', border: 'none',
          }}>
            <LogIn size={18} /> {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#9ca3af', fontSize: '14px' }}>
            <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
            <span>or</span>
            <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
          </div>

          <button type="button" onClick={handleDemoLogin} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '14px 24px', fontSize: '16px', fontWeight: '600', borderRadius: '10px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', cursor: 'pointer',
          }}>
            <Sparkles size={18} /> Try Demo Account
          </button>

          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', margin: 0 }}>
            Click "Try Demo Account" to auto-fill demo credentials
          </p>

          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', margin: '4px 0 0' }}>
            Don't have an account? <Link to="/register" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>Sign Up</Link>
          </p>
        </form>

        <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Powered by AI | Accuracy + Speed for CFOs</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
