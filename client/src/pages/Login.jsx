// M0 placeholder — replaced by the real login form + AuthContext in M2.
export default function Login() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg, var(--dark), var(--dark-2))',
      }}
    >
      <section
        style={{
          background: 'var(--surface)',
          padding: '2.5rem 3rem',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow)',
          textAlign: 'center',
        }}
      >
        <h1 style={{ color: 'var(--brand)' }}>LUC CRM</h1>
        <p style={{ color: 'var(--ink-2)' }}>Learners Education · lead-to-admission</p>
        <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>Sign-in arrives in M2.</p>
      </section>
    </main>
  );
}
