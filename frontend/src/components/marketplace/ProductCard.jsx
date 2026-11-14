import { Link } from 'react-router-dom';
import { BadgeCheck, Heart, MapPin } from 'lucide-react';
import ProductImage from '../common/ProductImage';
import { CONDITION_LABEL } from '../../constants';
import { cx, inr } from '../../utils/format';
import { categoryImage } from '../../utils/categoryImages';

export default function ProductCard({ product, onToggleWishlist, wishlistBusy = false, onOpen }) {
  const sold = product.status === 'sold';
  const fallback = categoryImage(null, product.category_name);

  const body = (
    <>
      <div className="relative overflow-hidden rounded-[10px] border border-line bg-elevated">
        <ProductImage
          src={product.cover_image}
          alt={product.title}
          fallback={fallback}
          className="aspect-[4/5] w-full transition duration-300 group-hover:scale-[1.025]"
        />
        <span className="absolute left-2 top-2 rounded-full bg-surface/95 px-2 py-1 text-[10px] font-medium text-ink shadow-sm backdrop-blur">
          {CONDITION_LABEL[product.condition] || product.condition}
        </span>
        {sold ? (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/45">
            <span className="rounded-full bg-surface px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-ink">
              Sold
            </span>
          </div>
        ) : null}
      </div>

      <div className="px-0.5 pt-2.5">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink transition group-hover:text-brand-600">
          {product.title}
        </p>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="font-display text-[15px] font-bold text-ink">{inr(product.price)}</span>
          {product.original_price ? (
            <span className="text-[11px] text-muted line-through">{inr(product.original_price)}</span>
          ) : null}
        </div>
        <p className="mt-1 flex items-center gap-1 text-[10.5px] text-muted">
          <MapPin size={10} className="shrink-0" />
          <span className="truncate">{product.location || product.seller_college}</span>
          {product.seller_verified ? (
            <BadgeCheck size={11} className="ml-auto shrink-0 text-success" aria-label="Verified seller" />
          ) : null}
        </p>
      </div>
    </>
  );

  return (
    <article className="product-card group relative min-w-0">
      {onOpen ? (
        <button type="button" onClick={() => onOpen(product)} className="block w-full text-left">
          {body}
        </button>
      ) : (
        <Link to={`/product/${product.id}`} className="block">
          {body}
        </Link>
      )}

      {onToggleWishlist ? (
        <button
          type="button"
          onClick={() => onToggleWishlist(product)}
          disabled={wishlistBusy}
          aria-label={product.is_wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          aria-pressed={product.is_wishlisted}
          className={cx(
            'absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface/95 text-muted shadow-sm transition hover:text-danger',
            product.is_wishlisted && 'text-danger',
          )}
        >
          <Heart size={14} className={product.is_wishlisted ? 'fill-danger' : ''} />
        </button>
      ) : null}
    </article>
  );
}
