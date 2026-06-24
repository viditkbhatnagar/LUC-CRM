import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ApiError } from '../lib/api.js';

export default function Login() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) {
    const to = location.state?.from?.pathname || '/';
    return <Navigate to={to} replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <div className="row" style={{ marginBottom: '0.4rem' }}>
          <span className="sidebar-dot" style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--brand-3)' }} />
          <h1 style={{ margin: 0 }}>LUC CRM</h1>
        </div>
        <p className="tagline">Learners Education · lead-to-admission</p>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="hint">
          Seeded accounts (password <strong>Passw0rd!</strong>):<br />
          admin@luc.edu · mariam@luc.edu (team lead) · sara@luc.edu · nadia@luc.edu · ibrahim@luc.edu
        </p>
      </section>
    </main>
  );
}
