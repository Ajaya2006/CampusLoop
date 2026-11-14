import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarClock, Check, CheckCircle2, MessageCircle, ReceiptText, Star, X } from 'lucide-react';
import { reviewService, transactionService } from '../services';
import { apiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import PageHeader from '../components/layout/PageHeader';
import ProductImage from '../components/common/ProductImage';
import Badge, { StatusBadge } from '../components/common/Badge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { Textarea } from '../components/common/Form';
import { EmptyState, ErrorState, ListSkeleton } from '../components/common/Feedback';
import { TRANSACTION_STATUS } from '../constants';
import { formatDateTime, inr, timeAgo } from '../utils/format';

const steps = [
  { key: 'pending', label: 'Started' },
  { key: 'meeting_scheduled', label: 'Meeting set' },
  { key: 'completion_requested', label: 'Confirming' },
  { key: 'completed', label: 'Completed' },
];

function Progress({ status }) {
  if (status === 'cancelled') {
    return <p className="text-xs text-danger">This transaction was cancelled.</p>;
  }
  const index = Math.max(0, steps.findIndex((step) => step.key === status));
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((step, position) => (
        <div key={step.key} className="flex items-center gap-1.5">
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
              position <= index ? 'bg-brand-500 text-white' : 'bg-elevated text-muted'
            }`}
          >
            {position <= index ? <Check size={11} /> : position + 1}
          </span>
          <span className={`text-[11px] ${position <= index ? 'font-medium text-ink' : 'text-muted'}`}>{step.label}</span>
          {position < steps.length - 1 ? (
            <span className={`h-px w-4 ${position < index ? 'bg-brand-400' : 'bg-line'}`} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function Transactions() {
  useDocumentTitle('Transactions');
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setTransactions(await transactionService.list());
    } catch (err) {
      setError(apiError(err, 'Could not load transactions.').message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirm = async (transaction) => {
    setBusy(transaction.id);
    try {
      const updated = await transactionService.confirm(transaction.id);
      toast.success(
        updated.status === 'completed' ? 'Transaction completed' : 'Completion confirmed',
        updated.status === 'completed' ? 'The listing is now marked sold.' : 'Waiting for the other party to confirm.',
      );
      await load();
    } catch (err) {
      toast.error('Could not confirm', apiError(err).message);
    } finally {
      setBusy('');
    }
  };

  const cancel = async () => {
    setBusy(cancelTarget.id);
    try {
      await transactionService.cancel(cancelTarget.id, cancelReason || undefined);
      toast.success('Transaction cancelled', 'The listing is available again.');
      setCancelTarget(null);
      setCancelReason('');
      await load();
    } catch (err) {
      toast.error('Could not cancel', apiError(err).message);
    } finally {
      setBusy('');
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    setBusy(reviewTarget.id);
    try {
      await reviewService.create({
        transaction_id: reviewTarget.id,
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment.trim() || undefined,
      });
      toast.success('Review submitted', 'Thanks for helping the community trust each other.');
      setReviewTarget(null);
      setReviewForm({ rating: 5, comment: '' });
      await load();
    } catch (err) {
      toast.error('Review not submitted', apiError(err).message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="A record of every agreed deal. Both sides confirm completion before the listing is marked sold."
        actions={
          <Link to="/messages">
            <Button variant="secondary" icon={MessageCircle}>Open messages</Button>
          </Link>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <ListSkeleton rows={3} />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No transactions yet"
          description="When you accept an offer, the buyer can start a transaction and reserve the item."
          action={<Link to="/marketplace"><Button variant="secondary">Browse marketplace</Button></Link>}
        />
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => {
            const myConfirmed =
              transaction.role === 'buyer' ? transaction.buyer_confirmed_at : transaction.seller_confirmed_at;
            const otherConfirmed =
              transaction.role === 'buyer' ? transaction.seller_confirmed_at : transaction.buyer_confirmed_at;
            const open = !['completed', 'cancelled'].includes(transaction.status);
            return (
              <article key={transaction.id} className="surface-card p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <ProductImage
                    src={transaction.product_image}
                    alt={transaction.product_title}
                    className="h-32 w-full rounded-control sm:h-20 sm:w-20"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/product/${transaction.product_id}`} className="text-sm font-semibold text-ink hover:text-brand-600">
                        {transaction.product_title}
                      </Link>
                      <StatusBadge map={TRANSACTION_STATUS} value={transaction.status} />
                      <Badge tone="neutral" size="xs">{transaction.role === 'buyer' ? 'You are buying' : 'You are selling'}</Badge>
                    </div>
                    <p className="mt-1 font-display text-lg font-bold text-ink">{inr(transaction.agreed_price)}</p>
                    <p className="text-xs text-muted">
                      {transaction.role === 'buyer' ? `Seller: ${transaction.seller_name}` : `Buyer: ${transaction.buyer_name}`}
                      {' · '}Started {timeAgo(transaction.created_at)}
                    </p>
                    <div className="mt-3"><Progress status={transaction.status} /></div>

                    {transaction.meeting ? (
                      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        <CalendarClock size={12} />
                        {formatDateTime(transaction.meeting.scheduled_at)} · {transaction.meeting.location}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-muted">No meeting scheduled yet — propose one in your conversation.</p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${myConfirmed ? 'bg-success/10 text-success' : 'bg-elevated text-muted'}`}>
                        <CheckCircle2 size={11} /> You {myConfirmed ? 'confirmed' : 'not confirmed'}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${otherConfirmed ? 'bg-success/10 text-success' : 'bg-elevated text-muted'}`}>
                        <CheckCircle2 size={11} /> {transaction.counterpart_name} {otherConfirmed ? 'confirmed' : 'not confirmed'}
                      </span>
                      {transaction.completed_at ? <span className="text-muted">Completed {formatDateTime(transaction.completed_at)}</span> : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-start gap-1.5 sm:flex-col sm:items-end">
                    {open ? (
                      <>
                        <Button
                          size="xs"
                          variant={myConfirmed ? 'secondary' : 'success'}
                          icon={Check}
                          disabled={Boolean(myConfirmed)}
                          loading={busy === transaction.id}
                          onClick={() => confirm(transaction)}
                        >
                          {myConfirmed ? 'Confirmed' : 'Confirm completion'}
                        </Button>
                        <Button size="xs" variant="ghost" className="text-danger" icon={X} onClick={() => setCancelTarget(transaction)}>
                          Cancel deal
                        </Button>
                      </>
                    ) : null}
                    {transaction.can_review ? (
                      <Button size="xs" variant="outline" icon={Star} onClick={() => setReviewTarget(transaction)}>
                        Leave a review
                      </Button>
                    ) : null}
                    {transaction.has_reviewed ? (
                      <Badge tone="success" size="xs">Reviewed</Badge>
                    ) : null}
                    <Button size="xs" variant="ghost" onClick={() => navigate('/messages')}>
                      Open chat
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-5 rounded-control border border-line bg-surface p-4 text-xs text-muted">
        A listing is reserved when a transaction starts and becomes sold only after both participants confirm completion.
        If a deal falls through, cancelling restores the listing to the marketplace.
      </div>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={cancel}
        title="Cancel this transaction?"
        description="Both sides will be notified and the listing returns to the marketplace. Use this only when the deal will not go ahead."
        confirmLabel="Cancel transaction"
        destructive
      >
        <Textarea
          label="Reason (optional)"
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          rows={2}
          placeholder="Could not agree on a meeting time."
        />
      </ConfirmDialog>

      <Modal
        open={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        title="Review this deal"
        description={reviewTarget ? `How was your experience with ${reviewTarget.counterpart_name}?` : ''}
        size="sm"
      >
        <form onSubmit={submitReview} className="space-y-4">
          <div>
            <p className="label-base">Rating</p>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setReviewForm({ ...reviewForm, rating })}
                  aria-label={`${rating} star${rating > 1 ? 's' : ''}`}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-control border transition ${
                    rating <= reviewForm.rating
                      ? 'border-warning bg-warning/10 text-warning'
                      : 'border-line text-muted hover:border-warning/40'
                  }`}
                >
                  <Star size={18} className={rating <= reviewForm.rating ? 'fill-warning' : ''} />
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">
              {['Very poor', 'Poor', 'Average', 'Good', 'Excellent'][reviewForm.rating - 1]}
            </p>
          </div>
          <Textarea
            label="Comment (optional)"
            value={reviewForm.comment}
            onChange={(event) => setReviewForm({ ...reviewForm, comment: event.target.value })}
            rows={3}
            maxLength={2000}
            placeholder="Item was as described and the handover was smooth."
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setReviewTarget(null)}>Cancel</Button>
            <Button type="submit" loading={busy === reviewTarget?.id} icon={Star}>Submit review</Button>
          </div>
        </form>
      </Modal>
      <span className="sr-only">{user?.id}</span>
    </div>
  );
}
