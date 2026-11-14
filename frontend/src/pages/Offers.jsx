import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, HandCoins, MessageCircle, X } from 'lucide-react';
import { offerService, transactionService } from '../services';
import { apiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import PageHeader from '../components/layout/PageHeader';
import Tabs from '../components/common/Tabs';
import ProductImage from '../components/common/ProductImage';
import Badge, { StatusBadge } from '../components/common/Badge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { Input, Textarea } from '../components/common/Form';
import { EmptyState, ErrorState, ListSkeleton } from '../components/common/Feedback';
import { OFFER_STATUS } from '../constants';
import { inr, timeAgo } from '../utils/format';

export default function Offers() {
  useDocumentTitle('Offers');
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [direction, setDirection] = useState('all');
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [counter, setCounter] = useState(null);
  const [counterForm, setCounterForm] = useState({ amount: '', message: '' });
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOffers(await offerService.list(direction));
    } catch (err) {
      setError(apiError(err, 'Could not load offers.').message);
    } finally {
      setLoading(false);
    }
  }, [direction]);

  useEffect(() => {
    load();
  }, [load]);

  const respond = async (offer, action, amount, message) => {
    setBusy(offer.id + action);
    try {
      await offerService.respond(offer.id, { action, amount, message });
      const labels = {
        accept: 'Offer accepted — the buyer can start the transaction.',
        reject: 'Offer declined.',
        cancel: 'Offer withdrawn.',
        counter: 'Counteroffer sent.',
      };
      toast.success(labels[action] || 'Offer updated');
      setCounter(null);
      await load();
    } catch (err) {
      toast.error('Could not update offer', apiError(err).message);
    } finally {
      setBusy('');
    }
  };

  const submitCounter = (event) => {
    event.preventDefault();
    if (!counterForm.amount) return;
    respond(counter, 'counter', Number(counterForm.amount), counterForm.message || undefined);
  };

  const tabs = [
    { value: 'all', label: 'All' },
    { value: 'received', label: 'Received' },
    { value: 'sent', label: 'Sent' },
  ];

  return (
    <div>
      <PageHeader
        title="Offers"
        description="Every offer and counteroffer is stored, so both sides always know where the negotiation stands."
        actions={
          <Link to="/messages">
            <Button variant="secondary" icon={MessageCircle}>Open messages</Button>
          </Link>
        }
      />

      <Tabs items={tabs} value={direction} onChange={setDirection} className="mb-4 w-full sm:w-fit" />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <ListSkeleton rows={4} />
      ) : offers.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="No offers here"
          description="Offers start from a product page or from inside a conversation. Only verified students can negotiate."
          action={<Link to="/marketplace"><Button variant="secondary">Browse listings</Button></Link>}
        />
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => {
            const mine = offer.offered_by_id === user?.id;
            const isBuyer = offer.buyer_id === user?.id;
            return (
              <article key={offer.id} className="surface-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <ProductImage
                    src={offer.product_image}
                    alt={offer.product_title}
                    className="h-28 w-full rounded-control sm:h-16 sm:w-16"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/product/${offer.product_id}`} className="truncate text-sm font-semibold text-ink hover:text-brand-600">
                        {offer.product_title}
                      </Link>
                      <StatusBadge map={OFFER_STATUS} value={offer.is_expired ? 'expired' : offer.status} />
                      <Badge tone={mine ? 'brand' : 'neutral'} size="xs">
                        {mine ? 'You offered' : isBuyer ? 'Buyer offer' : 'Offer to you'}
                      </Badge>
                    </div>
                    <p className="mt-1 font-display text-xl font-bold text-ink">{inr(offer.amount)}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {mine ? 'From you' : `From ${offer.buyer_name}`} to {offer.seller_name} · {timeAgo(offer.created_at)}
                    </p>
                    {offer.message ? (
                      <p className="mt-1.5 rounded-control bg-canvas px-2.5 py-1.5 text-[12.5px] text-muted">“{offer.message}”</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                    <Button
                      size="xs"
                      variant="ghost"
                      icon={ArrowLeftRight}
                      onClick={() => navigate(`/messages/${offer.conversation_id}`)}
                    >
                      Chat
                    </Button>
                    {offer.can_respond ? (
                      <>
                        <Button
                          size="xs"
                          variant="success"
                          loading={busy === offer.id + 'accept'}
                          onClick={() => respond(offer, 'accept')}
                        >
                          Accept
                        </Button>
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => {
                            setCounter(offer);
                            setCounterForm({ amount: String(Math.round(offer.amount * 1.05)), message: '' });
                          }}
                        >
                          Counter
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          icon={X}
                          className="text-danger"
                          loading={busy === offer.id + 'reject'}
                          onClick={() => respond(offer, 'reject')}
                        >
                          Decline
                        </Button>
                      </>
                    ) : null}
                    {offer.status === 'pending' && mine ? (
                      <Button
                        size="xs"
                        variant="ghost"
                        className="text-danger"
                        loading={busy === offer.id + 'cancel'}
                        onClick={() => respond(offer, 'cancel')}
                      >
                        Withdraw
                      </Button>
                    ) : null}
                  </div>
                </div>
                {offer.status === 'accepted' && isBuyer ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-control border border-success/25 bg-success/5 px-3 py-2 text-[12px] text-success">
                    <span>Accepted at {inr(offer.amount)}. Start the transaction to reserve the item and schedule handover.</span>
                    <Button
                      size="xs"
                      variant="success"
                      loading={busy === offer.id + 'transaction'}
                      onClick={async () => {
                        setBusy(offer.id + 'transaction');
                        try {
                          await transactionService.create({ offer_id: offer.id });
                          toast.success('Transaction started');
                          navigate('/transactions');
                        } catch (err) {
                          toast.error('Could not start the transaction', apiError(err).message);
                        } finally {
                          setBusy('');
                        }
                      }}
                    >
                      Start transaction
                    </Button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(counter)}
        onClose={() => setCounter(null)}
        title="Send a counteroffer"
        description={counter ? `Responding to ${inr(counter.amount)} from ${counter.buyer_name}.` : ''}
        size="sm"
      >
        <form onSubmit={submitCounter} className="space-y-4">
          <Input
            label="Your counter amount (₹)"
            type="number"
            min="1"
            value={counterForm.amount}
            onChange={(event) => setCounterForm({ ...counterForm, amount: event.target.value })}
            required
          />
          <Textarea
            label="Message (optional)"
            value={counterForm.message}
            onChange={(event) => setCounterForm({ ...counterForm, message: event.target.value })}
            rows={2}
            placeholder="I can do this price if you pick up today."
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setCounter(null)}>Cancel</Button>
            <Button type="submit" loading={busy.endsWith('counter')} icon={HandCoins}>Send counteroffer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
