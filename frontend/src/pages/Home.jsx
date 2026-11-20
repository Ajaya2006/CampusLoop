import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  HandCoins,
  MapPin,
  MessagesSquare,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  TrendingUp,
} from 'lucide-react';
import { categoryService, productService } from '../services';
import { apiError } from '../services/api';
import ProductCard from '../components/marketplace/ProductCard';
import CategoryCard from '../components/marketplace/CategoryCard';
import ProductImage from '../components/common/ProductImage';
import GlassBackdrop from '../components/glass/GlassBackdrop';
import { ProductCardSkeleton, ErrorState, EmptyState } from '../components/common/Feedback';
import { buttonStyles } from '../components/common/Button';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useAuth } from '../context/AuthContext';
import { inr } from '../utils/format';
import { categoryImage } from '../utils/categoryImages';
import '../styles/home.css';

const steps = [
  { icon: ShieldCheck, title: 'Verify your student status', text: 'Submit your college details for moderator review.' },
  { icon: Tag, title: 'List or discover items', text: 'Post what you no longer need, browse what you do.' },
  { icon: MessagesSquare, title: 'Chat and negotiate', text: 'Ask questions, make offers and agree on a price.' },
  { icon: CalendarCheck, title: 'Meet and complete', text: 'Schedule a campus handover and confirm the deal.' },
];

const popularSearches = ['Laptop', 'Books', 'Cycle', 'Study table'];

const demoFeature = {
  id: 'demo-feature',
  title: 'Dell Inspiron 15 · 8GB / 512GB',
  price: 28500,
  location: 'Central library gate',
  cover_image: '/images/products/dell-inspiron-15-laptop.jpg',
};

