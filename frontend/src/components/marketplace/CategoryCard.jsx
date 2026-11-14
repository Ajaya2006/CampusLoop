import { Link } from 'react-router-dom';
import { categoryImage } from '../../utils/categoryImages';

export default function CategoryCard({ category, href }) {
  return (
    <Link
      to={href || `/marketplace?category=${category.slug}`}
      className="category-card group flex items-center gap-3.5 rounded-card border border-line bg-surface p-3 transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift dark:hover:border-brand-800"
    >
      <span className="relative block h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-elevated">
        <img
          src={categoryImage(category.slug, category.name)}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink">{category.name}</span>
        <span className="mt-0.5 block text-xs text-muted">
          {typeof category.product_count === 'number'
            ? `${category.product_count} listing${category.product_count === 1 ? '' : 's'}`
            : 'Browse items'}
        </span>
      </span>
    </Link>
  );
}
