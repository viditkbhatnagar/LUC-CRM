import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Doodle from '../components/Doodle.jsx';
import Icon from '../components/Icon.jsx';
import '../styles/landing.css';

const FEATURES = [
  { icon: 'pipeline', bg: 'var(--blue)', title: '13-stage pipeline', body: 'A controlled lead-to-admission lifecycle — every lead in exactly one stage, moved only along defined paths.' },
  { icon: 'overview', bg: 'var(--accent)', title: 'Gates that hold', body: 'Required fields, document verification and a payment money-gate are enforced server-side. No lead skips a step.' },
  { icon: 'automation', bg: 'var(--violet)', title: 'Automations & SLAs', body: 'Acknowledgements, follow-ups, reminders and per-stage SLAs fire on their own. Breaches escalate to managers.' },
  { icon: 'reports', bg: 'var(--success)', title: '5 live dashboards', body: 'Source, funnel, counsellor, aging and lost-reason analytics — straight from live data, scoped by role.' },
];

const PHASES = [
  { ph: 'A · Capture & Qualify', color: 'var(--blue)', title: 'Catch every enquiry', items: ['Dedupe at capture', 'Auto-assign owner', 'First-contact SLA'] },
  { ph: 'B · Meeting', color: 'var(--violet)', title: 'Book & show up', items: ['Schedule + reminders', 'Outcome required', 'No-show recovery'] },
  { ph: 'C · Convert', color: 'var(--amber)', title: 'Handle & offer', items: ['Objection follow-ups', 'Offer + payment plan', 'Day 1/3/7 nudges'] },
  { ph: 'D · Close', color: 'var(--success)', title: 'Verify & win', items: ['Document verification', 'Payment money-gate', 'Admission + receipt'] },
];

