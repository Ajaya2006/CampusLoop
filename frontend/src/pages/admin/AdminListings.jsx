import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Eye, Search, ShieldX, Tag, Trash2 } from 'lucide-react';
import { adminService } from '../../services';
import { apiError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import Tabs from '../../components/common/Tabs';
import ProductImage from '../../components/common/ProductImage';
import Avatar from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { Textarea } from '../../components/common/Form';
import { EmptyState, ErrorState, ListSkeleton } from '../../components/common/Feedback';
import { PRODUCT_STATUS } from '../../constants';
import { inr, timeAgo } from '../../utils/format';

const TABS = [
  { value: 'pending_verification', label: 'Pending' },
  { value: 'available', label: 'Live' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'sold', label: 'Sold' },
  { value: 'all', label: 'All' },
];

export default function AdminListings() {
  useDocumentTitle('Moderate listings');
  const toast = useToast();
  const [status, setStatus] = useState('pending_verification');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await adminService.listings({ status, search: query || undefined, page, page_size: 10 }));
    } catch (err) {
      setError(apiError(err, 'Could not load listings.').message);
    } finally {
      setLoading(false);
    }
  }, [status, query, page]);

  useEffect(() => {
    load();
  }, [load]);

  const moderate = async (product, actionName, actionReason) => {
    setBusy(product.id + actionName);
    try {
      const response = await adminService.moderateListing(product.id, { action: actionName, reason: actionReason || null });
      toast.success('Listing updated', response.message);
      setAction(null);
      setReason('');
      await load();
    } catch (err) {
      toast.error('Moderation failed', apiError(err).message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div>
      <div className="mb-4">
        <p className="text-[11px] font-medium text-brand-600">Admin / Listings</p>
        <h1 className="mt-0.5 font-display text-[25px] font-bold tracking-tight text-ink sm:text-[29px]">Listings</h1>
        <p className="mt-0.5 text-[12px] text-muted">
          Approve new posts, reject policy violations, or remove harmful listings.
        </p>
      </div>

      <section className="overflow-hidden rounded-card border border-line bg-surface">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Listings collection</h2>
            <p className="mt-0.5 text-[11px] text-muted">
              {loading ? 'Loading listings…' : `${result?.total ?? 0} listing${result?.total === 1 ? '' : 's'} in this queue`}
            </p>
          </div>
          <form
            className="relative w-full sm:w-72"
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
              placeholder="Search a listing"
              className="input-base h-10 pl-9"
              aria-label="Search listings"
            />
          </form>
        </div>

        <div className="px-4 pt-3">
          <Tabs
            items={TABS.map((tab) => ({ ...tab, count: tab.value === status ? result?.total : undefined }))}
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            className="w-full sm:w-fit"
          />
        </div>

        {error ? (
          <div className="p-4">
            <ErrorState message={error} onRetry={load} />
          </div>
        ) : loading ? (
          <div className="p-4">
            <ListSkeleton rows={4} />
          </div>
        ) : !result?.items?.length ? (
          <div className="p-4">
            <EmptyState icon={Tag} title="No listings in this queue" description="Try another tab or clear the search." />
          </div>
        ) : (
          <>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[930px] text-left">
                <thead>
                  <tr className="border-y border-line bg-[#F6F4F1] text-[10px] uppercase tracking-[0.06em] text-muted dark:bg-elevated">
                    <th className="px-4 py-2.5 font-semibold">Listing</th>
                    <th className="px-4 py-2.5 font-semibold">Seller</th>
                    <th className="px-4 py-2.5 font-semibold">Price</th>
                    <th className="px-4 py-2.5 font-semibold">Condition</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold">Added</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {result.items.map((product) => (
                    <tr key={product.id} className="align-middle text-[12px] transition hover:bg-elevated/40">
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <ProductImage
                            src={product.cover_image}
                            alt={product.title}
                            className="h-[52px] w-[42px] shrink-0 rounded-[6px]"
                          />
                          <div className="min-w-0">
                            <Link
                              to={`/product/${product.id}`}
                              className="block max-w-[245px] truncate font-semibold text-ink hover:text-brand-600"
                            >
                              {product.title}
                            </Link>
                            <p className="mt-0.5 text-[10px] text-muted">
                              #{product.id.slice(0, 6).toUpperCase()} · {product.category_name}
                            </p>
                            {product.rejection_reason ? (
                              <p className="mt-0.5 max-w-[245px] truncate text-[10px] text-danger">
                                {product.rejection_reason}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar name={product.seller_name} size="xs" />
                          <div className="min-w-0">
                            <p className="max-w-[145px] truncate font-medium text-ink">{product.seller_name}</p>
                            <p className="max-w-[145px] truncate text-[10px] text-muted">{product.seller_college}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink">{inr(product.price)}</td>
                      <td className="whitespace-nowrap px-4 py-3 capitalize text-muted">
                        {product.condition.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge map={PRODUCT_STATUS} value={product.status} size="xs" />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{timeAgo(product.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/product/${product.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[7px] text-muted transition hover:bg-elevated hover:text-ink"
                            aria-label={`View ${product.title}`}
                            title="View listing"
                          >
                            <Eye size={14} />
                          </Link>
                          {product.status !== 'available' && product.status !== 'sold' ? (
                            <button
                              type="button"
                              onClick={() => moderate(product, 'approve')}
                              disabled={busy === product.id + 'approve'}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-[7px] text-success transition hover:bg-success/10 disabled:opacity-50"
                              aria-label={`Approve ${product.title}`}
                              title="Approve listing"
                            >
                              <Check size={15} />
                            </button>
                          ) : null}
                          {product.status !== 'rejected' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setAction({ product, action: 'reject' });
                                setReason('');
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-[7px] text-muted transition hover:bg-elevated hover:text-ink"
                              aria-label={`Reject ${product.title}`}
                              title="Reject listing"
                            >
                              <ShieldX size={15} />
                            </button>
                          ) : null}
                          {product.status !== 'removed' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setAction({ product, action: 'remove' });
                                setReason('');
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-[7px] text-danger transition hover:bg-danger/5"
                              aria-label={`Remove ${product.title}`}
                              title="Remove listing"
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-muted">
                Showing {result.items.length} of {result.total} listings
              </p>
              <Pagination page={result.page} pages={result.pages} onChange={setPage} />
            </div>
          </>
        )}
      </section>

      <Modal
        open={Boolean(action)}
        onClose={() => setAction(null)}
        title={action?.action === 'reject' ? 'Reject this listing?' : 'Remove this listing?'}
        description={action ? `${action.product.title} · ${action.product.seller_name}` : ''}
        size="sm"
      >
        <div className="space-y-4">
          <Textarea
            label={action?.action === 'reject' ? 'Reason (required)' : 'Reason (optional)'}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="Price does not match the described condition."
          />
          <p className="text-xs text-muted">
            The seller receives a notification with this note. Rejected listings can be resubmitted after edits.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setAction(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={busy === action?.product.id + action?.action}
              disabled={action?.action === 'reject' && !reason.trim()}
              onClick={() => moderate(action.product, action.action, reason)}
            >
              {action?.action === 'reject' ? 'Reject listing' : 'Remove listing'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
