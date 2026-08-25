import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

type ForgotStep = 'email' | 'otp' | 'password';
type Mode = 'login' | 'verify' | 'forgot';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(15, 23, 42, 0.6)',
  color: '#fff',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#94A3B8',
  display: 'block',
  marginBottom: '6px',
};

const Login: React.FC = () => {
  const { login, verifyEmail, sendResetOtp, verifyResetOtp, resetPassword } = useAuth();

  // Core mode
  const [mode, setMode] = useState<Mode>('login');
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email');

  // Field values
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');

  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setError(null);
    setSuccess(null);
    setCode('');
    setPassword('');
    setConfirmPassword('');
  };

  const goToLogin = () => {
    setMode('login');
    setForgotStep('email');
    reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // ── Email verification after first login ──────────────────────────────
      if (mode === 'verify') {
        await verifyEmail(email, code);
        // verifyEmail logs the user in via context
        return;
      }

      // ── Forgot password flow ──────────────────────────────────────────────
      if (mode === 'forgot') {
        if (forgotStep === 'email') {
          await sendResetOtp(email);
          setSuccess(`A 6-digit reset code has been sent to ${email}. Check your inbox (or API terminal logs).`);
          setForgotStep('otp');
        } else if (forgotStep === 'otp') {
          await verifyResetOtp(email, code);
          setSuccess('Code verified! Enter your new password below.');
          setCode('');
          setForgotStep('password');
        } else if (forgotStep === 'password') {
          if (password !== confirmPassword) throw new Error('Passwords do not match.');
          await resetPassword(email, password);
          setSuccess('Password reset successfully! Please sign in with your new password.');
          goToLogin();
        }
        return;
      }

      // ── Login ─────────────────────────────────────────────────────────────
      const result = await login(email, password);
      if (result.requiresVerification) {
        setMode('verify');
        setCode('');
        setSuccess(`A verification code was sent to ${email}. Check your inbox (or API terminal logs).`);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Titles and subtitles by state ──────────────────────────────────────────
  const title = () => {
    if (mode === 'verify') return 'Verify Your Email';
    if (mode === 'forgot') {
      if (forgotStep === 'email') return 'Reset Password';
      if (forgotStep === 'otp') return 'Enter Reset Code';
      return 'Set New Password';
    }
    return 'Welcome back';
  };

  const subtitle = () => {
    if (mode === 'verify') return 'Enter the 6-digit code sent to your email.';
    if (mode === 'forgot') {
      if (forgotStep === 'email') return 'Enter your registered email to receive a reset code.';
      if (forgotStep === 'otp') return 'Check your inbox for the 6-digit code we sent.';
      return 'Choose a strong new password for your account.';
    }
    return 'Please sign in to access your dashboard.';
  };

  const buttonLabel = () => {
    if (loading) return 'Please wait...';
    if (mode === 'verify') return 'Verify & Sign In';
    if (mode === 'forgot') {
      if (forgotStep === 'email') return 'Send Reset Code';
      if (forgotStep === 'otp') return 'Verify Code';
      return 'Reset Password';
    }
    return 'Sign In';
  };

  // ── Step indicator for forgot flow ─────────────────────────────────────────
  const ForgotStepIndicator = () => {
    const steps = ['Enter Email', 'Verify Code', 'New Password'];
    const currentIdx = forgotStep === 'email' ? 0 : forgotStep === 'otp' ? 1 : 2;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '1.5rem' }}>
        {steps.map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '22px', height: '22px', borderRadius: '50%',
              background: i <= currentIdx ? '#3B82F6' : 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: '700', color: i <= currentIdx ? '#fff' : '#64748B',
              transition: 'background 0.3s',
            }}>{i + 1}</div>
            <span style={{ fontSize: '11px', color: i <= currentIdx ? '#93C5FD' : '#475569', fontWeight: i === currentIdx ? '600' : '400' }}>
              {label}
            </span>
            {i < steps.length - 1 && (
              <div style={{ width: '20px', height: '1px', background: i < currentIdx ? '#3B82F6' : 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px', padding: '2.5rem 2rem', borderRadius: '16px',
        background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3), 0 10px 10px -5px rgba(0,0,0,0.2)',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: '24px', fontWeight: '800', marginBottom: '0.5rem',
          background: 'linear-gradient(to right, #60A5FA, #3B82F6)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em',
        }}>
          {title()}
        </h1>
        <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '1.5rem' }}>{subtitle()}</p>

        {mode === 'forgot' && <ForgotStepIndicator />}

        {success && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px', padding: '0.75rem', color: '#A7F3D0',
            fontSize: '13px', textAlign: 'left', marginBottom: '1.5rem', lineHeight: '1.5',
          }}>
            ✓ {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* ── Email field: shown in login and forgot-email step ── */}
          {(mode === 'login' || (mode === 'forgot' && forgotStep === 'email')) && (
            <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
              <label style={labelStyle}>EMAIL ADDRESS</label>
              <input type="email" placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)} required style={inputStyle} />
            </div>
          )}

          {/* ── Password field: shown in login mode ── */}
          {mode === 'login' && (
            <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>PASSWORD</label>
                <button type="button" onClick={() => { setMode('forgot'); reset(); }}
                  style={{ background: 'none', border: 'none', color: '#60A5FA', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                  Forgot password?
                </button>
              </div>
              <input type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} required style={inputStyle} />
            </div>
          )}

          {/* ── OTP code field: shown in verify and forgot-otp step ── */}
          {(mode === 'verify' || (mode === 'forgot' && forgotStep === 'otp')) && (
            <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <label style={labelStyle}>6-DIGIT CODE</label>
              <input type="text" placeholder="123456" value={code}
                onChange={e => setCode(e.target.value)} required maxLength={6}
                style={{ ...inputStyle, fontSize: '20px', fontWeight: '700', letterSpacing: '6px', textAlign: 'center' }} />
            </div>
          )}

          {/* ── New password fields: shown in forgot-password step ── */}
          {mode === 'forgot' && forgotStep === 'password' && (
            <>
              <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
                <label style={labelStyle}>NEW PASSWORD</label>
                <input type="password" placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} required style={inputStyle} />
              </div>
              <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                <label style={labelStyle}>CONFIRM NEW PASSWORD</label>
                <input type="password" placeholder="••••••••" value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} required style={inputStyle} />
              </div>
            </>
          )}

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px', padding: '0.75rem', color: '#FCA5A5',
              fontSize: '13px', textAlign: 'left', marginBottom: '1.5rem', lineHeight: '1.4',
            }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none',
            background: '#3B82F6', color: '#fff', fontWeight: '600', fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 6px -1px rgba(59,130,246,0.3)',
            transition: 'background-color 0.2s', opacity: loading ? 0.7 : 1,
          }}>
            {buttonLabel()}
          </button>
        </form>

        {(mode === 'forgot' || mode === 'verify') && (
          <div style={{ marginTop: '1.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
            <button onClick={goToLogin} style={{
              background: 'none', border: 'none', color: '#60A5FA',
              fontWeight: '600', fontSize: '13px', cursor: 'pointer', padding: 0, textDecoration: 'underline',
            }}>
              ← Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
