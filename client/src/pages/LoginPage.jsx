import { Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { authed, signIn } = useApp();
  if (authed) return <Navigate to="/dashboard" replace />;

  function handleSignIn(e) {
    e.preventDefault();
    signIn();
    navigate('/dashboard', { replace: true });
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>PulseAPI</h1>
        <p className="subtitle">
          Monitor third-party APIs for schema drift and silent failures
        </p>
        <form onSubmit={handleSignIn} aria-label="Sign in form">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>
          <button type="button" className="link" style={{ marginBottom: 8 }}>
            Forgot Password?
          </button>
          <div className="auth-actions">
            <button type="submit" className="btn btn-primary">
              Sign In
            </button>
            <button type="button" className="btn" onClick={handleSignIn}>
              Create Account
            </button>
          </div>
        </form>
        <p className="helper" style={{ marginTop: 16 }}>
          Secure API monitoring: credentials are encrypted at rest in production (prototype UI only).
        </p>
      </div>
    </div>
  );
}
