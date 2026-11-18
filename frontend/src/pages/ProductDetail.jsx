import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  Check,
  Eye,
  Flag,
  HandCoins,
  Heart,
  MapPin,
  MessageCircle,
  Pencil,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Truck,
} from 'lucide-react';
import { chatService, offerService, productService, reportService, wishlistService } from '../services';
import { apiError, mediaUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import ProductImage from '../components/common/ProductImage';
import Badge, { StatusBadge, VerifiedBadge } from '../components/common/Badge';
import Avatar from '../components/common/Avatar';
const LocationMap = lazy(() => import('../components/location/LocationMap'));
import Button, { buttonStyles } from '../components/common/Button';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { ErrorState, LoadingPage, Skeleton } from '../components/common/Feedback';
import { Checkbox, Select, Textarea } from '../components/common/Form';
import { CONDITION_LABEL, PRODUCT_STATUS, REPORT_REASONS } from '../constants';
import { formatDate, inr, timeAgo } from '../utils/format';
import { categoryImage } from '../utils/categoryImages';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated, isVerified, user } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [offerBusy, setOfferBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0].value);
  const [reportDetails, setReportDetails] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [confirmSold, setConfirmSold] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [priceGuide, setPriceGuide] = useState(null);
  const [related, setRelated] = useState([]);

  useDocumentTitle(product?.title);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setActiveImage(0);
    productService
      .get(id)
      .then((data) => {
        if (!active) return;
        setProduct(data);
        setOfferAmount(String(Math.round(data.price * 0.85)));
        if (data.is_owner || data.status === 'available') {
          productService
            .productPriceRecommendation(data.id)
            .then((guide) => active && setPriceGuide(guide))
            .catch(() => {});
        }
      })
      .catch((err) => {
        if (active) setError(apiError(err, 'This listing could not be loaded.').message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    const slug = product?.category?.slug;
    if (!slug) return undefined;
    let active = true;
    (async () => {
      let data = await productService.list({ category: slug, page_size: 5, sort: 'popular' });
      let items = (data.items || []).filter((item) => item.id !== product.id);
      if (!items.length) {
        data = await productService.list({ page_size: 5, sort: 'popular' });
        items = (data.items || []).filter((item) => item.id !== product.id);
      }
      if (active) setRelated(items.slice(0, 3));
    })().catch(() => {});
    return () => {
      active = false;
    };
  }, [product?.id, product?.category?.slug]);

  const images = useMemo(() => product?.images || [], [product]);
  const isSold = product?.status === 'sold' || product?.status === 'reserved';
  const isAvailable = product?.status === 'available' || product?.status === 'approved';
  const discount =
    product?.original_price && product.original_price > product.price
      ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
      : null;

  const requireSignIn = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/product/${id}` } });
      return true;
    }
    if (!isVerified) {
      toast.info('Verification required', 'Verify your student account to message sellers and make offers.');
      navigate('/verify');
      return true;
    }
    return false;
  };

  const toggleWishlist = async () => {
    if (requireSignIn()) return;
    setWishlistBusy(true);
    try {
      if (product.is_wishlisted) await wishlistService.remove(product.id);
      else await wishlistService.add(product.id);
      setProduct({ ...product, is_wishlisted: !product.is_wishlisted });
      toast.success(product.is_wishlisted ? 'Removed from wishlist' : 'Saved to wishlist');
    } catch (err) {
      toast.error('Wishlist update failed', apiError(err).message);
    } finally {
      setWishlistBusy(false);
    }
  };

  const startConversation = async (initialMessage) => {
    const conversation = await chatService.start({ product_id: product.id, message: initialMessage });
    navigate(`/messages/${conversation.id}`);
    return conversation;
  };

  const handleChat = async () => {
    if (requireSignIn()) return;
    setChatBusy(true);
    try {
      await startConversation(`Hi, is “${product.title}” still available?`);
    } catch (err) {
      toast.error('Could not start the chat', apiError(err).message);
    } finally {
      setChatBusy(false);
    }
  };

  const submitOffer = async (event) => {
    event.preventDefault();
    if (requireSignIn()) return;
    const amount = Number(offerAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid offer amount');
      return;
    }
    setOfferBusy(true);
    try {
      const conversation = await chatService.start({ product_id: product.id });
      await offerService.create({
        conversation_id: conversation.id,
        amount,
        message: offerMessage.trim() || undefined,
      });
      setOfferOpen(false);
      toast.success('Offer sent', 'You can track the response in your conversation.');
      navigate(`/messages/${conversation.id}`);
    } catch (err) {
      toast.error('Offer not sent', apiError(err).message);
    } finally {
      setOfferBusy(false);
    }
  };

  const submitReport = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/product/${id}` } });
      return;
    }
    setReportBusy(true);
    try {
      await reportService.create({
        target_type: 'product',
        target_id: product.id,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });
      setReportOpen(false);
      setReportDetails('');
      toast.success('Report submitted', 'A moderator will review this listing.');
    } catch (err) {
      toast.error('Report failed', apiError(err).message);
    } finally {
      setReportBusy(false);
    }
  };

  const markSold = async () => {
    setActionBusy(true);
    try {
      const updated = await productService.markSold(product.id);
      setProduct(updated);
      toast.success('Marked as sold', 'This listing is no longer publicly available.');
    } catch (err) {
      toast.error('Could not update listing', apiError(err).message);
    } finally {
      setActionBusy(false);
    }
  };

  const removeListing = async () => {
    setActionBusy(true);
    try {
      await productService.remove(product.id);
      toast.success('Listing removed');
      navigate('/my-listings');
    } catch (err) {
      toast.error('Could not remove listing', apiError(err).message);
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) return <LoadingPage label="Loading listing…" />;
  if (error) {
    return (
      <ErrorState
        title="Listing unavailable"
        message={error}
        onRetry={() => navigate('/marketplace')}
      />
    );
  }
  if (!product) return null;

  const cover = images[activeImage]?.url;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium text-brand-600">
            <Link to="/marketplace" className="hover:underline">Marketplace</Link>
            <span className="px-1.5 text-muted">/</span>
            <Link to={`/marketplace?category=${product.category?.slug || ''}`} className="hover:underline">
              {product.category?.name}
            </Link>
            <span className="px-1.5 text-muted">/</span>
            Listing details
          </p>
          <h1 className="mt-0.5 font-display text-[25px] font-bold tracking-tight text-ink sm:text-[29px]">Listing details</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="liquid-glass-item inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-[18px] border border-line bg-surface">
            <ProductImage
              src={cover}
              alt={product.title}
              fallback={categoryImage(product.category?.slug, product.category?.name)}
              className="aspect-[4/5] max-h-[620px] w-full"
            />
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              <Badge tone="neutral" className="bg-surface/95 backdrop-blur">
                {CONDITION_LABEL[product.condition] || product.condition}
              </Badge>
              {discount ? <Badge tone="success" className="bg-surface/95 backdrop-blur">{discount}% below original</Badge> : null}
              {!isAvailable ? <StatusBadge map={PRODUCT_STATUS} value={product.status} /> : null}
            </div>
            {isSold ? (
              <div className="absolute inset-0 flex items-center justify-center bg-ink/40">
                <span className="rounded-full bg-surface px-5 py-2 text-sm font-bold uppercase tracking-wide text-ink">
                  {product.status === 'sold' ? 'Sold' : 'Reserved'}
                </span>
              </div>
            ) : null}
          </div>

          {images.length > 1 ? (
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`overflow-hidden rounded-lg border-2 transition ${
                    index === activeImage ? 'border-brand-500' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`View image ${index + 1}`}
                >
                  <img src={mediaUrl(image.url)} alt="" className="aspect-square h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}

          {Number.isFinite(product.latitude) && Number.isFinite(product.longitude) ? (
            <div className="surface-card overflow-hidden">
              <div className="flex items-center justify-between gap-2 p-5 pb-3">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <MapPin size={15} className="text-brand-500" /> Pickup area
                </h2>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${product.latitude}&mlon=${product.longitude}#map=16/${product.latitude}/${product.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-semibold text-brand-600 hover:underline"
                >
                  Open map
                </a>
              </div>
              <Suspense fallback={<Skeleton className="h-[220px] w-full rounded-control" />}>
                <LocationMap
                  latitude={product.latitude}
                  longitude={product.longitude}
                  label={product.location}
                  details={product.location_details}
                />
              </Suspense>
              <div className="p-5 pt-3">
                <p className="text-sm font-medium text-ink">
                  {product.location || product.location_details || 'Pinned pickup area'}
                </p>
                {product.location_details ? <p className="mt-0.5 text-[11px] text-muted">{product.location_details}</p> : null}
                <p className="mt-1 text-[10px] text-muted">Approximate pin set by the seller. Agree the exact meeting spot in chat.</p>
              </div>
            </div>
          ) : null}

          {priceGuide ? (
            <div className="surface-card p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <Sparkles size={15} className="text-brand-500" /> CampusLoop price guide
                </h2>
                <Badge tone="brand" size="xs">{priceGuide.method}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-4">
                <div>
                  <p className="text-xs text-muted">Suggested fair price</p>
                  <p className="font-display text-2xl font-bold text-ink">{inr(priceGuide.suggested_price)}</p>
                </div>
                <p className="text-sm text-muted">
                  Range {inr(priceGuide.min_price)} – {inr(priceGuide.max_price)}
                </p>
              </div>
              <p className="mt-2 text-[13px] text-muted">{priceGuide.explanation}</p>
              <p className="mt-2 text-[11px] text-muted">
                Rule-based estimate · not AI. Based on {priceGuide.comparable_count} comparable listing
                {priceGuide.comparable_count === 1 ? '' : 's'}.
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="surface-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="brand" size="xs">{product.category?.name || 'Campus listing'}</Badge>
                <StatusBadge map={PRODUCT_STATUS} value={product.status} size="xs" />
              </div>
              <button
                type="button"
                onClick={toggleWishlist}
                disabled={wishlistBusy}
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line transition hover:text-danger ${
                  product.is_wishlisted ? 'text-danger' : 'text-muted'
                }`}
                aria-label={product.is_wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
              >
                <Heart size={17} className={product.is_wishlisted ? 'fill-danger' : ''} />
              </button>
            </div>

            <h2 className="mt-3 font-display text-[26px] font-bold leading-tight text-ink sm:text-[30px]">{product.title}</h2>
            <p className="mt-1.5 text-[12px] text-muted">
              Listed by{' '}
              <Link to={`/seller/${product.seller.id}`} className="font-medium text-ink hover:text-brand-600">
                {product.seller.full_name}
              </Link>
              {product.seller.college ? ` · ${product.seller.college}` : ''}
            </p>

            <div className="mt-4 flex flex-wrap items-baseline gap-2">
              <span className="font-display text-[30px] font-extrabold text-ink">{inr(product.price)}</span>
              {product.original_price ? (
                <span className="text-sm text-muted line-through">{inr(product.original_price)}</span>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-[10px] border border-line bg-[#EEF2F7] dark:bg-elevated sm:grid-cols-4">
              {[
                ['Price', inr(product.price)],
                ['Condition', CONDITION_LABEL[product.condition] || product.condition],
                ['Views', product.views_count],
                ['Listed', timeAgo(product.created_at)],
              ].map(([label, value], index) => (
                <div
                  key={label}
                  className={`px-3 py-2.5 ${index % 2 === 1 ? 'border-l border-line' : ''} ${index > 1 ? 'border-t border-line sm:border-t-0' : ''} ${index === 2 ? 'sm:border-l' : ''}`}
                >
                  <p className="text-[10px] text-muted">{label}</p>
                  <p className="mt-0.5 truncate text-[12.5px] font-semibold text-ink">{value ?? '—'}</p>
                </div>
              ))}
            </div>

            <dl className="mt-4 divide-y divide-line text-[12px]">
              {[
                ['Category', product.category?.name || '—'],
                ['Brand', product.brand || '—'],
                ['Age', product.age_months != null ? `${product.age_months} months` : '—'],
                ['Location', product.location || product.seller.college || '—'],
                ['Status', PRODUCT_STATUS[product.status]?.label || product.status],
                ['Seller', product.seller.full_name],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[100px_1fr] gap-3 py-2.5">
                  <dt className="text-muted">{label}</dt>
                  <dd className="min-w-0 font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 border-t border-line pt-4">
              <h3 className="text-[12px] font-semibold text-ink">Description</h3>
              <p className="mt-1.5 whitespace-pre-line text-[12.5px] leading-relaxed text-muted">{product.description}</p>
            </div>

            {[product.category?.name, CONDITION_LABEL[product.condition], product.brand].filter(Boolean).length ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {[product.category?.name, CONDITION_LABEL[product.condition], product.brand]
                  .filter(Boolean)
                  .map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-[6px] bg-elevated px-2 py-1 text-[10.5px] font-medium text-muted">
                      <Tag size={9} /> {tag}
                    </span>
                  ))}
              </div>
            ) : null}

            {product.is_owner ? (
              <div className="mt-5 space-y-3">
                <div className="rounded-control border border-brand-200 bg-brand-50 p-3 text-[13px] text-brand-800 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-200">
                  This is your listing. {isAvailable ? 'It is live on the marketplace.' : `Status: ${PRODUCT_STATUS[product.status]?.label}.`}
                  {product.rejection_reason ? <span className="mt-1 block">Moderator note: {product.rejection_reason}</span> : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Link to={`/sell/${product.id}/edit`} className={buttonStyles({ variant: 'secondary', block: true })}>
                    <Pencil size={15} /> Edit listing
                  </Link>
                  {isAvailable ? (
                    <Button variant="success" block icon={Check} onClick={() => setConfirmSold(true)}>
                      Mark as sold
                    </Button>
                  ) : (
                    <Link to="/offers" className={buttonStyles({ variant: 'secondary', block: true })}>
                      <HandCoins size={15} /> View offers
                    </Link>
                  )}
                </div>
                <Button variant="ghost" block icon={Trash2} className="text-danger hover:bg-danger/5" onClick={() => setConfirmDelete(true)}>
                  Remove listing
                </Button>
              </div>
            ) : (
              <div className="mt-5 space-y-2">
                <Button block size="lg" icon={MessageCircle} loading={chatBusy} onClick={handleChat} disabled={!isAvailable}>
                  Message seller
                </Button>
                <Button
                  block
                  size="lg"
                  variant="secondary"
                  icon={HandCoins}
                  disabled={!isAvailable}
                  onClick={() => {
                    if (requireSignIn()) return;
                    setOfferOpen(true);
                  }}
                >
                  Make an offer
                </Button>
                {!isAvailable ? (
                  <p className="text-center text-xs text-muted">
                    This item is {product.status === 'sold' ? 'already sold' : 'currently unavailable'}.
                  </p>
                ) : (
                  <p className="text-center text-[11px] text-muted">
                    No online payment. Inspect the item and pay in person.
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => (isAuthenticated ? setReportOpen(true) : navigate('/login'))}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted transition hover:text-danger"
            >
              <Flag size={13} /> Report this listing
            </button>
          </div>

          <div className="surface-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Seller</p>
            <Link to={`/seller/${product.seller.id}`} className="mt-3 flex items-center gap-3">
              <Avatar name={product.seller.full_name} src={product.seller.avatar_url} size="md" />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  {product.seller.full_name}
                  {product.seller.verification_status === 'verified' ? <BadgeCheck size={14} className="text-success" /> : null}
                </span>
                <span className="block truncate text-xs text-muted">
                  {product.seller.college}
                  {product.seller.department ? ` · ${product.seller.department}` : ''}
                </span>
              </span>
            </Link>
            <div className="mt-3 flex flex-wrap gap-2">
              <VerifiedBadge status={product.seller.verification_status} compact />
              <Badge tone="neutral" size="xs">
                <CalendarDays size={10} /> Joined {formatDate(product.seller.created_at)}
              </Badge>
            </div>
            {product.seller.bio ? <p className="mt-3 text-[13px] text-muted">{product.seller.bio}</p> : null}
            <Link to={`/seller/${product.seller.id}`} className="mt-3 inline-flex text-xs font-semibold text-brand-600 hover:text-brand-700">
              View seller profile
            </Link>
          </div>

          {related.length ? (
            <div className="surface-card p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[13px] font-semibold text-ink">You may also like</h2>
                <Link
                  to="/marketplace"
                  className="inline-flex items-center gap-0.5 text-[10.5px] font-semibold text-brand-600"
                >
                  View all <ChevronRight size={11} />
                </Link>
              </div>
              <ul className="mt-2 divide-y divide-line">
                {related.map((item) => (
                  <li key={item.id}>
                    <Link to={`/product/${item.id}`} className="flex items-center gap-2.5 py-2.5 transition hover:opacity-75">
                      <ProductImage
                        src={item.cover_image}
                        alt={item.title}
                        fallback={categoryImage(null, item.category_name)}
                        className="h-[52px] w-[42px] shrink-0 rounded-[6px]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11.5px] font-semibold text-ink">{item.title}</span>
                        <span className="mt-0.5 block text-[10.5px] text-muted">
                          {inr(item.price)} · {CONDITION_LABEL[item.condition] || item.condition}
                        </span>
                      </span>
                      <ChevronRight size={13} className="shrink-0 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-card border border-line bg-surface p-5">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <ShieldCheck size={15} className="text-success" /> Safe handover
            </h2>
            <ul className="mt-2 space-y-1.5 text-[13px] text-muted">
              <li className="flex gap-2"><Truck size={14} className="mt-0.5 shrink-0" /> Meet in a public campus spot during the day.</li>
              <li className="flex gap-2"><Eye size={14} className="mt-0.5 shrink-0" /> Inspect the item before paying anything.</li>
              <li className="flex gap-2"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> Never share passwords or OTPs with a buyer.</li>
            </ul>
          </div>
        </div>
      </div>

      <Modal open={offerOpen} onClose={() => setOfferOpen(false)} title="Make an offer" description={`Listed at ${inr(product.price)}. Offers are visible to the seller in your chat.`}>
        <form onSubmit={submitOffer} className="space-y-4">
          <div>
            <label htmlFor="offer-amount" className="label-base">Your offer (₹)</label>
            <input
              id="offer-amount"
              type="number"
              min="1"
              value={offerAmount}
              onChange={(event) => setOfferAmount(event.target.value)}
              className="input-base"
              required
            />
            <p className="mt-1.5 text-xs text-muted">
              Common starting point: {inr(Math.round(product.price * 0.85))} (15% below asking).
            </p>
          </div>
          <Textarea
            label="Message (optional)"
            value={offerMessage}
            onChange={(event) => setOfferMessage(event.target.value)}
            placeholder="Can pick up this week near the library."
            rows={3}
          />
          <Checkbox
            label="I understand CampusLoop does not process payments"
            description="Payment happens in person after inspecting the item."
            required
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setOfferOpen(false)}>Cancel</Button>
            <Button type="submit" loading={offerBusy} icon={HandCoins}>Send offer</Button>
          </div>
        </form>
      </Modal>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report this listing" description="Reports are reviewed by a moderator. False reports may be actioned.">
        <form onSubmit={submitReport} className="space-y-4">
          <Select label="Reason" value={reportReason} onChange={(event) => setReportReason(event.target.value)}>
            {REPORT_REASONS.map((reason) => (
              <option key={reason.value} value={reason.value}>{reason.label}</option>
            ))}
          </Select>
          <Textarea
            label="Details (optional)"
            value={reportDetails}
            onChange={(event) => setReportDetails(event.target.value)}
            placeholder="Describe what looks wrong with this listing."
            rows={3}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button type="submit" variant="danger" loading={reportBusy} icon={Flag}>Submit report</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmSold}
        onClose={() => setConfirmSold(false)}
        onConfirm={markSold}
        title="Mark this listing as sold?"
        description="Buyers will no longer be able to message or offer on it. This cannot be undone."
        confirmLabel="Yes, mark sold"
        destructive
      />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={removeListing}
        title="Remove this listing?"
        description="The listing will be hidden from the marketplace. Active conversations remain visible."
        confirmLabel="Remove listing"
        destructive
      />
      {actionBusy ? <span className="sr-only">Updating listing</span> : null}
    </div>
  );
}
