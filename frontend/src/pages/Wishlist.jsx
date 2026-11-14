import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Search } from 'lucide-react';
import { wishlistService } from '../services';
import { apiError } from '../services/api';
import { useToast } from '../context/ToastContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import PageHeader from '../components/layout/PageHeader';
import ProductCard from '../components/marketplace/ProductCard';
import Pagination from '../components/common/Pagination';
import { EmptyState, ErrorState, ProductCardSkeleton } from '../components/common/Feedback';
import { buttonStyles } from '../components/common/Button';

export default function Wishlist() {
  useDocumentTitle('Wishlist');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await wishlistService.list({ page, page_size: 12 }));
    } catch (err) {
      setError(apiError(err, 'Could not load your wishlist.').message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (product) => {
    setBusyId(product.id);
    try {
      await wishlistService.remove(product.id);
      setResult((current) => ({
        ...current,
        items: current.items.filter((item) => item.product.id !== product.id),
        total: Math.max(0, current.total - 1),
      }));
      toast.success('Removed from wishlist');
    } catch (err) {
      toast.error('Could not remove item', apiError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Wishlist"
        description="Items you saved to check back on. We do not reserve items, so message the seller early."
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      ) : !result?.items?.length ? (
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Tap the heart on any listing to keep it here for later."
          action={
            <Link to="/marketplace" className={buttonStyles({})}>
              <Search size={16} /> Browse marketplace
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {result.items.map((item) => (
              <ProductCard
                key={item.id}
                product={{ ...item.product, is_wishlisted: true }}
                onToggleWishlist={() => remove(item.product)}
                wishlistBusy={busyId === item.product.id}
              />
            ))}
          </div>
          <Pagination page={result.page} pages={result.pages} onChange={setPage} className="mt-8" />
        </>
      )}
    </div>
  );
}
