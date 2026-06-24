import { useAuth } from '../context/AuthContext.jsx';

// M2 dashboard: proves the authenticated session. KPI strip + priority queue
// + full layout land in M3/M6.
export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div className="spread" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ color: 'var(--brand)', marginBottom: 4 }}>LUC CRM</h1>
          <p className="muted">In-house lead-to-admission CRM · Learners Education</p>
        </div>
        <div className="row">
          <span className="avatar">{user?.name?.[0]?.toUpperCase()}</span>
          <div>
            <strong style={{ fontSize: 14 }}>{user?.name}</strong>
            <div className="muted" style={{ fontSize: 12 }}>{user?.role}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
        </div>
      </div>

      <section className="card">
        <h3>Signed in</h3>
        <p className="muted">
          Welcome, {user?.name}. Pipeline, capture, workspace, dashboards and the flow/automation
          references are wired up in M3–M7.
        </p>
      </section>
    </main>
  );
}
