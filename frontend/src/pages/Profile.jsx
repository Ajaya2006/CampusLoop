import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareQuote, ShieldCheck, Tag } from 'lucide-react';
import { userService } from '../services';
import { apiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProductCard from '../components/marketplace/ProductCard';
import RatingStars from '../components/common/RatingStars';
import { EmptyState, ErrorState, LoadingPage, ProductCardSkeleton } from '../components/common/Feedback';
import { buttonStyles } from '../components/common/Button';
import { timeAgo } from '../utils/format';

export default function Profile() {
  useDocumentTitle('My profile');
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return undefined;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [profileData, listingPage, reviewPage] = await Promise.all([
          userService.profile(user.id),
          userService.listings(user.id, { page_size: 4 }),
          userService.reviews(user.id, { page_size: 5 }),
        ]);
        if (!active) return;
        setProfile(profileData);
        setListings(listingPage.items || []);
        setReviews(reviewPage.items || []);
      } catch (err) {
        if (active) setError(apiError(err, 'Could not load your profile.').message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  if (loading) return <LoadingPage label="Loading your profile…" />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!profile) return null;

  return (
    <div className="space-y-6">
      <ProfileHeader
        profile={profile}
        isSelf
        actions={
          <Link to="/verify" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
            <ShieldCheck size={14} /> Verification
          </Link>
        }
      />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">My listings</h2>
          <Link to="/my-listings" className="text-xs font-semibold text-brand-600">Manage all</Link>
        </div>
        {listings.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {listings.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Tag}
            title="No live listings"
            description="Listings appear on your public profile once a moderator approves them."
            action={<Link to="/sell" className={buttonStyles({ size: 'sm' })}>Create a listing</Link>}
          />
        )}
      </section>

      <section className="surface-card p-5">
        <h2 className="text-base font-semibold text-ink">Reviews from buyers</h2>
        {reviews.length ? (
          <ul className="mt-3 divide-y divide-line">
            {reviews.map((review) => (
              <li key={review.id} className="py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-ink">{review.reviewer_name}</p>
                  <span className="text-xs text-muted">{timeAgo(review.created_at)}</span>
                </div>
                <RatingStars value={review.rating} showValue className="mt-1" />
                {review.comment ? <p className="mt-2 text-sm text-muted">{review.comment}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted">
            <MessageSquareQuote size={16} /> No reviews yet — complete a transaction to receive your first one.
          </div>
        )}
      </section>
    </div>
  );
}
