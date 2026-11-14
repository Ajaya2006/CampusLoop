import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Flag } from 'lucide-react';
import { adminService } from '../../services';
import { apiError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import Tabs from '../../components/common/Tabs';
import { StatusBadge } from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { Checkbox, Select, Textarea } from '../../components/common/Form';
import { EmptyState, ErrorState, ListSkeleton } from '../../components/common/Feedback';
import { REPORT_STATUS } from '../../constants';
import { formatDateTime } from '../../utils/format';

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Dismissed' },
  { value: 'all', label: 'All' },
];

export default function AdminReports() {
  useDocumentTitle('Reports');
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState({ status: 'resolved', note: '', remove_listing: false, suspend_user: false });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await adminService.reports({ status, page, page_size: 10 }));
    } catch (err) {
      setError(apiError(err, 'Could not load reports.').message);
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await adminService.resolveReport(target.id, {
        status: form.status,
        resolution_note: form.note.trim() || null,
        remove_listing: form.remove_listing,
        suspend_user: form.suspend_user,
      });
      toast.success('Report updated');
      setTarget(null);
      await load();
    } catch (err) {
      toast.error('Could not update report', apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink">Reports</h1>
        <p className="mt-1 text-sm text-muted">
          Investigate flagged listings and users. Resolving a report can remove the listing and/or suspend the account.
        </p>
      </div>

      <Tabs
        items={TABS.map((tab) => ({ ...tab, count: tab.value === status ? result?.total : undefined }))}
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
        <EmptyState icon={Flag} title="No reports in this queue" description="Reports submitted by students will appear here." />
      ) : (
        <div className="space-y-3">
          {result.items.map((report) => (
            <article key={report.id} className="surface-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger/10 text-danger">
                  <Flag size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{report.reason.replace(/_/g, ' ')}</p>
                    <StatusBadge map={REPORT_STATUS} value={report.status} />
                    <span className="rounded-full bg-elevated px-2 py-0.5 text-[10.5px] font-medium text-muted">
                      {report.target_type}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted">
                    Reported by {report.reporter_name} ({report.reporter_email || 'no email'}) · {formatDateTime(report.created_at)}
                  </p>
                  {report.target_label ? (
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink">
                      Target: {report.target_label}
                      {report.target_link ? (
                        <a href={report.target_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-brand-600">
                          Open <ExternalLink size={11} />
                        </a>
                      ) : null}
                    </p>
                  ) : null}
                  {report.details ? (
                    <p className="mt-1.5 rounded-control bg-canvas px-2.5 py-1.5 text-[12.5px] text-muted">{report.details}</p>
                  ) : null}
                  {report.resolution_note ? (
                    <p className="mt-1.5 text-[12px] text-muted">Resolution: {report.resolution_note}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5 sm:flex-col sm:items-stretch">
                  {report.status !== 'resolved' && report.status !== 'rejected' ? (
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => {
                        setTarget(report);
                        setForm({ status: 'resolved', note: '', remove_listing: false, suspend_user: false });
                      }}
                    >
                      Resolve
                    </Button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
          <Pagination page={result.page} pages={result.pages} onChange={setPage} className="pt-3" />
        </div>
      )}

      <Modal open={Boolean(target)} onClose={() => setTarget(null)} title="Resolve report" description={target ? `${target.reason.replace(/_/g, ' ')} · ${target.target_type}` : ''} size="sm">
        <form onSubmit={resolve} className="space-y-4">
          <Select label="Outcome" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option value="resolved">Resolved — action taken</option>
            <option value="rejected">Dismissed — no violation</option>
            <option value="under_review">Keep under review</option>
          </Select>
          <Textarea
            label="Resolution note (optional)"
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
            rows={3}
            placeholder="Listing removed and seller warned."
          />
          <div className="space-y-2 rounded-control border border-line bg-canvas p-3">
            <Checkbox
              label="Remove the reported listing"
              checked={form.remove_listing}
              onChange={(event) => setForm({ ...form, remove_listing: event.target.checked })}
            />
            <Checkbox
              label="Suspend the reported account"
              description="Use only for clear fraud or repeated violations."
              checked={form.suspend_user}
              onChange={(event) => setForm({ ...form, suspend_user: event.target.checked })}
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setTarget(null)}>Cancel</Button>
            <Button type="submit" loading={busy}>Save outcome</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
