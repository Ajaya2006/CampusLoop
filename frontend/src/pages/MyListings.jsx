import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Eye, Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import { authService, productService } from '../services';
import { apiError } from '../services/api';
import { useToast } from '../context/ToastContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import PageHeader from '../components/layout/PageHeader';
import LiquidTabBar from '../components/navigation/LiquidTabBar';
import ProductImage from '../components/common/ProductImage';
import Badge, { StatusBadge } from '../components/common/Badge';
import Button, { buttonStyles } from '../components/common/Button';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Pagination from '../components/common/Pagination';
import { EmptyState, ErrorState, ListSkeleton } from '../components/common/Feedback';
import { PRODUCT_STATUS, CONDITION_LABEL } from '../constants';
import { inr, timeAgo } from '../utils/format';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Live' },
  { value: 'pending_verification', label: 'Pending' },
  { value: 'draft', label: 'Drafts' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'sold', label: 'Sold' },
];

export default function MyListings() {
  useDocumentTitle('My listings');
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const status = params.get('status') || 'all';
  const page = Number(params.get('page') || 1);

  const [result, setResult] = useState(null);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, dashboard] = await Promise.all([
        productService.mine({ status, page, page_size: 10 }),
        authService.dashboard().catch(() => null),
      ]);
      setResult(data);
      if (dashboard) setCounts(dashboard.listings);
    } catch (err) {
      setError(apiError(err, 'Could not load your listings.').message);
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const changeTab = (value) => {
    const next = new URLSearchParams();
    if (value !== 'all') next.set('status', value);
    setParams(next, { replace: true });
  };

  const markSold = async (product) => {
    setActionId(product.id);
    try {
      await productService.markSold(product.id);
      toast.success('Marked as sold', product.title);
      await load();
    } catch (err) {
      toast.error('Could not mark as sold', apiError(err).message);
    } finally {
      setActionId(null);
      setConfirm(null);
    }
  };

  const remove = async (product) => {
    setActionId(product.id);
    try {
      await productService.remove(product.id);
      toast.success('Listing removed', product.title);
      await load();
    } catch (err) {
      toast.error('Could not remove listing', apiError(err).message);
    } finally {
      setActionId(null);
      setConfirm(null);
    }
  };

  const tabs = TABS.map((tab) => ({
    ...tab,
    count:
      {
        all: counts?.total,
        available: counts?.active,
        pending_verification: counts?.pending,
        rejected: counts?.rejected,
        sold: counts?.sold,
      }[tab.value] ?? undefined,
  }));

  return (
    <div>
      <PageHeader
        title="My listings"
        description="Track approval status, update prices and close deals."
        actions={
          <Link to="/sell" className={buttonStyles({})}>
            <Plus size={16} /> New listing
          </Link>
        }
      />

      <LiquidTabBar items={tabs} value={status} onChange={changeTab} ariaLabel="Listing status" className="mb-4 w-full sm:w-auto" />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <ListSkeleton rows={5} />
      ) : !result?.items?.length ? (
        <EmptyState
          icon={Tag}
          title={status === 'all' ? 'You have no listings yet' : `No ${PRODUCT_STATUS[status]?.label?.toLowerCase() || status} listings`}
          description={
            status === 'all'
              ? 'List something you no longer need — textbooks, gadgets, furniture. It takes two minutes.'
              : 'Switch tabs to see listings in other states.'
          }
          action={
            status === 'all' ? (
              <Link to="/sell" className={buttonStyles({})}>
                <Plus size={16} /> Create a listing
              </Link>
            ) : (
              <Button variant="secondary" onClick={() => changeTab('all')}>View all listings</Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {result.items.map((product) => (
            <article key={product.id} className="surface-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
              <Link to={`/product/${product.id}`} className="shrink-0">
                <ProductImage src={product.cover_image} alt={product.title} className="h-24 w-full rounded-control sm:h-20 sm:w-24" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/product/${product.id}`} className="truncate text-sm font-semibold text-ink hover:text-brand-600">
                    {product.title}
                  </Link>
                  <StatusBadge map={PRODUCT_STATUS} value={product.status} />
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {inr(product.price)} · {CONDITION_LABEL[product.condition]} · {product.category_name}
                </p>
                <p className="mt-0.5 text-[11px] text-muted">Listed {timeAgo(product.created_at)} · {product.seller_college}</p>
                {product.rejection_reason ? (
                  <p className="mt-1 rounded bg-danger/5 px-2 py-1 text-[11.5px] text-danger">
                    Moderator: {product.rejection_reason}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                <Link to={`/product/${product.id}`} className={buttonStyles({ variant: 'ghost', size: 'xs' })}>
                  <Eye size={13} /> View
                </Link>
                <Link to={`/sell/${product.id}/edit`} className={buttonStyles({ variant: 'secondary', size: 'xs' })}>
                  <Pencil size={13} /> Edit
                </Link>
                {['available', 'approved'].includes(product.status) ? (
                  <Button size="xs" variant="success" icon={Check} loading={actionId === product.id} onClick={() => setConfirm({ type: 'sold', product })}>
                    Sold
                  </Button>
                ) : null}
                <Button size="xs" variant="ghost" className="text-danger" icon={Trash2} onClick={() => setConfirm({ type: 'delete', product })}>
                  Remove
                </Button>
              </div>
            </article>
          ))}

          <div className="pt-3">
            <Pagination
              page={result.page}
              pages={result.pages}
              onChange={(nextPage) => {
                const next = new URLSearchParams(params);
                if (nextPage === 1) next.delete('page');
                else next.set('page', String(nextPage));
                setParams(next);
              }}
            />
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted">
        <Badge tone="neutral">Approval is manual</Badge>
        <span>Pending listings are only visible to you and moderators.</span>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => (confirm?.type === 'sold' ? markSold(confirm.product) : remove(confirm.product))}
        title={confirm?.type === 'sold' ? 'Mark as sold?' : 'Remove this listing?'}
        description={
          confirm?.type === 'sold'
            ? 'Buyers will no longer be able to message or offer. Use the transaction flow if you met through CampusLoop.'
            : 'The listing will stop appearing in the marketplace. This cannot be undone.'
        }
        confirmLabel={confirm?.type === 'sold' ? 'Mark sold' : 'Remove listing'}
        destructive
      />
    </div>
  );
}
