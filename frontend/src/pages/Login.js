import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, LogIn, Sparkles } from 'lucide-react';

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

    setTimeout(() => {
      if (email && password) {
        const user = {
          id: '1',
          email: email,
          name: email === 'demo@financialreports.ai' ? 'Demo CFO' : 'User',
          role: 'CFO'
        };
        localStorage.setItem('user', JSON.stringify(user));
        onLogin(user);
        navigate('/');
      } else {
        setError('Please enter email and password');
      }
      setLoading(false);
    }, 500);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
      padding: '20px',
    },
    card: {
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      width: '100%',
      maxWidth: '420px',
      padding: '40px',
    },
    header: {
      textAlign: 'center',
      marginBottom: '32px',
    },
    logo: {
      width: '80px',
      height: '80px',
      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      borderRadius: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 20px',
      color: 'white',
    },
    title: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#1e293b',
      margin: '0 0 8px 0',
    },
    subtitle: {
      color: '#64748b',
      margin: 0,
      fontSize: '14px',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    },
    errorBox: {
      background: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#dc2626',
      padding: '12px',
      borderRadius: '8px',
      fontSize: '14px',
      textAlign: 'center',
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    label: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
    },
    input: {
      padding: '12px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '10px',
      fontSize: '16px',
      transition: 'all 0.2s',
      outline: 'none',
    },
    loginBtn: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '14px 24px',
      fontSize: '16px',
      fontWeight: '600',
      borderRadius: '10px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      background: '#2563eb',
      color: 'white',
      border: 'none',
    },
    divider: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      color: '#9ca3af',
      fontSize: '14px',
    },
    dividerLine: {
      flex: 1,
      height: '1px',
      background: '#e5e7eb',
    },
    demoBtn: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '14px 24px',
      fontSize: '16px',
      fontWeight: '600',
      borderRadius: '10px',
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    hint: {
      textAlign: 'center',
      color: '#64748b',
      fontSize: '13px',
      margin: 0,
    },
    footer: {
      marginTop: '32px',
      paddingTop: '20px',
      borderTop: '1px solid #e5e7eb',
      textAlign: 'center',
    },
    footerText: {
      color: '#94a3b8',
      fontSize: '13px',
      margin: 0,
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>
            <Building2 size={48} />
          </div>
          <h1 style={styles.title}>AI Financial Report Generator</h1>
          <p style={styles.subtitle}>Enterprise SaaS for CFOs</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.errorBox}>{error}</div>}

          <div style={styles.formGroup}>
            <label style={styles.label}>
              <Mail size={18} />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              <Lock size={18} />
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={styles.input}
              required
            />
          </div>

          <button type="submit" style={styles.loginBtn} disabled={loading}>
            <LogIn size={18} />
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div style={styles.divider}>
            <div style={styles.dividerLine}></div>
            <span>or</span>
            <div style={styles.dividerLine}></div>
          </div>

          <button type="button" style={styles.demoBtn} onClick={handleDemoLogin}>
            <Sparkles size={18} />
            Try Demo Account
          </button>

          <p style={styles.hint}>
            Click "Try Demo Account" to auto-fill demo credentials
          </p>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>Powered by AI | Accuracy + Speed for CFOs</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
