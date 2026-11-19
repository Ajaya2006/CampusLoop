import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  HandCoins,
  Inbox,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  ShoppingBag,
  Tag,
  X,
} from 'lucide-react';
import { chatService, meetingService, offerService, transactionService } from '../services';
import { apiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useChatSocket from '../hooks/useChatSocket';
import useDocumentTitle from '../hooks/useDocumentTitle';
import Avatar from '../components/common/Avatar';
import Badge, { StatusBadge, VerifiedBadge } from '../components/common/Badge';
import Button from '../components/common/Button';
import ProductImage from '../components/common/ProductImage';
import Modal from '../components/common/Modal';
import { Input, Textarea } from '../components/common/Form';
import { ErrorState, LoadingPage } from '../components/common/Feedback';
import { MEETING_STATUS, OFFER_STATUS } from '../constants';
import { cx, formatDateTime, formatTime, inr, timeAgo } from '../utils/format';

function ConversationRow({ conversation, active, onClick, currentUserId }) {
  const buying = conversation.buyer?.id === currentUserId;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'relative flex w-full items-start gap-3 px-3.5 py-3.5 text-left transition',
        active ? 'bg-elevated' : 'hover:bg-elevated/55',
      )}
    >
      {active ? <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-brand-500" /> : null}
      <Avatar
        name={conversation.counterpart.full_name}
        src={conversation.counterpart.avatar_url}
        size="sm"
        className={cx('mt-0.5', conversation.unread_count && 'ring-2 ring-brand-200')}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className={cx('truncate text-[12.5px]', conversation.unread_count ? 'font-bold text-ink' : 'font-semibold text-ink')}>
            {conversation.counterpart.full_name}
          </span>
          <span className="shrink-0 pt-0.5 text-[9.5px] text-muted">
            {conversation.last_message_at ? timeAgo(conversation.last_message_at) : ''}
          </span>
        </span>
        <span className="mt-1 flex items-center gap-1.5">
          <span className={cx('truncate text-[11px]', conversation.unread_count ? 'font-semibold text-ink' : 'font-medium text-ink/80')}>
            {conversation.product.title}
          </span>
          <span className="shrink-0 rounded-[4px] bg-brand-50 px-1.5 py-0.5 text-[8.5px] font-semibold text-brand-700">
            {buying ? 'Buying' : 'Selling'}
          </span>
        </span>
        <span className="mt-1 flex items-center justify-between gap-2">
          <span className={cx('truncate text-[10.5px] leading-relaxed', conversation.unread_count ? 'text-ink/75' : 'text-muted')}>
            {conversation.last_message || 'Conversation started'}
          </span>
          {conversation.unread_count ? (
            <span className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-bold text-white">
              {conversation.unread_count}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

function FolderNav({ folder, setFolder, conversations, currentUserId }) {
  const folders = [
    { id: 'all', label: 'All messages', icon: Inbox, count: conversations.length },
    { id: 'unread', label: 'Unread', icon: Mail, count: conversations.filter((item) => item.unread_count > 0).length },
    { id: 'buying', label: 'Buying', icon: ShoppingBag, count: conversations.filter((item) => item.buyer?.id === currentUserId).length },
    { id: 'selling', label: 'Selling', icon: Tag, count: conversations.filter((item) => item.seller?.id === currentUserId).length },
  ];

  return (
    <aside className="surface-card hidden h-fit p-3 lg:block">
      <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Category</p>
      <div className="space-y-0.5">
        {folders.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFolder(item.id)}
            className={cx(
              'flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2.5 text-left text-[12px] font-medium transition',
              folder === item.id ? 'bg-brand-500 text-white' : 'text-ink/75 hover:bg-elevated hover:text-ink',
            )}
          >
            <item.icon size={15} strokeWidth={1.8} />
            <span className="flex-1">{item.label}</span>
            <span className={cx('text-[10px]', folder === item.id ? 'text-white/80' : 'text-muted')}>{item.count}</span>
          </button>
        ))}
      </div>

      <div className="my-4 border-t border-line" />
      <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Shortcuts</p>
      {[
        { to: '/offers', label: 'Offers', dot: 'bg-brand-500' },
        { to: '/meetings', label: 'Meetings', dot: 'bg-navy' },
        { to: '/transactions', label: 'Transactions', dot: 'bg-success' },
      ].map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[12px] font-medium text-ink/70 transition hover:bg-elevated hover:text-ink"
        >
          <span className={cx('h-2.5 w-2.5 rounded-[3px]', item.dot)} /> {item.label}
        </Link>
      ))}
    </aside>
  );
}

