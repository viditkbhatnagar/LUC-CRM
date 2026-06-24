import { useState } from 'react';
import { useUpdateDocuments, useUploadDocument, useConfirmPayment } from '../hooks/useLeads.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api, ApiError } from '../lib/api.js';
import { formatDate } from '../lib/format.js';

// Close-phase panel: document checklist/verify (+ upload via storage adapter)
// and payment confirmation (team_lead/admin only — the money gate before Won).
export default function DocsPaymentPanel({ lead }) {
  const { isManager } = useAuth();
  const toast = useToast();
  const docs = useUpdateDocuments(lead._id);
  const uploadDoc = useUploadDocument(lead._id);
  const confirm = useConfirmPayment(lead._id);
  const [reference, setReference] = useState('');

  const setFlag = async (patch) => {
    try {
      await docs.mutateAsync(patch);
      toast('Documents updated', { type: 'success' });
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Update failed', { type: 'error' });
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadDoc.mutateAsync(file);
      toast(`Uploaded ${file.name}`, { type: 'success' });
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Upload failed', { type: 'error' });
    }
    e.target.value = '';
  };

  const onConfirm = async () => {
    try {
      await confirm.mutateAsync({ reference });
      toast('Payment confirmed', { type: 'success' });
      setReference('');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Confirm failed', { type: 'error' });
    }
  };

  const paid = lead.payment?.status === 'paid';

  // Open a stored document via a freshly-signed URL (presigned URLs expire).
  const openDoc = async (key) => {
    try {
      const { url } = await api.get(`/leads/${lead._id}/documents/url?key=${encodeURIComponent(key)}`);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not open document', { type: 'error' });
    }
  };

  return (
    <div className="card">
      <h3>Documents & payment</h3>

      <div className="stack" style={{ fontSize: 13, marginBottom: '0.8rem' }}>
        <label className="row" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={!!lead.docsReceived} onChange={(e) => setFlag({ docsReceived: e.target.checked })} />
          Documents received
        </label>
        <label className="row" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={!!lead.docsVerified} onChange={(e) => setFlag({ docsVerified: e.target.checked })} />
          Documents verified <span className="muted">(unlocks docs → payment)</span>
        </label>
      </div>

      <div className="field">
        <label htmlFor="docfile">Upload document</label>
        <input id="docfile" type="file" onChange={onFile} disabled={uploadDoc.isPending} />
      </div>
      {(lead.documents || []).length > 0 && (
        <ul style={{ fontSize: 12, paddingLeft: 16, margin: '0.3rem 0 0.8rem' }}>
          {lead.documents.map((d, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => openDoc(d.key)}
                style={{ background: 'none', border: 'none', padding: 0, color: 'var(--brand-2)', cursor: 'pointer', textDecoration: 'underline', font: 'inherit' }}
              >
                {d.name}
              </button>
              <span className="muted"> · {formatDate(d.uploadedAt)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="section-title" style={{ marginTop: '0.6rem' }}>Payment</div>
      <div className="spread" style={{ fontSize: 13 }}>
        <span className="muted">Status</span>
        <span className={`tag ${paid ? 'tag-success' : 'tag-warm'}`}>{lead.payment?.status || 'none'}</span>
      </div>
      {lead.payment?.reference && <p className="muted" style={{ fontSize: 12 }}>Ref: {lead.payment.reference}</p>}

      {isManager && !paid && (
        <div style={{ marginTop: '0.6rem' }}>
          <div className="field">
            <label htmlFor="payref">Payment reference</label>
            <input id="payref" className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. PAY-44821" />
          </div>
          <button className="btn btn-primary btn-sm" disabled={!reference || confirm.isPending} onClick={onConfirm}>
            {confirm.isPending ? 'Confirming…' : 'Confirm payment (money gate)'}
          </button>
        </div>
      )}
      {!isManager && !paid && <p className="muted" style={{ fontSize: 12 }}>Payment confirmation is a team-lead/admin action.</p>}
    </div>
  );
}
