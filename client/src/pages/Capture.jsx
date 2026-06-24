import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar.jsx';
import { useWorkflow } from '../hooks/useWorkflow.js';
import { useUsers } from '../hooks/useUsers.js';
import { useCreateLead } from '../hooks/useLeads.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ApiError } from '../lib/api.js';

const SAMPLE = {
  name: 'Sofia Almeida',
  phone: '+971501234567',
  email: 'sofia.almeida@example.com',
  city: 'Dubai, UAE',
  program: 'DBA / Doctorate',
  source: 'LinkedIn',
  interest: 'High',
  intake: 'Sep 2026',
  objection: 'Employer approval',
  consent: 'all',
  campaignNotes: 'utm_campaign=doctorate-q3',
};

const blank = {
  name: '', phone: '', whatsapp: '', email: '', city: '',
  program: '', source: '', interest: '', intake: '', objection: '',
  consent: 'all', owner: '', campaignNotes: '',
};

export default function Capture() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, isManager } = useAuth();
  const { data: meta } = useWorkflow();
  const { data: users } = useUsers();
  const createLead = useCreateLead();

  const [form, setForm] = useState(blank);
  const [duplicate, setDuplicate] = useState(null);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const enums = meta?.enums || {};

  function buildBody(force = false) {
    const body = {};
    Object.entries(form).forEach(([k, v]) => {
      if (v !== '' && v != null) body[k] = v;
    });
    if (!isManager) body.owner = String(user.id); // counsellors own what they capture
    return { body, force };
  }

  async function submit(force = false) {
    setError('');
    setDuplicate(null);
    try {
      const { lead } = await createLead.mutateAsync(buildBody(force));
      toast('Opportunity created', { type: 'success' });
      navigate(`/leads/${lead._id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setDuplicate(err.details); // existing lead
      } else if (err instanceof ApiError) {
        setError(err.message + (err.details ? `: ${JSON.stringify(err.details)}` : ''));
      } else {
        setError('Something went wrong');
      }
    }
  }

  return (
    <>
      <Topbar title="New Lead" subtitle="Capture an enquiry" />
      <div className="content" style={{ maxWidth: 820 }}>
        {error && <div className="alert alert-error" role="alert">{error}</div>}

        {duplicate && (
          <div className="card" style={{ borderColor: 'var(--amber)', marginBottom: '1rem' }}>
            <h3 style={{ color: 'var(--amber)' }}>Possible duplicate (Rule 4)</h3>
            <p className="muted">
              {duplicate.name} · {duplicate.leadCode} · {duplicate.email} — already in the system.
            </p>
            <div className="row">
              <button className="btn btn-primary btn-sm" onClick={() => navigate(`/leads/${duplicate._id}`)}>
                Open existing
              </button>
              {user.role === 'admin' && (
                <button className="btn btn-ghost btn-sm" onClick={() => submit(true)}>
                  Create anyway (admin)
                </button>
              )}
            </div>
          </div>
        )}

        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            submit(false);
          }}
        >
          <div className="spread" style={{ marginBottom: '0.8rem' }}>
            <h3 style={{ margin: 0 }}>Lead details</h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({ ...blank, ...SAMPLE })}>
              Fill sample
            </button>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="name">Name *</label>
              <input id="name" className="input" value={form.name} onChange={set('name')} required />
            </div>
            <div className="field">
              <label htmlFor="email">Email *</label>
              <input id="email" className="input" type="email" value={form.email} onChange={set('email')} required />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone *</label>
              <input id="phone" className="input" value={form.phone} onChange={set('phone')} required />
            </div>
            <div className="field">
              <label htmlFor="whatsapp">WhatsApp</label>
              <input id="whatsapp" className="input" value={form.whatsapp} onChange={set('whatsapp')} placeholder="defaults to phone" />
            </div>
            <div className="field">
              <label htmlFor="program">Program *</label>
              <select id="program" className="select" value={form.program} onChange={set('program')} required>
                <option value="">Select…</option>
                {(enums.programs || []).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="source">Source *</label>
              <select id="source" className="select" value={form.source} onChange={set('source')} required>
                <option value="">Select…</option>
                {(enums.sources || []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="interest">Interest</label>
              <select id="interest" className="select" value={form.interest} onChange={set('interest')}>
                <option value="">Select…</option>
                {(enums.interest || []).map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="intake">Preferred intake</label>
              <input id="intake" className="input" value={form.intake} onChange={set('intake')} placeholder="e.g. Sep 2026" />
            </div>
            <div className="field">
              <label htmlFor="city">City</label>
              <input id="city" className="input" value={form.city} onChange={set('city')} />
            </div>
            <div className="field">
              <label htmlFor="objection">Key objection</label>
              <select id="objection" className="select" value={form.objection} onChange={set('objection')}>
                <option value="">Select…</option>
                {(enums.objection || []).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="consent">Consent</label>
              <select id="consent" className="select" value={form.consent} onChange={set('consent')}>
                {(enums.consent || ['all', 'whatsapp', 'email', 'none']).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {isManager && (
              <div className="field">
                <label htmlFor="owner">Assign to</label>
                <select id="owner" className="select" value={form.owner} onChange={set('owner')}>
                  <option value="">Auto-assign (round-robin)</option>
                  {(users || []).filter((u) => u.role === 'counsellor').map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="campaignNotes">Source / campaign notes</label>
            <textarea id="campaignNotes" className="textarea" value={form.campaignNotes} onChange={set('campaignNotes')} />
          </div>

          <div className="row">
            <button type="submit" className="btn btn-primary" disabled={createLead.isPending}>
              {createLead.isPending ? 'Creating…' : 'Create opportunity'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setForm(blank)}>Reset</button>
          </div>
        </form>
      </div>
    </>
  );
}