function DetailPlaceholder() {
  return (
    <section className="surface-card hidden min-h-[520px] flex-col items-center justify-center p-8 text-center lg:flex">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-500">
        <MessageCircle size={24} />
      </span>
      <h2 className="mt-4 font-display text-lg font-bold text-ink">Select a conversation</h2>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">
        Choose a buyer or seller from the list to read the conversation and reply.
      </p>
    </section>
  );
}

function InboxHeader({ count, onCompose }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-medium text-brand-600">Workspace / Inbox</p>
        <h1 className="mt-0.5 font-display text-[25px] font-extrabold tracking-tight text-ink sm:text-[28px]">Inbox</h1>
        <p className="mt-1 text-[12px] text-muted">Chat with buyers and sellers about campus listings.</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-[8px] border border-line bg-surface px-2.5 py-1.5 text-[10.5px] font-medium text-muted">
          {count} conversation{count === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          onClick={onCompose}
          className="inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-brand-500 px-3.5 text-[11.5px] font-semibold text-white transition hover:bg-brand-600"
        >
          <Plus size={14} /> New message
        </button>
      </div>
    </div>
  );
}

export default function Messages() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  useDocumentTitle(conversationId ? 'Conversation' : 'Messages');

  const [conversations, setConversations] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState('all');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerForm, setOfferForm] = useState({ amount: '', message: '' });
  const [counterTarget, setCounterTarget] = useState(null);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    scheduled_at: '',
    location: '',
    notes: '',
  });
  const [actionBusy, setActionBusy] = useState('');
  const [startingTransaction, setStartingTransaction] = useState(false);

  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const lastTypingSent = useRef(0);

  const loadList = useCallback(async () => {
    try {
      setConversations(await chatService.list());
      setListError('');
    } catch (err) {
      setListError(apiError(err, 'Could not load your conversations.').message);
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id, { silent = false } = {}) => {
    if (!silent) setDetailLoading(true);
    try {
      const data = await chatService.get(id);
      setDetail(data);
      setDetailError('');
      await chatService.markRead(id).catch(() => {});
      window.dispatchEvent(new Event('campusloop:refresh-counts'));
      return data;
    } catch (err) {
      setDetailError(apiError(err, 'Could not open this conversation.').message);
      return null;
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!conversationId) {
      setDetail(null);
      return;
    }
    loadDetail(conversationId);
  }, [conversationId, loadDetail]);

  const onSocketEvent = useCallback(
    (event) => {
      if (event.type === 'message' && event.message) {
        if (event.message.sender_id !== user?.id) {
          setTyping(false);
          clearTimeout(typingTimer.current);
        }
        setDetail((current) => {
          if (!current || current.id !== event.message.conversation_id) return current;
          if (current.messages.some((message) => message.id === event.message.id)) return current;
          return { ...current, messages: [...current.messages, event.message] };
        });
        if (event.message.sender_id !== user?.id) {
          chatService.markRead(conversationId).catch(() => {});
        }
        loadList();
      } else if (event.type === 'typing' && event.user_id !== user?.id) {
        setTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 2200);
      } else if (['offer', 'meeting', 'transaction'].includes(event.type)) {
        loadDetail(conversationId, { silent: true });
        loadList();
      }
    },
    [conversationId, loadDetail, loadList, user?.id],
  );

  const { status: socketStatus, send: socketSend } = useChatSocket(conversationId, {
    onEvent: onSocketEvent,
    enabled: Boolean(conversationId),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [detail?.messages?.length, typing]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (folder === 'unread' && !conversation.unread_count) return false;
      if (folder === 'buying' && conversation.buyer?.id !== user?.id) return false;
      if (folder === 'selling' && conversation.seller?.id !== user?.id) return false;
      if (!needle) return true;
      return (
        conversation.counterpart.full_name.toLowerCase().includes(needle) ||
        conversation.product.title.toLowerCase().includes(needle)
      );
    });
  }, [conversations, folder, search, user?.id]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft('');
    try {
      const message = await chatService.send(conversationId, body);
      setDetail((current) => {
        if (!current) return current;
        if (current.messages.some((item) => item.id === message.id)) return current;
        return { ...current, messages: [...current.messages, message] };
      });
      loadList();
    } catch (err) {
      setDraft(body);
      toast.error('Message not sent', apiError(err).message);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (value) => {
    setDraft(value);
    const now = Date.now();
    if (now - lastTypingSent.current > 1800 && socketSend({ type: 'typing' })) {
      lastTypingSent.current = now;
    }
  };

  const latestOffer = detail?.offers?.length ? detail.offers[detail.offers.length - 1] : null;
  const latestMeeting = detail?.meetings?.[0] || null;
  const acceptedOffer = [...(detail?.offers || [])].reverse().find((offer) => offer.status === 'accepted');

  const submitOffer = async (event) => {
    event.preventDefault();
    const amount = Number(offerForm.amount);
    if (!amount) return;
    setActionBusy('offer');
    try {
      if (counterTarget) {
        await offerService.respond(counterTarget.id, {
          action: 'counter',
          amount,
          message: offerForm.message || undefined,
        });
        toast.success('Counteroffer sent');
      } else {
        await offerService.create({
          conversation_id: conversationId,
          amount,
          message: offerForm.message || undefined,
        });
        toast.success('Offer sent');
      }
      setOfferOpen(false);
      setCounterTarget(null);
      setOfferForm({ amount: '', message: '' });
      await loadDetail(conversationId, { silent: true });
    } catch (err) {
      toast.error('Offer not sent', apiError(err).message);
    } finally {
      setActionBusy('');
    }
  };

  const respondOffer = async (offer, action) => {
    if (action === 'counter') {
      setCounterTarget(offer);
      setOfferForm({ amount: String(Math.round(offer.amount * 0.95)), message: '' });
      setOfferOpen(true);
      return;
    }
    setActionBusy(offer.id);
    try {
      await offerService.respond(offer.id, { action });
      toast.success(action === 'accept' ? 'Offer accepted' : action === 'reject' ? 'Offer declined' : 'Offer withdrawn');
      await loadDetail(conversationId, { silent: true });
    } catch (err) {
      toast.error('Could not update offer', apiError(err).message);
    } finally {
      setActionBusy('');
    }
  };

  const startTransaction = async () => {
    setStartingTransaction(true);
    try {
      const transaction = await transactionService.create(
        acceptedOffer ? { offer_id: acceptedOffer.id } : { conversation_id: conversationId },
      );
      toast.success('Transaction started', 'Arrange the meeting and confirm the handover when done.');
      await loadDetail(conversationId, { silent: true });
      navigate('/transactions');
      return transaction;
    } catch (err) {
      toast.error('Could not start the transaction', apiError(err).message);
    } finally {
      setStartingTransaction(false);
    }
  };

  const proposeMeeting = async (event) => {
    event.preventDefault();
    if (!meetingForm.scheduled_at || meetingForm.location.trim().length < 3) {
      toast.error('Add a date, time and location');
      return;
    }
    setActionBusy('meeting');
    try {
      await meetingService.propose({
        conversation_id: conversationId,
        scheduled_at: new Date(meetingForm.scheduled_at).toISOString(),
        location: meetingForm.location.trim(),
        notes: meetingForm.notes.trim() || undefined,
      });
      toast.success('Meeting proposed');
      setMeetingOpen(false);
      setMeetingForm({ scheduled_at: '', location: '', notes: '' });
      await loadDetail(conversationId, { silent: true });
    } catch (err) {
      toast.error('Could not propose a meeting', apiError(err).message);
    } finally {
      setActionBusy('');
    }
  };

  const respondMeeting = async (meeting, action) => {
    setActionBusy(meeting.id);
    try {
      await meetingService.respond(meeting.id, { action });
      toast.success(action === 'accept' ? 'Meeting confirmed' : 'Meeting updated');
      await loadDetail(conversationId, { silent: true });
    } catch (err) {
      toast.error('Could not update meeting', apiError(err).message);
    } finally {
      setActionBusy('');
    }
  };

  if (!conversationId) {
    return (
      <div className="space-y-4">
        <InboxHeader count={conversations.length} onCompose={() => navigate('/marketplace')} />

        <div className="no-scrollbar flex gap-1 overflow-x-auto lg:hidden">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread' },
            { id: 'buying', label: 'Buying' },
            { id: 'selling', label: 'Selling' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFolder(item.id)}
              className={cx(
                'shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition',
                folder === item.id ? 'border-brand-500 bg-brand-500 text-white' : 'border-line bg-surface text-muted',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[176px_330px_1fr]">
          <FolderNav folder={folder} setFolder={setFolder} conversations={conversations} currentUserId={user?.id} />

          <section className="surface-card min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line p-2.5">
              <div className="relative min-w-0 flex-1">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search conversations"
                  className="h-9 w-full rounded-[8px] border border-line bg-elevated pl-8 pr-3 text-[11.5px] text-ink placeholder:text-muted focus:border-brand-300 focus:outline-none"
                  aria-label="Search conversations"
                />
              </div>
              <button
                type="button"
                onClick={() => navigate('/marketplace')}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-brand-500 text-white transition hover:bg-brand-600"
                aria-label="Start a new conversation"
              >
                <Plus size={16} />
              </button>
            </div>

            {listError ? (
              <div className="p-3"><ErrorState message={listError} onRetry={loadList} /></div>
            ) : listLoading ? (
              <LoadingPage label="Loading conversations…" />
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-14 text-center">
                <MessageCircle size={24} className="text-brand-400" />
                <h2 className="mt-3 text-sm font-semibold text-ink">No conversations here</h2>
                <p className="mt-1 max-w-[240px] text-[11.5px] leading-relaxed text-muted">
                  Open a listing and tap “Message seller” to start a conversation about an item.
                </p>
                <Link to="/marketplace" className="mt-3">
                  <Button variant="secondary" size="sm">Browse marketplace</Button>
                </Link>
              </div>
            ) : (
              <ul className="max-h-[calc(100vh-14rem)] divide-y divide-line overflow-y-auto">
                {filtered.map((conversation) => (
                  <li key={conversation.id}>
                    <ConversationRow
                      conversation={conversation}
                      currentUserId={user?.id}
                      onClick={() => navigate(`/messages/${conversation.id}`)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <DetailPlaceholder />
        </div>
      </div>
    );
  }

  if (detailLoading && !detail) return <LoadingPage label="Opening conversation…" />;
  if (detailError) return <ErrorState message={detailError} onRetry={() => navigate('/messages')} />;
  if (!detail) return null;

  const counterpart = detail.counterpart;

  const currentIndex = filtered.findIndex((conversation) => conversation.id === conversationId);
  const previousConversation = currentIndex > 0 ? filtered[currentIndex - 1] : null;
  const nextConversation = currentIndex >= 0 && currentIndex < filtered.length - 1 ? filtered[currentIndex + 1] : null;

  return (
    <>
      <div className="space-y-4">
        <InboxHeader count={conversations.length} onCompose={() => navigate('/marketplace')} />

        <div className="overflow-hidden rounded-card border border-line bg-surface">
        <div className="grid lg:grid-cols-[176px_300px_1fr]">
          <FolderNav folder={folder} setFolder={setFolder} conversations={conversations} currentUserId={user?.id} />

          <aside className="hidden border-r border-line lg:block">
            <div className="border-b border-line p-2.5">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search conversations"
                  className="h-9 w-full rounded-[8px] border border-line bg-elevated pl-8 pr-3 text-[11.5px] text-ink placeholder:text-muted focus:border-brand-300 focus:outline-none"
                  aria-label="Search conversations"
                />
              </div>
            </div>
            <ul className="max-h-[calc(100vh-14rem)] divide-y divide-line overflow-y-auto">
              {filtered.map((conversation) => (
                <li key={conversation.id}>
                  <ConversationRow
                    conversation={conversation}
                    active={conversation.id === conversationId}
                    currentUserId={user?.id}
                    onClick={() => navigate(`/messages/${conversation.id}`)}
                  />
                </li>
              ))}
            </ul>
          </aside>

          <section className="flex min-h-[70vh] min-w-0 flex-col">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/messages')}
                  className="liquid-glass-back liquid-glass-back--icon lg:hidden"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft size={18} />
                </button>
                <Avatar name={counterpart.full_name} src={counterpart.avatar_url} size="sm" />
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate text-[13px] font-semibold text-ink">
                    {counterpart.full_name}
                    {counterpart.verification_status === 'verified' ? <CheckCheck size={13} className="text-success" /> : null}
                  </p>
                  <p className="truncate text-[10.5px] text-muted">
                    {counterpart.college} · {detail.buyer.id === user?.id ? 'Buying' : 'Selling'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge tone={socketStatus === 'open' ? 'success' : 'neutral'} size="xs">
                  {socketStatus === 'open' ? 'Live' : socketStatus === 'connecting' ? 'Connecting' : 'REST'}
                </Badge>
                <Button size="xs" variant="secondary" icon={HandCoins} onClick={() => { setCounterTarget(null); setOfferForm({ amount: String(Math.round(detail.product.price * 0.9)), message: '' }); setOfferOpen(true); }}>
                  Offer
                </Button>
                <Button size="xs" variant="secondary" icon={CalendarClock} onClick={() => setMeetingOpen(true)}>
                  Meet
                </Button>

                <span className="ml-1 hidden items-center gap-1 sm:flex">
                  <button
                    type="button"
                    disabled={!previousConversation}
                    onClick={() => previousConversation && navigate(`/messages/${previousConversation.id}`)}
                    className="rounded-lg border border-line p-1.5 text-muted transition hover:text-ink disabled:opacity-40"
                    aria-label="Previous conversation"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={!nextConversation}
                    onClick={() => nextConversation && navigate(`/messages/${nextConversation.id}`)}
                    className="rounded-lg border border-line p-1.5 text-muted transition hover:text-ink disabled:opacity-40"
                    aria-label="Next conversation"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button type="button" className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-ink" aria-label="Conversation options">
                    <MoreHorizontal size={16} />
                  </button>
                </span>
              </div>
            </header>

          <Link
            to={`/product/${detail.product.id}`}
            className="flex items-center gap-2.5 border-b border-line bg-canvas px-3 py-2 transition hover:bg-elevated"
          >
            <ProductImage src={detail.product.cover_image} alt={detail.product.title} className="h-9 w-9 rounded-md" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-ink">{detail.product.title}</span>
              <span className="block text-[11px] text-muted">{inr(detail.product.price)} · {detail.product.status.replace('_', ' ')}</span>
            </span>
            <span className="text-[11px] font-semibold text-brand-600">View listing</span>
          </Link>

          {latestOffer ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-warning/5 px-3 py-2 text-[12px]">
              <StatusBadge map={OFFER_STATUS} value={latestOffer.status} />
              <span className="text-ink">Latest offer: <strong>{inr(latestOffer.amount)}</strong></span>
              <span className="text-muted">· {timeAgo(latestOffer.created_at)}</span>
              {latestOffer.can_respond ? (
                <span className="ml-auto flex gap-1">
                  <Button size="xs" variant="success" icon={Check} loading={actionBusy === latestOffer.id} onClick={() => respondOffer(latestOffer, 'accept')}>
                    Accept
                  </Button>
                  <Button size="xs" variant="secondary" icon={HandCoins} onClick={() => respondOffer(latestOffer, 'counter')}>
                    Counter
                  </Button>
                  <Button size="xs" variant="ghost" icon={X} onClick={() => respondOffer(latestOffer, 'reject')}>
                    Decline
                  </Button>
                </span>
              ) : latestOffer.status === 'pending' && latestOffer.offered_by_id === user?.id ? (
                <Button size="xs" variant="ghost" className="ml-auto text-danger" onClick={() => respondOffer(latestOffer, 'cancel')}>
                  Withdraw offer
                </Button>
              ) : null}
            </div>
          ) : null}

          {latestMeeting ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-accent/5 px-3 py-2 text-[12px]">
              <StatusBadge map={MEETING_STATUS} value={latestMeeting.status} />
              <span className="text-ink">{formatDateTime(latestMeeting.scheduled_at)} · {latestMeeting.location}</span>
              {latestMeeting.can_respond ? (
                <span className="ml-auto flex gap-1">
                  <Button size="xs" variant="success" loading={actionBusy === latestMeeting.id} onClick={() => respondMeeting(latestMeeting, 'accept')}>
                    Accept time
                  </Button>
                  <Button size="xs" variant="secondary" onClick={() => respondMeeting(latestMeeting, 'reschedule')}>
                    Reschedule
                  </Button>
                </span>
              ) : null}
            </div>
          ) : null}

          {acceptedOffer && !detail.transaction ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-success/5 px-3 py-2 text-[12px] text-success">
              <Check size={14} />
              <span>Price agreed at {inr(acceptedOffer.amount)}.</span>
              {detail.buyer.id === user?.id ? (
                <Button size="xs" variant="success" className="ml-auto" loading={startingTransaction} onClick={startTransaction}>
                  Start transaction
                </Button>
              ) : (
                <span className="ml-auto text-muted">Waiting for the buyer to start the transaction.</span>
              )}
            </div>
          ) : null}

          {detail.transaction ? (
            <Link
              to="/transactions"
              className="flex items-center gap-2 border-b border-line bg-brand-50/60 px-3 py-2 text-[12px] text-brand-800 dark:bg-brand-900/20 dark:text-brand-200"
            >
              <Badge tone="brand" size="xs">Transaction</Badge>
              <span>{inr(detail.transaction.agreed_price)} · {detail.transaction.status.replace(/_/g, ' ')}</span>
              <span className="ml-auto font-semibold">Open transactions</span>
            </Link>
          ) : null}

          <div className="flex-1 space-y-3 overflow-y-auto bg-canvas/60 p-3 sm:p-4" style={{ maxHeight: 'calc(100vh - 26rem)' }}>
            {detail.messages.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">Say hello and ask about the item.</p>
            ) : (
              detail.messages.map((message) => {
                if (message.message_type === 'system') {
                  return (
                    <p key={message.id} className="mx-auto w-fit max-w-[85%] rounded-full bg-elevated px-3 py-1 text-center text-[11px] text-muted">
                      {message.body}
                    </p>
                  );
                }
                const mine = message.sender_id === user?.id;
                return (
                  <div key={message.id} className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div className={cx('max-w-[80%] sm:max-w-[70%]')}>
                      <div
                        className={cx(
                          'rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-sm',
                          mine
                            ? 'rounded-br-md border border-brand-200 bg-brand-50 text-navy dark:border-brand-500/45 dark:bg-brand-500/25 dark:text-brand-50'
                            : 'rounded-bl-md border border-line bg-surface text-ink',
                        )}
                      >
                        <p className="whitespace-pre-line break-words">{message.body}</p>
                      </div>
                      <p className={cx('mt-1 text-[10.5px] text-muted', mine ? 'text-right' : '')}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            {typing ? (
              <div className="flex animate-fade-in items-end gap-2">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-surface px-3 py-2.5 shadow-sm">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
                <span className="pb-1 text-[10.5px] text-muted">
                  {counterpart.full_name.split(' ')[0]} is typing
                </span>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={sendMessage} className="border-t border-line p-3">
            <div className="rounded-[10px] border border-line bg-elevated/55 p-2.5">
              <textarea
                value={draft}
                onChange={(event) => handleTyping(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage(event);
                  }
                }}
                rows={2}
                maxLength={4000}
                placeholder="Write a message…"
                aria-label="Message"
                className="max-h-32 min-h-[48px] w-full resize-none bg-transparent px-1 py-1 text-[12.5px] leading-relaxed text-ink placeholder:text-muted focus:outline-none"
              />
              <div className="mt-1 flex items-center justify-between gap-2 border-t border-line pt-2">
                <p className="hidden text-[9.5px] text-muted sm:block">Enter to send · Shift + Enter for a new line</p>
                <Button type="submit" size="sm" icon={Send} loading={sending} disabled={!draft.trim()}>
                  Send
                </Button>
              </div>
            </div>
          </form>
        </section>
        </div>
      </div>

      <Modal
        open={offerOpen}
        onClose={() => { setOfferOpen(false); setCounterTarget(null); }}
        title={counterTarget ? 'Send a counteroffer' : 'Make an offer'}
        description={`Listing price ${inr(detail.product.price)}. Both sides can accept, decline or counter.`}
        size="sm"
      >
        <form onSubmit={submitOffer} className="space-y-4">
          <Input
            label="Amount (₹)"
            name="amount"
            type="number"
            min="1"
            value={offerForm.amount}
            onChange={(event) => setOfferForm({ ...offerForm, amount: event.target.value })}
            required
          />
          <Textarea
            label="Message (optional)"
            value={offerForm.message}
            onChange={(event) => setOfferForm({ ...offerForm, message: event.target.value })}
            rows={2}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setOfferOpen(false)}>Cancel</Button>
            <Button type="submit" loading={actionBusy === 'offer'} icon={HandCoins}>
              {counterTarget ? 'Send counteroffer' : 'Send offer'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={meetingOpen}
        onClose={() => setMeetingOpen(false)}
        title="Propose a meeting"
        description="Choose a public campus location. The other student can accept or suggest another time."
        size="sm"
      >
        <form onSubmit={proposeMeeting} className="space-y-4">
          <div>
            <label htmlFor="meeting-time" className="label-base">Date and time</label>
            <input
              id="meeting-time"
              type="datetime-local"
              value={meetingForm.scheduled_at}
              onChange={(event) => setMeetingForm({ ...meetingForm, scheduled_at: event.target.value })}
              className="input-base"
              required
            />
          </div>
          <Input
            label="Location"
            value={meetingForm.location}
            onChange={(event) => setMeetingForm({ ...meetingForm, location: event.target.value })}
            placeholder="Central library entrance"
            required
          />
          <Textarea
            label="Notes (optional)"
            value={meetingForm.notes}
            onChange={(event) => setMeetingForm({ ...meetingForm, notes: event.target.value })}
            rows={2}
            placeholder="I'll be wearing a blue hoodie."
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setMeetingOpen(false)}>Cancel</Button>
            <Button type="submit" loading={actionBusy === 'meeting'} icon={CalendarClock}>Propose meeting</Button>
          </div>
        </form>
      </Modal>

        <div className="flex items-center justify-between border-t border-line bg-surface px-3 py-2 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <VerifiedBadge status={counterpart.verification_status} compact />
          </span>
          <span className="inline-flex items-center gap-1"><Plus size={11} /> Deals are completed offline, in person.</span>
        </div>
      </div>
    </>
  );
}
