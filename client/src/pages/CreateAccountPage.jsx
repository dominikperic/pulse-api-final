import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function CreateAccountPage() {
  const navigate = useNavigate();
  const { authed, authReady, signUp } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!authReady) return null;
  if (authed) return <Navigate to="/dashboard" replace />;

  const canSubmit = Boolean(email.trim()) && Boolean(password.trim()) && !busy;

  async function handleCreateAccount(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signUp({ email, password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Account creation failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/pulseapi-logo.png" alt="PulseAPI" className="auth-logo" />
        <h1>Create account</h1>
        <p className="subtitle">Create an account to start validating API contracts.</p>

        <form onSubmit={handleCreateAccount} aria-label="Create account form">
          {error ? <p style={{ margin: '0 0 12px', color: '#9b1c1c', fontSize: 13 }}>{error}</p> : null}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="auth-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!canSubmit}
              title={!canSubmit ? 'Enter your email and password.' : ''}
            >
              {busy ? 'Working...' : 'Create Account'}
            </button>
          </div>
        </form>

        <p className="helper" style={{ marginTop: 8 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
