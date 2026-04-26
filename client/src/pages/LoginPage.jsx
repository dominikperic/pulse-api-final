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
        <img src="/pulseapi-logo.png" alt="PulseAPI" className="auth-logo" />
        <h1>Welcome back</h1>
        <p className="subtitle">
          Turn API logs into OpenAPI specs, typed clients, and Swagger-ready workflows.
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
          Recover API contracts from observed request/response traffic with confidence.
        </p>
      </div>
    </div>
  );
}
