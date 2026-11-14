import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LayoutGrid } from 'lucide-react';
import { categoryService, productService } from '../services';
import { apiError } from '../services/api';
import CategoryCard from '../components/marketplace/CategoryCard';
import ProductCard from '../components/marketplace/ProductCard';
import { EmptyState, ErrorState, ProductCardSkeleton } from '../components/common/Feedback';
import useDocumentTitle from '../hooks/useDocumentTitle';

function CategorySkeleton() {
  return <div className="skeleton h-[88px] rounded-card" />;
}

export default function Categories() {
  useDocumentTitle('Categories');
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [cats, page] = await Promise.all([
          categoryService.list(),
          productService.list({ sort: 'popular', page_size: 4 }),
        ]);
        if (!active) return;
        setCategories(cats);
        setFeatured(page.items || []);
      } catch (err) {
        if (active) setError(apiError(err, 'Could not load categories.').message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-12">
      <header className="rounded-[22px] border border-line bg-surface p-6 sm:p-10">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
          <LayoutGrid size={13} /> Browse the catalogue
        </p>
        <h1 className="mt-4 font-display text-3xl font-extrabold text-ink sm:text-4xl">Every campus essential, sorted.</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          From first-year textbooks to final-year furniture, pick a category and see what students near you are
          selling right now. All listings are approved by a moderator before they appear.
        </p>
      </header>

      <section>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <CategorySkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </section>

      {!loading
        ? categories
            .filter((category) => (category.children || []).length)
            .map((category) => (
              <section key={category.id}>
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-ink">{category.name}</h2>
                    <p className="mt-0.5 text-sm text-muted">{category.description || 'Popular subcategories'}</p>
                  </div>
                  <Link
                    to={`/marketplace?category=${category.slug}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Browse <ArrowRight size={14} />
                  </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {category.children.map((child) => (
                    <CategoryCard key={child.id} category={child} />
                  ))}
                </div>
              </section>
            ))
        : null}

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Trending on campus</h2>
            <p className="mt-0.5 text-sm text-muted">Most-viewed listings across every category.</p>
          </div>
          <Link to="/marketplace?sort=popular" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
            See more <ArrowRight size={14} />
          </Link>
        </div>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : featured.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState title="Nothing trending yet" description="Once students start listing items, the most popular ones show up here." />
        )}
      </section>
    </div>
  );
}
