import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';
import Topbar from '../components/Topbar.jsx';
import Stat from '../components/Stat.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const DONUT_COLORS = ['#1d921e', '#41bf45', '#0fb5a0', '#3b82f6', '#8b5cf6', '#d9870f', '#e8590c', '#e23b54'];
import {
  useKpis, useSourcePerformance, useFunnel, useStageAging,
  useLostReasons, useRule1Check, useCounsellorPerformance,
} from '../hooks/useReports.js';

function Bar100({ pct }) {
  return (
    <div className="row" style={{ gap: 8 }}>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min(100, pct)}%` }} /></div>
      <span style={{ fontSize: 12, width: 36 }}>{pct}%</span>
    </div>
  );
}

export default function Reports() {
  const { user, isManager } = useAuth();
  const kpis = useKpis();
  const source = useSourcePerformance();
  const funnel = useFunnel();
  const aging = useStageAging();
  const lost = useLostReasons();
  const rule1 = useRule1Check();
  const counsellors = useCounsellorPerformance();

  const k = kpis.data || {};
  const funnelData = (funnel.data || []).map((s) => ({ ...s, short: s.label.split(' ')[0] }));

  return (
    <>
      <Topbar title="Dashboards" subtitle={isManager ? 'Team-wide analytics' : 'Your slice'} />
      <div className="content stack" style={{ gap: '1.4rem' }}>
        {/* KPI strip */}
        <section className="grid-kpi">
          <Stat label="Total leads" value={k.total} brand />
          <Stat label="Active" value={k.active} />
          <Stat label="Meetings" value={k.meetings} />
          <Stat label="Offers out" value={k.offersOut} />
          <Stat label="Won" value={k.won} brand />
          <Stat label="Lost" value={k.lost} />
          <Stat label="Overdue" value={k.overdue} danger />
          <Stat label="Win rate" value={k.winRate} suffix="%" brand />
        </section>

        {/* Rule-1 check */}
        <section className="card" style={{ borderLeft: `4px solid ${rule1.data?.leadsWithNoTask ? 'var(--rose)' : 'var(--emerald)'}` }}>
          <div className="spread">
            <div>
              <h3 style={{ margin: 0 }}>Rule 1 · No idle leads</h3>
              <p className="muted" style={{ margin: '0.2rem 0 0' }}>Open leads with no next task (should be 0)</p>
            </div>
            <div className="value" style={{ fontSize: '2rem', color: rule1.data?.leadsWithNoTask ? 'var(--rose)' : 'var(--emerald)' }}>
              {rule1.data?.leadsWithNoTask ?? '–'}
            </div>
          </div>
        </section>

        {/* Funnel + source donut */}
        <div className="chart-row">
          <section className="card">
            <h3>Funnel · live counts across 13 stages</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData} margin={{ top: 8, right: 16, bottom: 40, left: 0 }}>
                <XAxis dataKey="short" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 11 }} height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [v, 'leads']} labelFormatter={(_, p) => p?.[0]?.payload?.label} />
                <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                  {funnelData.map((_, i) => <Cell key={i} fill="var(--accent)" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>

          <section className="card">
            <h3>Lead sources</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={source.data || []} dataKey="leads" nameKey="source" cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={2} stroke="none">
                  {(source.data || []).map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-legend">
              {(source.data || []).map((s, i) => (
                <div className="donut-leg" key={s.source}>
                  <span className="sw" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  {s.source} <span className="n">{s.leads}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="ws-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {/* Source performance */}
          <section className="card">
            <h3>Source performance</h3>
            <table className="table">
              <thead><tr><th>Source</th><th>Leads</th><th>Admissions</th><th>Conversion</th></tr></thead>
              <tbody>
                {(source.data || []).map((r) => (
                  <tr key={r.source}>
                    <td>{r.source}</td><td>{r.leads}</td><td>{r.admissions}</td>
                    <td><Bar100 pct={r.conversionPct} /></td>
                  </tr>
                ))}
                {source.data?.length === 0 && <tr><td colSpan="4" className="muted">No data</td></tr>}
              </tbody>
            </table>
          </section>

          {/* Lost reasons */}
          <section className="card">
            <h3>Lost-reason analysis</h3>
            <table className="table">
              <thead><tr><th>Reason</th><th>Count</th><th>Recommended fix</th></tr></thead>
              <tbody>
                {(lost.data || []).map((r) => (
                  <tr key={r.reason}>
                    <td>{r.label}</td><td>{r.count}</td><td className="muted">{r.recommendedFix}</td>
                  </tr>
                ))}
                {lost.data?.length === 0 && <tr><td colSpan="3" className="muted">No exits yet</td></tr>}
              </tbody>
            </table>
          </section>
        </div>

        {/* Stage aging */}
        <section className="card">
          <h3>Stage aging</h3>
          <table className="table">
            <thead><tr><th>Stage</th><th>Open</th><th>Max age</th><th>Stuck</th><th>Status</th></tr></thead>
            <tbody>
              {(aging.data || []).map((r) => (
                <tr key={r.stage}>
                  <td>{r.label}</td><td>{r.open}</td><td className="muted">{r.maxAge}</td><td>{r.stuckCount}</td>
                  <td><span className={`tag ${r.flag === 'stuck' ? 'tag-overdue' : 'tag-success'}`}>{r.flag}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Counsellor performance (manager only) */}
        {isManager && (
          <section className="card">
            <h3>Counsellor performance</h3>
            <table className="table">
              <thead><tr><th>Counsellor</th><th>Assigned</th><th>Meetings</th><th>Offers</th><th>Admissions</th><th>Overdue</th></tr></thead>
              <tbody>
                {(counsellors.data || []).filter((r) => r.role === 'counsellor').map((r) => (
                  <tr key={r.counsellor}>
                    <td>{r.counsellor}</td><td>{r.assigned}</td><td>{r.meetings}</td><td>{r.offers}</td>
                    <td>{r.admissions}</td>
                    <td style={{ color: r.overdue ? 'var(--rose)' : undefined }}>{r.overdue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </>
  );
}
