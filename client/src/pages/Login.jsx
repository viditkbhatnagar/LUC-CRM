import { useState } from 'react';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ApiError } from '../lib/api.js';
import Logo from '../components/Logo.jsx';

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
    <main className="auth-split">
      {/* Brand panel */}
      <section className="auth-brand">
        <Link to="/welcome" className="mark" style={{ color: '#fff', position: 'relative', zIndex: 1 }}>
          <Logo badge={30} />
        </Link>
        <div className="auth-hero">
          <h2>Every enquiry, worked to a <span className="hl">won admission</span>.</h2>
          <p>The lead-to-admission workspace for Learners Education — controlled, gated, and never idle.</p>
        </div>
        <div className="auth-stats">
          <div className="s"><div className="n">13</div><div className="l">lifecycle stages</div></div>
          <div className="s"><div className="n">5</div><div className="l">live dashboards</div></div>
          <div className="s"><div className="n">SLA</div><div className="l">on every stage</div></div>
        </div>
      </section>

      {/* Form panel */}
      <section className="auth-form-wrap">
        <div className="auth-card">
          <h1>Welcome back</h1>
          <p className="tagline">Sign in to your workspace</p>

          {error && <div className="alert alert-error" role="alert">{error}</div>}

          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={busy} style={{ marginTop: '0.4rem' }}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="hint">
            Demo accounts (password <strong>password123</strong>):<br />
            admin@learnerseducation.com · mariam@learnerseducation.com (team lead)<br />
            sara@learnerseducation.com · nadia@learnerseducation.com · ibrahim@learnerseducation.com
          </p>
        </div>
      </section>
    </main>
  );
}
