import { useQuery } from '@tanstack/react-query';

// M0 placeholder dashboard — proves the SPA renders and can reach the API.
// Real KPI strip + priority queue land in M3/M6.
export default function Dashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('health failed');
      return res.json();
    },
  });

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--brand)' }}>LUC CRM</h1>
        <p style={{ color: 'var(--ink-2)' }}>
          In-house lead-to-admission CRM · Learners Education
        </p>
      </header>

      <section
        style={{
          background: 'var(--surface)',
          padding: '1.5rem',
          borderRadius: 'var(--r)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--line)',
        }}
      >
        <h2 style={{ fontSize: 16 }}>API status</h2>
        {isLoading && <p style={{ color: 'var(--ink-3)' }}>Checking…</p>}
        {isError && <p style={{ color: 'var(--rose)' }}>API unreachable</p>}
        {data?.ok && (
          <p style={{ color: 'var(--emerald)' }}>● Healthy — same-origin API responding.</p>
        )}
      </section>
    </main>
  );
}