export default function Home() {
  useDocumentTitle('Student marketplace');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [cats, page] = await Promise.all([
          categoryService.list(),
          productService.list({ sort: 'latest', page_size: 8 }),
        ]);
        if (!active) return;
        setCategories(Array.isArray(cats) ? cats : []);
        setProducts(page.items || []);
      } catch (err) {
        if (active) setError(apiError(err, 'Could not load the marketplace right now.').message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const totalListings = useMemo(
    () => categories.reduce((sum, category) => sum + (category.product_count || 0), 0),
    [categories],
  );

  const picks = useMemo(
    () => [...products].sort((a, b) => (a.price ?? 0) - (b.price ?? 0)).slice(0, 4),
    [products],
  );

  const fresh = useMemo(
    () => products.filter((product) => !picks.some((pick) => pick.id === product.id)),
    [products, picks],
  );

  const featured = products[0] || demoFeature;

  const submitSearch = (event) => {
    event.preventDefault();
    navigate(query.trim() ? `/marketplace?q=${encodeURIComponent(query.trim())}` : '/marketplace');
  };

  return (
    <div className="home-page">
      <section className="home-hero">
        <span className="home-hero__wash" aria-hidden />
        <span className="home-hero__grain" aria-hidden />

        <div className="home-hero__inner">
          <div className="home-hero__copy">
            <span className="home-badge">
              <GlassBackdrop blur={6} displace={0.35} backgroundOpacity={0.12} />
              <Sparkles size={13} />
              <span>Verified students · zero commission</span>
            </span>

            <h1 className="home-hero__title">
              Buy, sell and <em>loop it back</em>.
            </h1>
            <p className="home-hero__lede">
              The marketplace for your own campus. Laptops, textbooks, cycles and hostel furniture from
              verified students — no shipping, no strangers, no commission.
            </p>

            <form onSubmit={submitSearch} className="home-search" role="search">
              <GlassBackdrop blur={7} displace={0.45} backgroundOpacity={0.14} distortionScale={-190} />
              <div className="home-search__field">
                <Search size={17} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search laptops, textbooks, chairs…"
                  aria-label="Search the marketplace"
                  className="home-search__input"
                />
              </div>
              <button type="submit" className="home-search__btn">
                Search <ArrowRight size={15} />
              </button>
            </form>

            <div className="home-chips">
              <span className="mr-1">Popular</span>
              {popularSearches.map((term) => (
                <Link key={term} to={`/marketplace?q=${term}`} className="home-chip">
                  {term}
                </Link>
              ))}
            </div>
          </div>

          <div className="home-hero__art">
            <div className="loop-art">
              <span className="loop-art__ring loop-art__ring--outer" aria-hidden />
              <span className="loop-art__ring loop-art__ring--mid" aria-hidden />
              <span className="loop-art__arc" aria-hidden />

              <article className="loop-art__card">
                <GlassBackdrop blur={5} displace={0.3} backgroundOpacity={0.16} distortionScale={-160} />
                <div className="loop-art__shot">
                  <ProductImage
                    src={featured.cover_image}
                    alt=""
                    fallback={categoryImage(featured.category_slug, featured.category_name || 'Laptops')}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="loop-art__card-body pt-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-white">
                      {featured.title}
                    </p>
                    <p className="shrink-0 font-display text-[15px] font-bold text-white">{inr(featured.price)}</p>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-[10.5px] text-white/75">
                    <MapPin size={10} className="shrink-0" />
                    <span className="truncate">{featured.location || 'Campus handover'}</span>
                  </p>
                </div>
              </article>

              <span className="loop-art__tag loop-art__tag--top">
                <BadgeCheck size={12} className="text-emerald-300" /> Verified seller
              </span>
              <span className="loop-art__tag loop-art__tag--bottom">
                <TrendingUp size={12} className="text-brand-300" /> Picked up today
              </span>
            </div>
          </div>
        </div>

        <div className="home-hero__stats">
          <div>
            <p className="home-stat__value">{totalListings ? totalListings.toLocaleString('en-IN') : 8}</p>
            <p className="home-stat__label">Live listings</p>
          </div>
          <div>
            <p className="home-stat__value">{categories.length || 8}</p>
            <p className="home-stat__label">Categories</p>
          </div>
          <div>
            <p className="home-stat__value">₹0</p>
            <p className="home-stat__label">Commission</p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.15em] text-brand-600 dark:text-brand-300">
              Recommended for you
            </p>
            <h2 className="mt-1.5 font-display text-xl font-bold text-ink sm:text-2xl">Light as glass, priced by students</h2>
            <p className="mt-1 max-w-xl text-sm text-muted">
              The fairest listings live right now, with nothing hidden in the middle.
            </p>
          </div>
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Browse all <ArrowRight size={15} />
          </Link>
        </div>

        <div className="home-spotlight">
          <span className="home-spotlight__glow home-spotlight__glow--warm" aria-hidden />
          <span className="home-spotlight__glow home-spotlight__glow--cool" aria-hidden />

          <div className="home-spotlight__panel">
            <GlassBackdrop radius={26} blur={9} backgroundOpacity={0.16} />
            <div className="home-spotlight__body">
              <p className="home-spotlight__eyebrow">Why students loop</p>
              <h3 className="home-spotlight__title">Nothing on campus deserves to sit in a cupboard.</h3>
              <p className="home-spotlight__text">
                Every listing is priced by a student, checked by a moderator and handed over between classes. No
                couriers, no packaging, no commission.
              </p>
              <Link to="/marketplace" className="home-spotlight__cta">
                Browse the picks <ArrowRight size={14} />
              </Link>
              <ul className="home-spotlight__facts">
                <li>₹0 commission</li>
                <li>Verified students</li>
                <li>Meet in person</li>
              </ul>
            </div>
          </div>

          <div className="home-spotlight__picks">
            <p className="home-spotlight__picks-label">Cheapest right now</p>
            {picks.length ? (
              <ul>
                {picks.map((product) => (
                  <li key={product.id}>
                    <Link to={`/product/${product.id}`} className="home-spotlight__pick">
                      <span className="home-spotlight__pick-title">{product.title}</span>
                      <span className="home-spotlight__pick-price">{inr(product.price)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="home-spotlight__empty">Cheapest listings appear here as they go live.</p>
            )}
            <Link to="/marketplace" className="home-spotlight__see-all">
              See all listings <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">Browse by category</h2>
            <p className="mt-1 text-sm text-muted">Everything a student needs, from first year to final semester.</p>
          </div>
          <Link
            to="/categories"
            className="hidden items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 sm:inline-flex"
          >
            All categories <ArrowRight size={15} />
          </Link>
        </div>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="skeleton h-[88px] rounded-card" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">Fresh on campus</h2>
            <p className="mt-1 text-sm text-muted">The newest approved listings from verified students.</p>
          </div>
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            View all <ArrowRight size={15} />
          </Link>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        ) : loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No listings yet"
            description="Approved listings will appear here. Be the first to post something your campus needs."
            action={
              <Link to={isAuthenticated ? '/sell' : '/register'} className={buttonStyles({})}>
                <Plus size={16} /> Post a listing
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(fresh.length ? fresh : products).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="home-steps">
        <div className="max-w-2xl">
          <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">How CampusLoop works</h2>
          <p className="mt-1 text-sm text-muted">Four steps, one loop, no online payments.</p>
        </div>
        <div className="home-steps__grid">
          {steps.map((step, index) => (
            <article key={step.title} className="home-step">
              <span className="home-step__num">0{index + 1}</span>
              <span className="home-step__icon">
                <step.icon size={18} />
              </span>
              <h3 className="home-step__title">{step.title}</h3>
              <p className="home-step__text">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative overflow-hidden rounded-[28px] bg-brand-500 p-7 text-white sm:p-10">
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" aria-hidden />
          <div className="pointer-events-none absolute -bottom-16 left-1/2 h-40 w-40 rounded-full bg-brand-300/30 blur-2xl" aria-hidden />
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Got something gathering dust?</h2>
          <p className="mt-2 max-w-md text-sm text-white/85">
            Turn your old laptop, cycle or textbooks into cash for the next semester. Listing takes about two minutes
            and our price guide helps you pick a fair number.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              to={isAuthenticated ? '/sell' : '/register'}
              className="inline-flex h-11 items-center gap-2 rounded-control bg-white px-5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              <Plus size={16} /> Sell an item
            </Link>
            <Link
              to="/marketplace"
              className="inline-flex h-11 items-center gap-2 rounded-control border border-white/30 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Explore listings
            </Link>
          </div>
        </div>
        <div className="rounded-[28px] border border-line bg-surface p-7 sm:p-8">
          <ShieldCheck className="text-success" size={24} />
          <h2 className="mt-3 font-display text-lg font-bold text-ink">Built for trust</h2>
          <ul className="mt-3 space-y-2.5 text-[13px] text-muted">
            <li>· Student ID verification reviewed by moderators</li>
            <li>· Every new listing is checked before going live</li>
            <li>· Reports on listings and users are tracked to resolution</li>
            <li>· No online payments — you pay in person after inspection</li>
          </ul>
          <p className="mt-4 flex items-center gap-1.5 text-[12px] font-medium text-ink">
            <HandCoins size={14} className="text-brand-500" /> Fair prices, agreed face to face
          </p>
        </div>
      </section>
    </div>
  );
}
