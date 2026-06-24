import Topbar from '../components/Topbar.jsx';
import { useWorkflow } from '../hooks/useWorkflow.js';
import { AUTOMATION_RULES } from '../lib/automationReference.js';

// Read-only reference: the 13 automation rules + the per-stage SLA table.
export default function Automation() {
  const { data: meta } = useWorkflow();

  return (
    <>
      <Topbar title="Automation Matrix" subtitle="Triggers, actions & SLAs" />
      <div className="content stack" style={{ gap: '1.4rem' }}>
        <section className="card">
          <h3>Automation rules (trigger → action)</h3>
          <table className="table">
            <thead>
              <tr><th>#</th><th>Trigger</th><th>Condition</th><th>Automated action</th><th>Human escalation</th></tr>
            </thead>
            <tbody>
              {AUTOMATION_RULES.map((r) => (
                <tr key={r.n}>
                  <td>{r.n}</td>
                  <td><strong>{r.trigger}</strong></td>
                  <td className="muted">{r.condition}</td>
                  <td>{r.action}</td>
                  <td className="muted">{r.escalation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h3>SLA table (per stage)</h3>
          <table className="table">
            <thead><tr><th>Stage</th><th>Follow-up SLA</th><th>Max age</th></tr></thead>
            <tbody>
              {(meta?.stages || []).map((s) => (
                <tr key={s.slug}>
                  <td>{s.index + 1}. {s.label}</td>
                  <td>{s.sla}</td>
                  <td className="muted">{s.maxAge}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
