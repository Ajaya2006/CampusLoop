import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  HandCoins,
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
import { ProductCardSkeleton, ErrorState, EmptyState } from '../components/common/Feedback';
import Button, { buttonStyles } from '../components/common/Button';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useAuth } from '../context/AuthContext';

const steps = [
  { icon: ShieldCheck, title: 'Verify your student status', text: 'Submit your college details for moderator review.' },
  { icon: Tag, title: 'List or discover items', text: 'Post what you no longer need, browse what you do.' },
  { icon: MessagesSquare, title: 'Chat and negotiate', text: 'Ask questions, make offers and agree on a price.' },
  { icon: CalendarCheck, title: 'Meet and complete', text: 'Schedule a campus handover and confirm the deal.' },
];

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
        setCategories(cats);
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

  const submitSearch = (event) => {
    event.preventDefault();
    navigate(query.trim() ? `/marketplace?q=${encodeURIComponent(query.trim())}` : '/marketplace');
  };

  return (
    <div className="space-y-14 sm:space-y-20">
      <section className="relative overflow-hidden rounded-[22px] border border-line bg-surface">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-100 blur-3xl dark:bg-brand-900/40"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
          aria-hidden
        />
        <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:p-14">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-200">
              <Sparkles size={13} /> Verified students · 8 categories · Zero commission
            </p>
            <h1 className="mt-5 font-display text-[34px] font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              The campus marketplace
              <br />
              that actually <span className="text-brand-500">loops back</span>.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
              Buy and sell laptops, books, hostel furniture and gadgets with students from your own college.
              Verified accounts, moderated listings, and a clear handover process.
            </p>

            <form onSubmit={submitSearch} className="mt-7 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search laptops, textbooks, chairs…"
                  aria-label="Search the marketplace"
                  className="input-base h-12 pl-10"
                />
              </div>
              <Button type="submit" size="lg" className="h-12">
                Search
              </Button>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="font-medium text-ink">Popular:</span>
              {['Laptop', 'Books', 'Cycle', 'Study table'].map((term) => (
                <Link
                  key={term}
                  to={`/marketplace?q=${term}`}
                  className="rounded-full border border-line bg-canvas px-2.5 py-1 transition hover:border-brand-300 hover:text-brand-600"
                >
                  {term}
                </Link>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute right-6 top-2 w-64 rotate-3 rounded-card border border-line bg-canvas p-4 shadow-card">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
                  <BadgeCheck size={16} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-ink">Verified seller</p>
                  <p className="text-[11px] text-muted">IIT · 3rd year</p>
                </div>
              </div>
              <img
                src="/images/products/dell-inspiron-15-laptop.jpg"
                alt=""
                className="mt-3 h-24 w-full rounded-lg object-cover"
              />
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs font-medium text-ink">Dell Inspiron 15</p>
                <p className="font-display text-sm font-bold text-ink">₹28,500</p>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 w-64 -rotate-2 rounded-card border border-line bg-surface p-4 shadow-lift">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                  <HandCoins size={16} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-ink">Offer accepted</p>
                  <p className="text-[11px] text-muted">₹1,800 · Engineering Mathematics</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-2 w-full rounded-full bg-elevated">
                  <div className="h-2 w-3/4 rounded-full bg-brand-400" />
                </div>
                <p className="text-[11px] text-muted">Meeting confirmed · Library gate · 4:30 PM</p>
              </div>
            </div>

            <div className="absolute left-8 top-24 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-medium text-ink shadow-sm">
              <TrendingUp size={13} className="text-success" /> {totalListings || 8} live listings
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">Browse by category</h2>
            <p className="mt-1 text-sm text-muted">Everything a student needs, from first year to final semester.</p>
          </div>
          <Link to="/categories" className="hidden items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 sm:inline-flex">
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
          <Link to="/marketplace" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
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
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[22px] border border-line bg-surface p-6 sm:p-10">
        <div className="max-w-2xl">
          <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">How CampusLoop works</h2>
          <p className="mt-1 text-sm text-muted">A simple, safe loop from listing to handover.</p>
        </div>
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="relative rounded-card border border-line bg-canvas p-5">
              <span className="absolute right-4 top-4 font-display text-2xl font-extrabold text-brand-100 dark:text-brand-900">
                0{index + 1}
              </span>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                <step.icon size={19} />
              </span>
              <h3 className="mt-3.5 text-sm font-semibold text-ink">{step.title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative overflow-hidden rounded-[22px] bg-brand-500 p-7 text-white sm:p-10">
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" aria-hidden />
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Got something gathering dust?</h2>
          <p className="mt-2 max-w-md text-sm text-white/85">
            Turn your old laptop, cycle or textbooks into cash for the next semester. Listing takes about two minutes
            and our price guide helps you pick a fair number.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to={isAuthenticated ? '/sell' : '/register'} className="inline-flex h-11 items-center gap-2 rounded-control bg-white px-5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50">
              <Plus size={16} /> Sell an item
            </Link>
            <Link to="/marketplace" className="inline-flex h-11 items-center gap-2 rounded-control border border-white/30 px-5 text-sm font-semibold text-white transition hover:bg-white/10">
              Explore listings
            </Link>
          </div>
        </div>
        <div className="rounded-[22px] border border-line bg-surface p-7 sm:p-8">
          <ShieldCheck className="text-success" size={24} />
          <h2 className="mt-3 font-display text-lg font-bold text-ink">Built for trust</h2>
          <ul className="mt-3 space-y-2.5 text-[13px] text-muted">
            <li>· Student ID verification reviewed by moderators</li>
            <li>· Every new listing is checked before going live</li>
            <li>· Reports on listings and users are tracked to resolution</li>
            <li>· No online payments — you pay in person after inspection</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
