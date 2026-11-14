import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Eye, Heart, MapPin, X } from 'lucide-react';
import { productService } from '../../services';
import { apiError } from '../../services/api';
import ProductImage from '../common/ProductImage';
import Avatar from '../common/Avatar';
import { Skeleton } from '../common/Feedback';
import Badge, { StatusBadge } from '../common/Badge';
import { buttonStyles } from '../common/Button';
import { CONDITION_LABEL, PRODUCT_STATUS } from '../../constants';
import { categoryImage } from '../../utils/categoryImages';
import { formatDate, inr, timeAgo } from '../../utils/format';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

export default function ListingQuickView({ product, onClose, onToggleWishlist, wishlistBusy = false }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useBodyScrollLock(Boolean(product));

  useEffect(() => {
    if (!product) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [product, onClose]);

  useEffect(() => {
    let active = true;
    if (!product) return undefined;
    setDetail(null);
    setError('');
    setLoading(true);
    productService
      .get(product.id)
      .then((data) => {
        if (active) setDetail(data);
      })
      .catch((err) => {
        if (active) setError(apiError(err, 'Could not load this listing.').message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [product]);

  if (!product) return null;

  const data = detail || product;
  const cover = detail?.images?.[0]?.url || product.cover_image;
  const category = detail?.category?.name || product.category_name;
  const seller = detail?.seller;
  const status = detail?.status || product.status;
  const condition = detail?.condition || product.condition;
  const description = detail?.description;
  const details = [
    ['Category', category || '—'],
    ['Condition', CONDITION_LABEL[condition] || condition],
    ['Seller', seller?.full_name || product.seller_name || '—'],
    ['College', seller?.college || product.seller_college || '—'],
    ['Listed', formatDate(detail?.created_at || product.created_at)],
    ['Location', detail?.location || product.location || product.seller_college || '—'],
    ['Status', PRODUCT_STATUS[status]?.label || status],
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <button
        type="button"
        aria-label="Close listing preview"
        data-no-ripple
        className="modal-backdrop absolute inset-0"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${product.title} preview`}
        className="quickview-panel relative z-10 h-full w-full overflow-y-auto bg-canvas/95 shadow-lift backdrop-blur-xl sm:max-w-[820px]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-sm transition hover:text-ink"
          aria-label="Close"
        >
          <X size={17} />
        </button>

        <div className="grid gap-0 sm:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="bg-surface p-4 sm:p-6">
            <div className="overflow-hidden rounded-[12px] border border-line bg-elevated">
              <ProductImage
                src={cover}
                alt={product.title}
                fallback={categoryImage(detail?.category?.slug, category)}
                className="aspect-[4/5] w-full"
              />
            </div>
            {detail?.images?.length > 1 ? (
              <div className="mt-2.5 grid grid-cols-4 gap-2">
                {detail.images.slice(0, 4).map((image) => (
                  <div key={image.id} className="overflow-hidden rounded-[7px] border border-line">
                    <img src={image.url} alt="" className="aspect-square h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : null}
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
              <MapPin size={12} /> {detail?.location || product.location || product.seller_college}
            </p>
          </div>

          <div className="min-w-0 p-4 sm:p-6 sm:pt-10">
            <Badge tone="brand" size="xs">{category || 'Campus listing'}</Badge>
            <h2 className="mt-2.5 font-display text-[24px] font-bold leading-tight text-ink sm:text-[27px]">
              {product.title}
            </h2>
            {seller ? (
              <Link to={`/seller/${seller.id}`} className="mt-2.5 inline-flex items-center gap-2 text-[12px] text-muted hover:text-ink">
                <Avatar name={seller.full_name} src={seller.avatar_url} size="xs" />
                <span className="font-medium">{seller.full_name}</span>
                {seller.verification_status === 'verified' ? <span className="text-success">· Verified</span> : null}
              </Link>
            ) : (
              <p className="mt-2.5 text-[12px] text-muted">{product.seller_name}</p>
            )}

            <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-[10px] border border-line bg-[#EEF2F7] dark:bg-elevated">
              {[
                ['Price', inr(product.price)],
                ['Condition', CONDITION_LABEL[condition] || condition],
                ['Views', detail?.views_count ?? '—'],
              ].map(([label, value], index) => (
                <div key={label} className={index ? 'border-l border-line px-3 py-2.5' : 'px-3 py-2.5'}>
                  <p className="text-[10px] text-muted">{label}</p>
                  <p className="mt-0.5 truncate text-[12.5px] font-semibold text-ink">{value}</p>
                </div>
              ))}
            </div>

            {error ? (
              <p className="mt-4 rounded-control border border-danger/20 bg-danger/5 p-3 text-xs text-danger">{error}</p>
            ) : null}

            <dl className="mt-4 divide-y divide-line text-[12px]">
              {details.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[105px_1fr] gap-3 py-2.5">
                  <dt className="text-muted">{label}</dt>
                  <dd className="min-w-0 font-medium text-ink">
                    {label === 'Status' ? <StatusBadge map={PRODUCT_STATUS} value={status} size="xs" /> : value}
                  </dd>
                </div>
              ))}
            </dl>

            {loading ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            ) : description ? (
              <p className="mt-4 line-clamp-4 text-[12.5px] leading-relaxed text-muted">{description}</p>
            ) : null}

            <div className="mt-5 flex flex-col gap-2">
              <Link to={`/product/${product.id}`} className={buttonStyles({ block: true })}>
                View full listing
              </Link>
              <div className="grid grid-cols-2 gap-2">
                {onToggleWishlist ? (
                  <button
                    type="button"
                    onClick={() => onToggleWishlist({ ...product, is_wishlisted: detail?.is_wishlisted ?? product.is_wishlisted })}
                    disabled={wishlistBusy}
                    className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-control border border-line bg-surface text-[12px] font-semibold transition hover:text-danger ${
                      product.is_wishlisted ? 'text-danger' : 'text-muted'
                    }`}
                  >
                    <Heart size={14} className={product.is_wishlisted ? 'fill-danger' : ''} />
                    {product.is_wishlisted ? 'Saved' : 'Save'}
                  </button>
                ) : null}
                <Link
                  to={`/product/${product.id}`}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-control border border-line bg-surface text-[12px] font-semibold text-muted transition hover:text-ink"
                >
                  <Eye size={14} /> Details
                </Link>
              </div>
            </div>

            <p className="mt-3 text-center text-[10.5px] text-muted">
              Listed {timeAgo(detail?.created_at || product.created_at)} · payment happens in person
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
