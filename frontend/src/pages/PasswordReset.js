import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Mail, ArrowLeft, CheckCircle, Send, Lock, AlertCircle } from 'lucide-react';

function PasswordReset() {
  const [step, setStep] = useState('request'); // request | sent | reset
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email'); return; }
    setLoading(true);
    setError('');
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    setStep('sent');
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!code.trim() || code.length < 6) { setError('Please enter the 6-digit code'); return; }
    setLoading(true);
    setError('');
    await new Promise(resolve => setTimeout(resolve, 800));
    setLoading(false);
    setStep('reset');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!newPassword) errs.newPassword = 'Password is required';
    else if (newPassword.length < 6) errs.newPassword = 'Must be at least 6 characters';
    if (newPassword !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    setError('');
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    setStep('done');
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb',
    borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
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
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '72px', height: '72px',
            background: step === 'done' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', color: 'white',
          }}>
            {step === 'done' ? <CheckCircle size={40} /> : <Lock size={40} />}
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b', margin: '0 0 6px' }}>
            {step === 'request' && 'Reset Password'}
            {step === 'sent' && 'Check Your Email'}
            {step === 'reset' && 'Set New Password'}
            {step === 'done' && 'Password Updated!'}
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            {step === 'request' && 'Enter your email to receive a reset code'}
            {step === 'sent' && `We sent a 6-digit code to ${email}`}
            {step === 'reset' && 'Create your new password'}
            {step === 'done' && 'Your password has been successfully reset'}
          </p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px', borderRadius: '8px', fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {step === 'request' && (
          <form onSubmit={handleRequestReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                <Mail size={16} /> Email Address
              </label>
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="your@email.com" style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '14px', fontSize: '16px', fontWeight: '600', borderRadius: '10px',
              background: '#2563eb', color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}>
              <Send size={18} /> {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>
        )}

        {step === 'sent' && (
          <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px', display: 'block' }}>
                Verification Code
              </label>
              <input type="text" value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                placeholder="000000" maxLength={6}
                style={{ ...inputStyle, textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: '700' }} />
            </div>
            <button type="submit" disabled={loading} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '14px', fontSize: '16px', fontWeight: '600', borderRadius: '10px',
              background: '#2563eb', color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
            <button type="button" onClick={() => setStep('request')} style={{
              background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '14px',
            }}>
              Didn't receive the code? Try again
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                <Lock size={16} /> New Password
              </label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters" style={inputStyle} />
              {errors.newPassword && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: '#ef4444', fontSize: '12px' }}><AlertCircle size={12} /> {errors.newPassword}</div>}
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                <Lock size={16} /> Confirm Password
              </label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password" style={inputStyle} />
              {errors.confirmPassword && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: '#ef4444', fontSize: '12px' }}><AlertCircle size={12} /> {errors.confirmPassword}</div>}
            </div>
            <button type="submit" disabled={loading} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '14px', fontSize: '16px', fontWeight: '600', borderRadius: '10px',
              background: '#2563eb', color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <Link to="/login" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '14px', fontSize: '16px', fontWeight: '600', borderRadius: '10px',
            background: '#10b981', color: 'white', textDecoration: 'none',
          }}>
            <ArrowLeft size={18} /> Back to Sign In
          </Link>
        )}

        {step !== 'done' && (
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginTop: '20px' }}>
            <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default PasswordReset;