const QUOTES = [
  { q: 'No lead sits idle anymore — every one has an owner and a dated next task.', by: 'Head of Admissions' },
  { q: 'The closure gate means a "Won" is actually paid and verified. Real numbers.', by: 'Team Lead' },
  { q: 'Counsellors run their whole day from one screen. It just flows.', by: 'Operations' },
];

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.lp-reveal');
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef(null);
  useScrollReveal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = () => navigate('/login');

  return (
    <div className="lp">
      {/* Nav */}
      <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="lp-wrap lp-nav-in">
          <div className="lp-logo"><span className="dot">L</span> LUC CRM</div>
          <div className="lp-navlinks">
            <a href="#features">Product</a>
            <a href="#workflow">Workflow</a>
            <a href="#dashboards">Dashboards</a>
            <a href="#why">Why LUC</a>
          </div>
          <div className="lp-nav-cta">
            <button className="lp-btn lp-btn-ghost" onClick={go}>Sign in</button>
            <button className="lp-btn lp-btn-dark" onClick={go}>Get started</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="lp-wrap lp-hero" ref={heroRef}>
        <div>
          <span className="lp-eyebrow"><Doodle name="sparkle" size={14} /> Lead-to-admission CRM</span>
          <h1 className="lp-h1">
            Built for teams that turn{' '}
            <span className="hl">
              enquiries into admissions
              <Doodle
                name="underline"
                preserveAspectRatio="none"
                strokeWidth={6}
                style={{ position: 'absolute', left: 0, bottom: '-0.18em', width: '100%', height: '0.32em' }}
              />
            </span>
            .
          </h1>
          <p className="lp-sub">
            LUC CRM keeps counsellors focused on the next right action — controlled stage movement, mandatory follow-ups, automations and SLAs, all the way to a paid, document-verified admission.
          </p>
          <div className="lp-hero-cta">
            <button className="lp-btn lp-btn-primary" onClick={go}>Get started <Icon name="flow" size={16} /></button>
            <button className="lp-btn lp-btn-ghost" onClick={go}>See it live</button>
          </div>
        </div>

        {/* Collage */}
        <div className="lp-collage">
          <span className="lp-blob b1" />
          <span className="lp-blob b2" />
          <Doodle name="star" size={34} color="var(--gold)" style={{ position: 'absolute', top: 4, left: 30, zIndex: 3 }} className="lp-float" />
          <Doodle name="squiggle" size={70} color="var(--accent-3)" style={{ position: 'absolute', bottom: 0, right: 0, zIndex: 1 }} />

          <div className="lp-card-mock">
            <div className="mh">
              <strong style={{ fontFamily: 'var(--display)', fontSize: '0.95rem' }}>Today's queue</strong>
              <span className="tag tag-hot">overdue · 1</span>
            </div>
            <div className="lp-mini-lead">
              <div className="spread"><strong style={{ fontSize: '0.86rem' }}>Sofia Almeida</strong><span className="tag tag-hot">Hot · 82</span></div>
              <div className="muted" style={{ fontSize: '0.72rem', marginTop: 2 }}>DBA · Meeting done · due today</div>
            </div>
            <div className="lp-mini-lead green">
              <div className="spread"><strong style={{ fontSize: '0.86rem' }}>Fatima Noor</strong><span className="tag tag-success">Won</span></div>
              <div className="muted" style={{ fontSize: '0.72rem', marginTop: 2 }}>MBA · Admission closed · ADM-2026-0001</div>
            </div>
            <div className="lp-mini-lead amber">
              <div className="spread"><strong style={{ fontSize: '0.86rem' }}>Omar Khan</strong><span className="tag tag-warm">Warm · 68</span></div>
              <div className="muted" style={{ fontSize: '0.72rem', marginTop: 2 }}>MBA · Offer sent · Day 3 follow-up</div>
            </div>
          </div>

          <span className="lp-annot a1"><Doodle name="arrow" size={40} /><span className="t">auto-assigned ✓</span></span>
          <span className="lp-annot a2"><span className="t">SLA on track</span></span>
          <span className="lp-annot a3"><span className="t">gate passed ✓</span></span>
        </div>
      </header>

      {/* Trust strip */}
      <section className="lp-wrap lp-trust lp-reveal">
        <div className="lbl">Built for online-education admissions teams</div>
        <div className="lp-chips">
          {['Online MBA', 'Online BBA', 'DBA / Doctorate', 'Professional Certification'].map((c) => (
            <span className="lp-chip" key={c}>{c}</span>
          ))}
        </div>
      </section>

      {/* Feature split */}
      <section className="lp-wrap lp-section lp-reveal" id="features">
        <div className="lp-feature">
          <div>
            <span className="lp-eyebrow-c" style={{ textAlign: 'left', display: 'block' }}>One screen, the whole lead</span>
            <h3>Every enquiry, worked to a <span style={{ color: 'var(--accent)' }}>won admission</span>.</h3>
            <p>The lead workspace puts the lifecycle rail, decision buttons, gate checks, SLA, and the full activity timeline in one place — so counsellors always know the next right move.</p>
            <div className="lp-ticks">
              {['Controlled stage movement with required-field gates', 'Mandatory exit reasons feed lost-reason analytics', 'Append-only audit trail on every change'].map((t) => (
                <div className="lp-tick" key={t}><span className="ic"><Icon name="overview" size={13} /></span>{t}</div>
              ))}
            </div>
          </div>
          <div className="lp-feature-media">
            <div className="lp-mediacard">
              <div className="rail" style={{ marginBottom: '0.8rem' }}>
                <span className="rail-node done">New</span>
                <span className="rail-node done">Qualified</span>
                <span className="rail-node current">Meeting</span>
                <span className="rail-node">Offer</span>
                <span className="rail-node">Won</span>
              </div>
              <div className="lp-mini-lead"><div className="spread"><strong style={{ fontSize: '0.86rem' }}>Meeting outcome</strong><span className="tag chip-pass no-dot">required ✓</span></div></div>
              <div className="lp-mini-lead green"><div className="spread"><strong style={{ fontSize: '0.86rem' }}>Documents verified</strong><span className="tag tag-success">passed</span></div></div>
              <div className="lp-mini-lead amber"><div className="spread"><strong style={{ fontSize: '0.86rem' }}>Payment money-gate</strong><span className="tag tag-warm">team lead</span></div></div>
            </div>
            <Doodle name="circle" size={150} color="var(--accent)" style={{ position: 'absolute', top: -18, right: -10, opacity: 0.5 }} strokeWidth={2.5} />
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="lp-wrap lp-section lp-reveal" id="workflow">
        <div className="lp-eyebrow-c">Turns out, you can run it all</div>
        <h2 className="lp-h2">A CRM that <span className="hl">works the leads</span> for you</h2>
        <p className="lp-lead">From first contact to a verified admission — the workflow, the gates, the automations and the analytics are built in.</p>
        <div className="lp-feat-grid">
          {FEATURES.map((f) => (
            <div className="lp-feat" key={f.title}>
              <div className="fi" style={{ background: f.bg }}><Icon name={f.icon} size={22} /></div>
              <h4>{f.title}</h4>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="lp-wrap lp-section lp-reveal">
        <div className="lp-stats">
          {[['13', 'lifecycle stages'], ['9', 'exit & on-hold paths'], ['5', 'live dashboards'], ['SLA', 'on every stage']].map(([n, l]) => (
            <div className="lp-stat" key={l}><div className="n">{n}</div><div className="l">{l}</div></div>
          ))}
        </div>
      </section>

      {/* Gradient band — phases */}
      <section className="lp-wrap lp-section lp-reveal" id="dashboards">
        <div className="lp-band">
          <h2>From a cold enquiry to a celebrated admission</h2>
          <div className="lp-phase-cards">
            {PHASES.map((p) => (
              <div className="lp-phase-card" key={p.ph}>
                <div className="ph" style={{ color: p.color }}>{p.ph}</div>
                <h4>{p.title}</h4>
                <ul>{p.items.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="lp-wrap lp-section lp-reveal" id="why">
        <div className="lp-eyebrow-c">Why teams pick LUC CRM</div>
        <h2 className="lp-h2">The pipeline that <span className="hl">never goes idle</span></h2>
        <p className="lp-lead">The five operating rules are invariants — enforced in data, API and UI.</p>
        <div className="lp-quotes">
          {QUOTES.map((q) => (
            <div className="lp-quote" key={q.by}>
              <div className="stars">★★★★★</div>
              <div className="q">“{q.q}”</div>
              <div className="by">— {q.by}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="lp-wrap lp-section lp-reveal">
        <div className="lp-cta">
          <h2>Start turning enquiries into admissions</h2>
          <p>Sign in and walk a lead from New → Won in minutes.</p>
          <div className="lp-hero-cta">
            <button className="lp-btn lp-btn-primary" onClick={go}>Get started <Icon name="flow" size={16} /></button>
            <button className="lp-btn lp-btn-ghost" onClick={go} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'transparent' }}>Sign in</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-wrap lp-footer">
        <div className="lp-footer-grid">
          <div>
            <div className="lp-logo" style={{ marginBottom: '0.7rem' }}><span className="dot">L</span> LUC CRM</div>
            <p className="muted" style={{ fontSize: '0.86rem', maxWidth: '26ch' }}>The in-house lead-to-admission CRM for Learners Education.</p>
          </div>
          <div className="lp-footer-col"><h5>Product</h5><a onClick={go} style={{ cursor: 'pointer' }}>Pipeline</a><a onClick={go} style={{ cursor: 'pointer' }}>Workspace</a><a onClick={go} style={{ cursor: 'pointer' }}>Dashboards</a></div>
          <div className="lp-footer-col"><h5>Workflow</h5><div>13 stages</div><div>Automations & SLA</div><div>Closure gate</div></div>
          <div className="lp-footer-col"><h5>Company</h5><div>Learners Education</div><div>Dubai, UAE</div></div>
        </div>
        <div className="lp-footer-bottom">
          <span>© {new Date().getFullYear()} Learners Education · LUC CRM</span>
          <span>Built in-house</span>
        </div>
      </footer>
    </div>
  );
}
