import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  Filter,
  LayoutGrid,
  List,
  PackageSearch,
  Plus,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { productService, wishlistService } from '../services';
import { apiError } from '../services/api';
import ProductCard from '../components/marketplace/ProductCard';
import ListingQuickView from '../components/marketplace/ListingQuickView';
import FilterPanel from '../components/marketplace/FilterPanel';
import SearchBar from '../components/common/SearchBar';
import Pagination from '../components/common/Pagination';
import Modal from '../components/common/Modal';
import Avatar from '../components/common/Avatar';
import Badge, { StatusBadge } from '../components/common/Badge';
import ProductImage from '../components/common/ProductImage';
import { EmptyState, ErrorState, ListSkeleton, ProductCardSkeleton } from '../components/common/Feedback';
import Button, { buttonStyles } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { CONDITION_LABEL, PRODUCT_STATUS, SORT_OPTIONS } from '../constants';
import { cx, inr, timeAgo } from '../utils/format';
import { categoryImage } from '../utils/categoryImages';

const DEFAULTS = {
  q: '',
  category: '',
  condition: '',
  min_price: '',
  max_price: '',
  college: '',
  verified_only: false,
  sort: 'latest',
  page: 1,
  page_size: 12,
};

const QUICK_TABS = [
  { value: 'popular', label: 'Popular' },
  { value: 'latest', label: 'Latest' },
  { value: 'verified', label: 'Verified' },
];

function ListingRow({ product, onOpen }) {
  return (
    <tr
      className="cursor-pointer text-[12px] transition hover:bg-elevated/60"
      onClick={() => onOpen(product)}
    >
      <td className="px-4 py-3">
        <button type="button" onClick={() => onOpen(product)} className="flex min-w-0 items-center gap-3 text-left">
          <ProductImage
            src={product.cover_image}
            alt={product.title}
            fallback={categoryImage(null, product.category_name)}
            className="h-12 w-10 shrink-0 rounded-[6px]"
          />
          <span className="min-w-0">
            <span className="block max-w-[250px] truncate font-semibold text-ink">{product.title}</span>
            <span className="mt-0.5 block text-[10.5px] text-muted">
              {product.category_name} · {CONDITION_LABEL[product.condition] || product.condition}
            </span>
          </span>
        </button>
      </td>
      <td className="px-4 py-3">
        <span className="flex min-w-0 items-center gap-2">
          <Avatar name={product.seller_name} size="xs" />
          <span className="min-w-0">
            <span className="block max-w-[150px] truncate font-medium text-ink">{product.seller_name}</span>
            <span className="block max-w-[150px] truncate text-[10.5px] text-muted">{product.seller_college}</span>
          </span>
        </span>
      </td>
      <td className="px-4 py-3 font-semibold text-ink">{inr(product.price)}</td>
      <td className="px-4 py-3 text-muted">{product.location || product.seller_college}</td>
      <td className="px-4 py-3"><StatusBadge map={PRODUCT_STATUS} value={product.status} size="xs" /></td>
      <td className="px-4 py-3 text-muted">{timeAgo(product.created_at)}</td>
      <td className="px-3 py-3 text-right">
        <span className="inline-flex rounded-lg p-1.5 text-muted">
          <ChevronRight size={15} />
        </span>
      </td>
    </tr>
  );
}

