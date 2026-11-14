import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Flag, MessageSquareQuote, Tag } from 'lucide-react';
import { reportService, userService } from '../services';
import { apiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProductCard from '../components/marketplace/ProductCard';
import RatingStars from '../components/common/RatingStars';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import { Select, Textarea } from '../components/common/Form';
import { EmptyState, ErrorState, LoadingPage } from '../components/common/Feedback';
import { REPORT_REASONS } from '../constants';
import { buttonStyles } from '../components/common/Button';
import { timeAgo } from '../utils/format';

export default function SellerProfile() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0].value);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  useDocumentTitle(profile?.full_name || 'Student profile');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [profileData, listingPage, reviewPage] = await Promise.all([
          userService.profile(id),
          userService.listings(id, { page_size: 8 }),
          userService.reviews(id, { page_size: 8 }),
        ]);
        if (!active) return;
        setProfile(profileData);
        setListings(listingPage.items || []);
        setReviews(reviewPage.items || []);
      } catch (err) {
        if (active) setError(apiError(err, 'Could not load this profile.').message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const submitReport = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await reportService.create({ target_type: 'user', target_id: id, reason, details: details.trim() || undefined });
      setReportOpen(false);
      setDetails('');
      toast.success('Report submitted', 'A moderator will review this account.');
    } catch (err) {
      toast.error('Report failed', apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingPage label="Loading student profile…" />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!profile) return null;

  const isSelf = user?.id === profile.id;

  return (
    <div className="space-y-6">
      <ProfileHeader
        profile={profile}
        isSelf={isSelf}
        actions={
          !isSelf && isAuthenticated ? (
            <Button variant="secondary" size="sm" icon={Flag} onClick={() => setReportOpen(true)}>
              Report user
            </Button>
          ) : null
        }
      />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Listings from {profile.full_name.split(' ')[0]}</h2>
          <Link to={`/marketplace?q=${encodeURIComponent(profile.college)}`} className="text-xs font-semibold text-brand-600">
            Similar campus items
          </Link>
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
            title="No active listings"
            description="This student has no approved listings right now."
            action={<Link to="/marketplace" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>Browse marketplace</Link>}
          />
        )}
      </section>

      <section className="surface-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Reviews</h2>
          <RatingStars value={profile.rating_average} showValue count={profile.review_count} />
        </div>
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
          <p className="mt-4 flex items-center gap-2 text-sm text-muted">
            <MessageSquareQuote size={16} /> No reviews yet.
          </p>
        )}
      </section>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title={`Report ${profile.full_name}`} description="Tell a moderator what happened. Reports are confidential." size="sm">
        <form onSubmit={submitReport} className="space-y-4">
          <Select label="Reason" value={reason} onChange={(event) => setReason(event.target.value)}>
            {REPORT_REASONS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </Select>
          <Textarea label="Details (optional)" value={details} onChange={(event) => setDetails(event.target.value)} rows={3} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button type="submit" variant="danger" loading={busy}>Submit report</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
