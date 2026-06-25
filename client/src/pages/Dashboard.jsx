import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar.jsx';
import Icon from '../components/Icon.jsx';
import Ring from '../components/Ring.jsx';
import Doodle from '../components/Doodle.jsx';
import { ScoreTag } from '../components/Tag.jsx';
import { useLeads } from '../hooks/useLeads.js';
import { useWorkflow } from '../hooks/useWorkflow.js';
import { useKpis } from '../hooks/useReports.js';
import { useCountUp } from '../hooks/useCountUp.js';
import { useAuth } from '../context/AuthContext.jsx';
import { isOverdue, dueLabel, initials } from '../lib/format.js';

const PHASE_META = [
  { slug: 'capture', label: 'Capture', color: 'var(--blue)' },
  { slug: 'meeting', label: 'Meeting', color: 'var(--violet)' },
  { slug: 'convert', label: 'Convert', color: 'var(--amber)' },
  { slug: 'close', label: 'Close', color: 'var(--accent)' },
];

function StatTile({ label, value, icon, color }) {
  const n = useCountUp(typeof value === 'number' ? value : 0);
  return (
    <div className="stat-tile">
      <div className="ic" style={{ background: color }}><Icon name={icon} size={20} /></div>
      <div className="v" style={{ color: label === 'Overdue' && value ? 'var(--rose)' : undefined }}>{n}</div>
      <div className="l">{label}</div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useLeads({ status: 'open', limit: 100, sort: 'nextActionDate' });
  const { data: meta } = useWorkflow();
  const { data: kpis } = useKpis();

  const stageLabel = useMemo(() => Object.fromEntries((meta?.stages || []).map((s) => [s.slug, s.label])), [meta]);
  const phaseOf = useMemo(() => Object.fromEntries((meta?.stages || []).map((s) => [s.slug, s.phase])), [meta]);

  const leads = data?.leads || [];
  const queue = useMemo(
    () => [...leads].sort((a, b) => {
      const ao = isOverdue(a.nextActionDate) ? 1 : 0;
      const bo = isOverdue(b.nextActionDate) ? 1 : 0;
      if (ao !== bo) return bo - ao;
      return (b.score || 0) - (a.score || 0);
    }),
    [leads],
  );
  const overdue = useMemo(() => queue.filter((l) => isOverdue(l.nextActionDate)), [queue]);

  const phaseDist = useMemo(() => {
    const counts = { capture: 0, meeting: 0, convert: 0, close: 0 };
    leads.forEach((l) => { const p = phaseOf[l.stage]; if (counts[p] != null) counts[p] += 1; });
    const total = leads.length || 1;
    return PHASE_META.map((p) => ({ ...p, count: counts[p.slug], pct: (counts[p.slug] / total) * 100 }));
  }, [leads, phaseOf]);

  const winRate = kpis?.winRate ?? 0;

  return (
    <>
      <Topbar title="Overview" subtitle="Today at a glance" />
      <div className="content">
        <div className="bento">
          {/* Hero greeting */}
          <div className="hero-card c-8">
            <div>
              <div className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
              <h2>{greeting()}, {user?.name?.split(' ')[0] || 'there'}.</h2>
              <div className="sub">
                {overdue.length > 0
                  ? `${overdue.length} lead${overdue.length > 1 ? 's' : ''} need you now — ${leads.length} in play today.`
                  : `${leads.length} active lead${leads.length === 1 ? '' : 's'} in play. Nothing overdue — nice.`}
              </div>
            </div>
            <div className="hero-actions">
              <button className="btn btn-on-dark" onClick={() => navigate('/capture')}><Icon name="capture" size={16} /> Capture lead</button>
              <button className="btn btn-on-dark-ghost" onClick={() => navigate('/pipeline')}>View pipeline</button>
            </div>
          </div>

          {/* Win-rate ring */}
          <div className="ring-card c-4">
            <Ring value={winRate} size={132} stroke={13}>
              <div className="ring-center">
                <div className="rv">{winRate}%</div>
                <div className="rl">Win rate</div>
              </div>
            </Ring>
            <div className="muted" style={{ fontSize: 13 }}>
              <strong style={{ color: 'var(--accent-2)' }}>{kpis?.won ?? 0} won</strong> · {kpis?.lost ?? 0} lost · {kpis?.total ?? 0} total
            </div>
          </div>

          {/* Stat tiles */}
          <div className="c-3"><StatTile label="Active" value={kpis?.active ?? leads.length} icon="pipeline" color="var(--accent)" /></div>
          <div className="c-3"><StatTile label="Meetings" value={kpis?.meetings ?? 0} icon="flow" color="var(--violet)" /></div>
          <div className="c-3"><StatTile label="Offers out" value={kpis?.offersOut ?? 0} icon="capture" color="var(--amber)" /></div>
          <div className="c-3"><StatTile label="Overdue" value={overdue.length} icon="bell" color="var(--rose)" /></div>

          {/* Pipeline at a glance */}
          <div className="panel-card c-12">
            <div className="card-h"><h3>Pipeline at a glance</h3><span className="muted" style={{ fontSize: 13 }}>{leads.length} open leads</span></div>
            <div className="phase-dist">
              <div className="phase-bar">
                {phaseDist.map((p) => <span key={p.slug} style={{ width: `${p.pct}%`, background: p.color }} />)}
              </div>
              <div className="phase-legend">
                {phaseDist.map((p) => (
                  <span className="phase-leg" key={p.slug}>
                    <span className="sw" style={{ background: p.color }} /> {p.label} <span className="n">{p.count}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Priority queue */}
          <div className="panel-card c-8">
            <div className="card-h">
              <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Doodle name="sparkle" size={14} color="var(--accent)" /> Priority queue
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/pipeline')}>All leads →</button>
            </div>
            {isLoading && <div className="spinner">Loading…</div>}
            {!isLoading && queue.length === 0 && (
              <div className="empty"><Doodle name="loop" size={46} color="var(--accent-3)" style={{ display: 'block', margin: '0 auto 0.5rem' }} />All clear — no active leads.</div>
            )}
            <div className="queue-grid">
              {queue.slice(0, 8).map((l) => {
                const over = isOverdue(l.nextActionDate);
                return (
                  <article key={l._id} className={`qcard ${over ? 'over' : ''}`} role="button" tabIndex={0}
                    onClick={() => navigate(`/leads/${l._id}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/leads/${l._id}`)}>
                    <span className="avatar">{initials(l.name)}</span>
                    <div className="qbody">
                      <div className="qname">{l.name}</div>
                      <div className="qmeta">{l.program || '—'} · {stageLabel[l.stage] || l.stage}</div>
                    </div>
                    <div className="qright">
                      <ScoreTag score={l.score} />
                      <div className={over ? 'due-over' : 'due'} style={{ fontSize: 12, marginTop: 4 }}>{dueLabel(l.nextActionDate)}</div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* Needs attention */}
          <div className="panel-card c-4">
            <h3>Needs attention</h3>
            {overdue.length === 0 && <div className="muted" style={{ fontSize: 13 }}>Nothing overdue. 🎉</div>}
            {overdue.slice(0, 6).map((l) => (
              <div key={l._id} className="attn-item" role="button" tabIndex={0} style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/leads/${l._id}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/leads/${l._id}`)}>
                <span className="dot" style={{ background: 'var(--rose)', color: 'var(--rose)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{stageLabel[l.stage] || l.stage}</div>
                </div>
                <span className="due-over" style={{ fontSize: 12 }}>{dueLabel(l.nextActionDate)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
