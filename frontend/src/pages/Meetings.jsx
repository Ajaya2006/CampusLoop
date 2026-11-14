import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarClock, Check, Clock, MapPin, MessageCircle, RefreshCw, X } from 'lucide-react';
import { meetingService } from '../services';
import { apiError } from '../services/api';
import { useToast } from '../context/ToastContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import PageHeader from '../components/layout/PageHeader';
import Badge, { StatusBadge } from '../components/common/Badge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { Input, Textarea } from '../components/common/Form';
import { EmptyState, ErrorState, ListSkeleton } from '../components/common/Feedback';
import { MEETING_STATUS } from '../constants';
import { formatDateTime } from '../utils/format';

export default function Meetings() {
  useDocumentTitle('Meetings');
  const toast = useToast();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reschedule, setReschedule] = useState(null);
  const [form, setForm] = useState({ scheduled_at: '', location: '', notes: '' });
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setMeetings(await meetingService.list());
    } catch (err) {
      setError(apiError(err, 'Could not load meetings.').message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const respond = async (meeting, action, extra) => {
    setBusy(meeting.id + action);
    try {
      await meetingService.respond(meeting.id, { action, ...extra });
      const labels = {
        accept: 'Meeting confirmed',
        reject: 'Meeting declined',
        reschedule: 'New time proposed',
        cancel: 'Meeting cancelled',
        complete: 'Meeting marked completed',
      };
      toast.success(labels[action] || 'Meeting updated');
      setReschedule(null);
      await load();
    } catch (err) {
      toast.error('Could not update meeting', apiError(err).message);
    } finally {
      setBusy('');
    }
  };

  const submitReschedule = (event) => {
    event.preventDefault();
    if (!form.scheduled_at) {
      toast.error('Choose a new date and time');
      return;
    }
    respond(reschedule, 'reschedule', {
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      location: form.location || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <div>
      <PageHeader
        title="Meetings"
        description="Plan a safe campus handover. Both sides see the same confirmed time and place."
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
      ) : meetings.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No meetings yet"
          description="Start a conversation about an item, then propose a meeting from the chat window."
          action={<Link to="/messages"><Button variant="secondary">Go to messages</Button></Link>}
        />
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <article key={meeting.id} className="surface-card p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                    <CalendarClock size={20} />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink">{meeting.product_title || 'Campus handover'}</p>
                      <StatusBadge map={MEETING_STATUS} value={meeting.status} />
                      <Badge tone="neutral" size="xs">
                        {meeting.is_proposer ? 'You proposed' : `${meeting.counterpart_name} proposed`}
                      </Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                      <Clock size={13} className="text-muted" /> {formatDateTime(meeting.scheduled_at)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                      <MapPin size={13} /> {meeting.location}
                    </p>
                    <p className="mt-1 text-xs text-muted">With {meeting.counterpart_name}</p>
                    {meeting.notes ? (
                      <p className="mt-1.5 rounded-control bg-canvas px-2.5 py-1.5 text-[12.5px] text-muted">{meeting.notes}</p>
                    ) : null}
                    {meeting.cancel_reason ? (
                      <p className="mt-1.5 text-xs text-danger">Cancelled: {meeting.cancel_reason}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-start gap-1.5 sm:justify-end">
                  <Button size="xs" variant="ghost" icon={MessageCircle} onClick={() => navigate(`/messages/${meeting.conversation_id}`)}>
                    Chat
                  </Button>
                  {meeting.can_respond ? (
                    <>
                      <Button size="xs" variant="success" icon={Check} loading={busy === meeting.id + 'accept'} onClick={() => respond(meeting, 'accept')}>
                        Accept
                      </Button>
                      <Button
                        size="xs"
                        variant="secondary"
                        icon={RefreshCw}
                        onClick={() => {
                          setReschedule(meeting);
                          setForm({ scheduled_at: '', location: meeting.location, notes: '' });
                        }}
                      >
                        New time
                      </Button>
                      <Button size="xs" variant="ghost" className="text-danger" icon={X} loading={busy === meeting.id + 'reject'} onClick={() => respond(meeting, 'reject')}>
                        Decline
                      </Button>
                    </>
                  ) : null}
                  {meeting.status === 'confirmed' && meeting.is_proposer ? (
                    <>
                      <Button size="xs" variant="secondary" loading={busy === meeting.id + 'complete'} onClick={() => respond(meeting, 'complete')}>
                        Mark completed
                      </Button>
                      <Button size="xs" variant="ghost" className="text-danger" onClick={() => respond(meeting, 'cancel')}>
                        Cancel
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(reschedule)}
        onClose={() => setReschedule(null)}
        title="Suggest another time"
        description={reschedule ? `${reschedule.product_title} with ${reschedule.counterpart_name}` : ''}
        size="sm"
      >
        <form onSubmit={submitReschedule} className="space-y-4">
          <div>
            <label htmlFor="new-time" className="label-base">New date and time</label>
            <input
              id="new-time"
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(event) => setForm({ ...form, scheduled_at: event.target.value })}
              className="input-base"
              required
            />
          </div>
          <Input label="Location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
          <Textarea label="Note (optional)" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setReschedule(null)}>Cancel</Button>
            <Button type="submit" loading={busy.endsWith('reschedule')} icon={RefreshCw}>Propose new time</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