export default function Marketplace() {
  useDocumentTitle('Marketplace');
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const state = useMemo(
    () => ({
      q: params.get('q') || DEFAULTS.q,
      category: params.get('category') || DEFAULTS.category,
      conditions: (params.get('condition') || '').split(',').filter(Boolean),
      min_price: params.get('min_price') || DEFAULTS.min_price,
      max_price: params.get('max_price') || DEFAULTS.max_price,
      college: params.get('college') || DEFAULTS.college,
      verified_only: params.get('verified_only') === 'true',
      sort: params.get('sort') || DEFAULTS.sort,
      page: Number(params.get('page') || 1),
      page_size: Number(params.get('page_size') || DEFAULTS.page_size),
    }),
    [params],
  );

  const [searchInput, setSearchInput] = useState(state.q);
  const [filters, setFilters] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileFilters, setMobileFilters] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [view, setView] = useState('grid');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setSearchInput(state.q);
  }, [state.q]);

  const update = useCallback(
    (patch) => {
      const next = new URLSearchParams(params);
      Object.entries(patch).forEach(([key, value]) => {
        if (key === 'conditions') {
          if (value.length) next.set('condition', value.join(','));
          else next.delete('condition');
          return;
        }
        if (key === 'verified_only') {
          if (value) next.set('verified_only', 'true');
          else next.delete('verified_only');
          return;
        }
        if (
          value === '' ||
          value === null ||
          value === undefined ||
          (key === 'page' && Number(value) === 1) ||
          (key === 'page_size' && Number(value) === DEFAULTS.page_size)
        ) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      if (!('page' in patch)) next.delete('page');
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const reset = () => {
    setSearchInput('');
    setParams(new URLSearchParams(), { replace: true });
  };

  useEffect(() => {
    let active = true;
    productService
      .filters()
      .then((data) => {
        if (active) setFilters(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const query = {
      page: state.page,
      page_size: state.page_size,
      sort: state.sort,
    };
    if (state.q) query.q = state.q;
    if (state.category) query.category = state.category;
    if (state.conditions.length) query.condition = state.conditions;
    if (state.min_price) query.min_price = Number(state.min_price);
    if (state.max_price) query.max_price = Number(state.max_price);
    if (state.college) query.college = state.college;
    if (state.verified_only) query.verified_only = true;

    productService
      .list(query)
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((err) => {
        if (active) setError(apiError(err, 'Could not load listings.').message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [state, reloadKey]);

  const toggleWishlist = async (product) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/marketplace' } });
      return;
    }
    setWishlistBusy(product.id);
    const saved = product.is_wishlisted;
    const nextSaved = !saved;
    try {
      if (saved) await wishlistService.remove(product.id);
      else await wishlistService.add(product.id);
      setResult((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === product.id ? { ...item, is_wishlisted: nextSaved } : item,
        ),
      }));
      setSelected((current) =>
        current && current.id === product.id ? { ...current, is_wishlisted: nextSaved } : current,
      );
      toast.success(nextSaved ? 'Saved to wishlist' : 'Removed from wishlist');
    } catch (err) {
      toast.error('Wishlist update failed', apiError(err).message);
    } finally {
      setWishlistBusy(null);
    }
  };

  const quickTab = state.verified_only
    ? 'verified'
    : ['popular', 'latest'].includes(state.sort)
      ? state.sort
      : '';

  const setQuickTab = (value) => {
    if (value === 'popular') update({ sort: 'popular', verified_only: false, page: 1 });
    else if (value === 'verified') update({ sort: 'latest', verified_only: true, page: 1 });
    else update({ sort: 'latest', verified_only: false, page: 1 });
  };

  const activeChips = [
    state.q && { key: 'q', label: `“${state.q}”` },
    state.category && {
      key: 'category',
      label: `Category: ${filters?.categories?.flatMap((c) => [c, ...(c.children || [])]).find((c) => c.slug === state.category)?.name || state.category}`,
    },
    ...state.conditions.map((condition) => ({
      key: `condition:${condition}`,
      label: CONDITION_LABEL[condition] || condition,
    })),
    state.min_price && { key: 'min_price', label: `Min ${inr(state.min_price)}` },
    state.max_price && { key: 'max_price', label: `Max ${inr(state.max_price)}` },
    state.college && { key: 'college', label: state.college },
    state.verified_only && { key: 'verified_only', label: 'Verified sellers' },
    !['latest', 'popular'].includes(state.sort) && {
      key: 'sort',
      label: SORT_OPTIONS.find((option) => option.value === state.sort)?.label || state.sort,
    },
  ].filter(Boolean);

  const clearChip = (chip) => {
    if (chip.key.startsWith('condition:')) {
      const value = chip.key.split(':')[1];
      update({ conditions: state.conditions.filter((item) => item !== value) });
      return;
    }
    update({ [chip.key]: DEFAULTS[chip.key] ?? '' });
  };

  const filterProps = { filters, state, onChange: update, onReset: reset };
  const filterCount = activeChips.length;

  return (
    <div>
      <div className="mb-4">
        <p className="text-[11px] font-medium text-brand-600">Workspace / Marketplace</p>
        <div className="mt-0.5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-[25px] font-bold tracking-tight text-ink sm:text-[29px]">Marketplace</h1>
            <p className="mt-0.5 text-[12px] text-muted">
              Approved student listings from across your campus.
            </p>
          </div>
          <p className="text-[11px] text-muted">
            {loading ? 'Loading…' : `${result?.total ?? 0} listing${result?.total === 1 ? '' : 's'} available`}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-card border border-line bg-surface">
        <div className="border-b border-line p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-ink">Listings collection</h2>
              <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] font-semibold text-muted">
                {result?.total ?? 0}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SearchBar
                value={searchInput}
                onChange={setSearchInput}
                onSubmit={(value) => update({ q: value.trim(), page: 1 })}
                placeholder="Search a listing"
                className="min-w-0 flex-1 sm:w-64 sm:flex-none"
              />

              <button
                type="button"
                onClick={() => setMobileFilters(true)}
                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-[12px] font-semibold text-ink transition hover:border-brand-300"
              >
                <SlidersHorizontal size={15} />
                Filter
                {filterCount ? (
                  <span className="rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-white">{filterCount}</span>
                ) : null}
              </button>

              <div className="flex h-11 shrink-0 items-center gap-0.5 rounded-control border border-line bg-surface p-1">
                <button
                  type="button"
                  onClick={() => setView('grid')}
                  aria-label="Grid view"
                  aria-pressed={view === 'grid'}
                  className={cx(
                    'inline-flex h-8 w-8 items-center justify-center rounded-[7px] transition',
                    view === 'grid' ? 'bg-brand-500 text-white' : 'text-muted hover:bg-elevated hover:text-ink',
                  )}
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setView('list')}
                  aria-label="List view"
                  aria-pressed={view === 'list'}
                  className={cx(
                    'inline-flex h-8 w-8 items-center justify-center rounded-[7px] transition',
                    view === 'list' ? 'bg-brand-500 text-white' : 'text-muted hover:bg-elevated hover:text-ink',
                  )}
                >
                  <List size={16} />
                </button>
              </div>

              <Link to="/sell" className={buttonStyles({ size: 'md', className: 'h-11 shrink-0' })}>
                <Plus size={16} /> Sell an item
              </Link>
            </div>
          </div>

          <div className="mt-3 flex gap-1 rounded-[9px] bg-[#F2F1EE] p-1 dark:bg-elevated sm:w-fit">
            {QUICK_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setQuickTab(tab.value)}
                className={cx(
                  'flex-1 rounded-[7px] px-3 py-1.5 text-[12px] font-medium transition sm:flex-none',
                  quickTab === tab.value
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-muted hover:text-ink',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeChips.length ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => clearChip(chip)}
                  className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 transition hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-200"
                >
                  {chip.label} <X size={10} />
                </button>
              ))}
              <button type="button" onClick={reset} className="ml-1 text-[11px] font-semibold text-muted underline-offset-2 hover:underline">
                Clear all
              </button>
            </div>
          ) : null}
        </div>

        <div className="p-4">
          {error ? (
            <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />
          ) : loading ? (
            view === 'grid' ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </div>
            ) : (
              <ListSkeleton rows={6} />
            )
          ) : !result?.items?.length ? (
            <EmptyState
              icon={PackageSearch}
              title="No listings match those filters"
              description="Try widening your price range, clearing a condition, or searching for a different product."
              action={
                <Button variant="secondary" onClick={reset} icon={Filter}>
                  Reset filters
                </Button>
              }
            />
          ) : view === 'grid' ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 xl:grid-cols-4">
              {result.items.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpen={setSelected}
                  onToggleWishlist={toggleWishlist}
                  wishlistBusy={wishlistBusy === product.id}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[9px] border border-line">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr className="border-b border-line bg-[#F6F4F1] text-[10px] uppercase tracking-[0.06em] text-muted dark:bg-elevated">
                    <th className="px-4 py-2.5 font-semibold">Listing</th>
                    <th className="px-4 py-2.5 font-semibold">Seller</th>
                    <th className="px-4 py-2.5 font-semibold">Price</th>
                    <th className="px-4 py-2.5 font-semibold">Location</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold">Added</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-surface">
                  {result.items.map((product) => (
                    <ListingRow key={product.id} product={product} onOpen={setSelected} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!error && !loading && result?.items?.length ? (
          <div className="flex flex-col gap-3 border-t border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-[11px] text-muted">
              <label className="flex items-center gap-1.5">
                Show
                <select
                  value={state.page_size}
                  onChange={(event) => update({ page_size: Number(event.target.value), page: 1 })}
                  className="h-8 rounded-[6px] border border-line bg-surface px-1.5 text-[11px] font-medium text-ink"
                  aria-label="Listings per page"
                >
                  {[8, 12, 24, 36].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </label>
              <span>
                of {result.total} result{result.total === 1 ? '' : 's'}
              </span>
            </div>
            <Pagination page={result.page} pages={result.pages} onChange={(page) => update({ page })} />
          </div>
        ) : null}
      </section>

      <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-muted">
        <Badge tone="success" size="xs">Student verified</Badge>
        Every listing is posted by a verified student. Inspect items and pay in person.
      </p>

      <Modal open={mobileFilters} onClose={() => setMobileFilters(false)} title="Filter listings" size="sm">
        <FilterPanel {...filterProps} className="pb-4" />
        <div className="sticky bottom-0 -mx-5 mt-4 flex gap-2 border-t border-line bg-surface p-4 sm:-mx-6 sm:px-6">
          <Button variant="secondary" block onClick={reset}>
            Reset
          </Button>
          <Button block onClick={() => setMobileFilters(false)}>
            Show listings
          </Button>
        </div>
      </Modal>

      <ListingQuickView
        product={selected}
        onClose={() => setSelected(null)}
        onToggleWishlist={toggleWishlist}
        wishlistBusy={selected ? wishlistBusy === selected.id : false}
      />
    </div>
  );
}
