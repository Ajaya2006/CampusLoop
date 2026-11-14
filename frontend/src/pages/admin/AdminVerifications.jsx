import { useCallback, useEffect, useState } from 'react';
import { Check, FileText, ShieldCheck, X } from 'lucide-react';
import { adminService } from '../../services';
import { api, apiError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import Tabs from '../../components/common/Tabs';
import Avatar from '../../components/common/Avatar';
import Badge, { VerifiedBadge } from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { Textarea } from '../../components/common/Form';
import { EmptyState, ErrorState, ListSkeleton } from '../../components/common/Feedback';
import { formatDateTime } from '../../utils/format';

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

export default function AdminVerifications() {
  useDocumentTitle('Verification review');
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [decision, setDecision] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await adminService.verifications({ status, page, page_size: 10 }));
    } catch (err) {
      setError(apiError(err, 'Could not load verification requests.').message);
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (verification, decisionStatus, reviewNote) => {
    setBusy(verification.id + decisionStatus);
    try {
      await adminService.decideVerification(verification.id, { status: decisionStatus, review_note: reviewNote || null });
      toast.success(decisionStatus === 'verified' ? 'Student verified' : 'Verification rejected');
      setDecision(null);
      setNote('');
      await load();
    } catch (err) {
      toast.error('Decision failed', apiError(err).message);
    } finally {
      setBusy('');
    }
  };

  const openDocument = async (verification) => {
    setBusy(verification.id + 'doc');
    try {
      const response = await api.get(`/admin/verifications/${verification.id}/document`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      toast.error('Document unavailable', apiError(err, 'This request has no stored document.').message);
    } finally {
      setBusy('');
    }
  };

  const tabs = TABS.map((tab) => ({
    ...tab,
    count: tab.value === status ? result?.total : undefined,
  }));

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink">Student verification</h1>
        <p className="mt-1 text-sm text-muted">
          Compare the submitted details with the student ID document. Never approve on email domain alone.
        </p>
      </div>

      <Tabs
        items={tabs}
        value={status}
        onChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        className="mb-4 w-full sm:w-fit"
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <ListSkeleton rows={4} />
      ) : !result?.items?.length ? (
        <EmptyState
          icon={ShieldCheck}
          title={status === 'pending' ? 'No verifications waiting' : 'Nothing here'}
          description={status === 'pending' ? 'New student verification requests will appear in this queue.' : 'Try another tab.'}
        />
      ) : (
        <div className="space-y-3">
          {result.items.map((verification) => (
            <article key={verification.id} className="surface-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <Avatar name={verification.student?.full_name} src={verification.student?.avatar_url} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{verification.student?.full_name || 'Student'}</p>
                    <VerifiedBadge status={verification.status} compact />
                    {verification.has_document ? (
                      <Badge tone="info" size="xs" icon={FileText}>Document attached</Badge>
                    ) : (
                      <Badge tone="neutral" size="xs">No document</Badge>
                    )}
                  </div>
                  <dl className="mt-2 grid gap-x-6 gap-y-1 text-[12.5px] sm:grid-cols-2">
                    <div className="flex gap-1"><dt className="text-muted">College:</dt><dd className="text-ink">{verification.college}</dd></div>
                    <div className="flex gap-1"><dt className="text-muted">Student ID:</dt><dd className="text-ink">{verification.student_id_number}</dd></div>
                    <div className="flex gap-1"><dt className="text-muted">Course:</dt><dd className="text-ink">{verification.course || '—'}</dd></div>
                    <div className="flex gap-1"><dt className="text-muted">Year:</dt><dd className="text-ink">{verification.year || '—'}</dd></div>
                    <div className="flex gap-1 sm:col-span-2"><dt className="text-muted">Department:</dt><dd className="text-ink">{verification.department || '—'}</dd></div>
                  </dl>
                  {verification.note ? (
                    <p className="mt-2 rounded-control bg-canvas px-2.5 py-1.5 text-[12px] text-muted">Note: {verification.note}</p>
                  ) : null}
                  {verification.review_note ? (
                    <p className="mt-2 text-[12px] text-muted">Review note: {verification.review_note}</p>
                  ) : null}
                  <p className="mt-1.5 text-[11px] text-muted">
                    Submitted {formatDateTime(verification.created_at)}
                    {verification.reviewed_at ? ` · Reviewed ${formatDateTime(verification.reviewed_at)}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:flex-col sm:items-stretch">
                  {verification.has_document ? (
                    <Button size="xs" variant="secondary" icon={FileText} loading={busy === verification.id + 'doc'} onClick={() => openDocument(verification)}>
                      View ID
                    </Button>
                  ) : null}
                  {verification.status === 'pending' || verification.status === 'rejected' ? (
                    <>
                      <Button size="xs" variant="success" icon={Check} loading={busy === verification.id + 'verified'} onClick={() => decide(verification, 'verified')}>
                        Approve
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        className="text-danger"
                        icon={X}
                        onClick={() => {
                          setDecision(verification);
                          setNote('');
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
          <Pagination page={result.page} pages={result.pages} onChange={setPage} className="pt-3" />
        </div>
      )}

      <Modal
        open={Boolean(decision)}
        onClose={() => setDecision(null)}
        title="Reject this verification?"
        description={decision ? `${decision.student?.full_name} · ${decision.college}` : ''}
        size="sm"
      >
        <div className="space-y-4">
          <Textarea
            label="Reason (required)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="The student ID photo is unreadable. Please upload a clearer image."
          />
          <p className="text-xs text-muted">The student sees this note and can resubmit with corrected details.</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setDecision(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={busy === decision?.id + 'rejected'}
              disabled={!note.trim()}
              onClick={() => decide(decision, 'rejected', note)}
            >
              Reject verification
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
