import { useCallback, useEffect, useState } from 'react';
import { Ban, CheckCircle2, Search, Users } from 'lucide-react';
import { adminService } from '../../services';
import { apiError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import Avatar from '../../components/common/Avatar';
import Badge, { VerifiedBadge } from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { Select, Textarea } from '../../components/common/Form';
import { EmptyState, ErrorState, ListSkeleton } from '../../components/common/Feedback';
import { formatDate } from '../../utils/format';

export default function AdminUsers() {
  useDocumentTitle('Users');
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [target, setTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setResult(
        await adminService.users({
          search: query || undefined,
          role: role === 'all' ? undefined : role,
          status: status === 'all' ? undefined : status,
          page,
          page_size: 20,
        }),
      );
    } catch (err) {
      setError(apiError(err, 'Could not load users.').message);
    } finally {
      setLoading(false);
    }
  }, [query, role, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async () => {
    setBusy(target.id);
    try {
      await adminService.setUserStatus(target.id, {
        is_active: !target.is_active,
        reason: reason.trim() || undefined,
      });
      toast.success(target.is_active ? 'Account suspended' : 'Account reactivated', target.full_name);
      setTarget(null);
      setReason('');
      await load();
    } catch (err) {
      toast.error('Could not update account', apiError(err).message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink">Users</h1>
        <p className="mt-1 text-sm text-muted">Search accounts, review verification state and suspend bad actors.</p>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_150px_150px]">
        <form
          className="relative"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setQuery(search.trim());
          }}
        >
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email or college…"
            className="input-base h-10 pl-9"
            aria-label="Search users"
          />
        </form>
        <Select aria-label="Filter by role" value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}>
          <option value="all">All roles</option>
          <option value="student">Students</option>
          <option value="admin">Admins</option>
        </Select>
        <Select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="all">All statuses</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending verification</option>
          <option value="suspended">Suspended</option>
        </Select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <ListSkeleton rows={6} />
      ) : !result?.items?.length ? (
        <EmptyState icon={Users} title="No users found" description="Adjust the search or filters." />
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line bg-canvas text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Student</th>
                  <th className="px-4 py-2.5 font-semibold">College</th>
                  <th className="px-4 py-2.5 font-semibold">Verification</th>
                  <th className="px-4 py-2.5 font-semibold">Listings</th>
                  <th className="px-4 py-2.5 font-semibold">Joined</th>
                  <th className="px-4 py-2.5 font-semibold">Account</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.items.map((user) => (
                  <tr key={user.id} className="text-[13px]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={user.full_name} src={user.avatar_url} size="xs" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{user.full_name}</p>
                          <p className="truncate text-[11px] text-muted">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[180px] truncate text-ink">{user.college}</p>
                      <p className="text-[11px] text-muted">{user.role === 'admin' ? 'Administrator' : user.course || 'Student'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <VerifiedBadge status={user.verification_status} compact />
                    </td>
                    <td className="px-4 py-3 text-ink">{user.listings_count}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3">
                      {user.is_active ? (
                        <Badge tone="success" size="xs">Active</Badge>
                      ) : (
                        <Badge tone="danger" size="xs">Suspended</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.role === 'admin' ? (
                        <span className="text-[11px] text-muted">Protected</span>
                      ) : (
                        <Button
                          size="xs"
                          variant={user.is_active ? 'ghost' : 'secondary'}
                          className={user.is_active ? 'text-danger' : ''}
                          icon={user.is_active ? Ban : CheckCircle2}
                          onClick={() => {
                            setTarget(user);
                            setReason('');
                          }}
                        >
                          {user.is_active ? 'Suspend' : 'Reactivate'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line p-3">
            <Pagination page={result.page} pages={result.pages} onChange={setPage} />
          </div>
        </div>
      )}

      <Modal
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={target?.is_active ? 'Suspend this account?' : 'Reactivate this account?'}
        description={target ? `${target.full_name} · ${target.email}` : ''}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {target?.is_active
              ? 'Suspended students cannot sign in, list items, message or negotiate. Existing records are preserved.'
              : 'The student will be able to sign in and use the marketplace again.'}
          </p>
          <Textarea
            label="Reason (optional)"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            placeholder="Repeated fraudulent listings."
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setTarget(null)}>Cancel</Button>
            <Button variant={target?.is_active ? 'danger' : 'success'} loading={busy === target?.id} onClick={toggleActive}>
              {target?.is_active ? 'Suspend account' : 'Reactivate account'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
