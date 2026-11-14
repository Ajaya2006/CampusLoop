import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Clock3, FileUp, ShieldCheck, XCircle } from 'lucide-react';
import { verificationService } from '../services';
import { apiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/common/Button';
import { Input, Select, Textarea } from '../components/common/Form';
import { InlineAlert, LoadingPage } from '../components/common/Feedback';
import { formatDateTime } from '../utils/format';

export default function VerifyStudent() {
  useDocumentTitle('Student verification');
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    college: user?.college || '',
    student_id_number: '',
    department: user?.department || '',
    course: user?.course || '',
    year: user?.year || '',
    note: '',
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadStatus = async () => {
    try {
      const data = await verificationService.status();
      setStatus(data);
    } catch (err) {
      setError(apiError(err, 'Could not load your verification status.').message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.student_id_number.trim()) {
      setError('Enter your college or student ID number.');
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append('college', form.college);
      body.append('student_id_number', form.student_id_number.trim());
      if (form.department) body.append('department', form.department);
      if (form.course) body.append('course', form.course);
      if (form.year) body.append('year', String(form.year));
      if (form.note) body.append('note', form.note);
      if (file) body.append('document', file);
      await verificationService.submit(body);
      await refreshUser();
      await loadStatus();
      toast.success('Verification submitted', 'A moderator will review your details shortly.');
    } catch (err) {
      setError(apiError(err, 'Could not submit your verification.').message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingPage label="Checking your verification status…" />;

  const current = status?.status || user?.verification_status || 'unsubmitted';

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Student verification"
        description="CampusLoop is exclusive to students. Submitting your student ID unlocks listing, messaging and offers."
        breadcrumb={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Verification' }]}
      />

      {current === 'verified' ? (
        <div className="surface-card p-6 text-center">
          <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success">
            <BadgeCheck size={26} />
          </span>
          <h2 className="font-display text-xl font-bold text-ink">You are a verified student</h2>
          <p className="mt-2 text-sm text-muted">
            Your account can list items, start conversations, make offers and complete transactions.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Link to="/sell"><Button>Sell an item</Button></Link>
            <Link to="/marketplace"><Button variant="secondary">Browse marketplace</Button></Link>
          </div>
        </div>
      ) : current === 'pending' ? (
        <div className="surface-card p-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <Clock3 size={20} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-ink">Verification under review</h2>
              <p className="mt-1 text-sm text-muted">
                A moderator is checking your details. You can browse the marketplace in the meantime; listing and
                messaging unlock after approval.
              </p>
              {status?.submitted_at ? (
                <p className="mt-2 text-xs text-muted">Submitted {formatDateTime(status.submitted_at)}</p>
              ) : null}
            </div>
          </div>
          {status?.note ? <InlineAlert tone="warning" className="mt-4" title="Moderator note">{status.note}</InlineAlert> : null}
          <div className="mt-5">
            <Link to="/marketplace"><Button variant="secondary">Browse marketplace</Button></Link>
          </div>
        </div>
      ) : (
        <>
          {current === 'rejected' ? (
            <InlineAlert tone="danger" title="Previous submission rejected" className="mb-4">
              <p className="flex items-start gap-2">
                <XCircle size={15} className="mt-0.5 shrink-0" />
                {status?.note || 'Your details did not match our records. Please submit again with a clear student ID.'}
              </p>
            </InlineAlert>
          ) : null}

          {error ? <InlineAlert tone="danger" className="mb-4">{error}</InlineAlert> : null}

          <form onSubmit={submit} className="surface-card space-y-4 p-5">
            <div className="flex items-center gap-2 rounded-control bg-brand-50 p-3 text-[12.5px] text-brand-800 dark:bg-brand-900/30 dark:text-brand-200">
              <ShieldCheck size={16} className="shrink-0" />
              Documents are stored privately and only visible to moderators reviewing your request.
            </div>

            <Input label="College / university" name="college" value={form.college} onChange={update('college')} required />
            <Input
              label="College or student ID number"
              name="student_id_number"
              value={form.student_id_number}
              onChange={update('student_id_number')}
              placeholder="As printed on your ID card"
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Department" name="department" value={form.department} onChange={update('department')} placeholder="Computer Science" />
              <Input label="Course" name="course" value={form.course} onChange={update('course')} placeholder="B.Tech" />
            </div>
            <Select label="Year of study" name="year" value={form.year} onChange={update('year')}>
              <option value="">Not specified</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((year) => (
                <option key={year} value={year}>Year {year}</option>
              ))}
            </Select>

            <div>
              <p className="label-base">Student ID document (optional)</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="hidden"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center gap-3 rounded-control border border-dashed border-line bg-canvas p-4 text-left transition hover:border-brand-300"
              >
                <FileUp size={18} className="text-brand-500" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">
                    {file ? file.name : 'Upload a photo or PDF of your student ID'}
                  </span>
                  <span className="block text-xs text-muted">PNG, JPG, WebP or PDF · max 10 MB · stored privately</span>
                </span>
              </button>
            </div>

            <Textarea
              label="Note for the moderator (optional)"
              name="note"
              value={form.note}
              onChange={update('note')}
              rows={3}
              placeholder="Anything that helps confirm you are a student here."
            />

            <Button type="submit" block loading={busy} icon={ShieldCheck} disabled={current === 'pending'}>
              Submit for verification
            </Button>
            <p className="text-center text-[11px] text-muted">
              We never treat an email domain alone as proof of enrolment. A moderator reviews every request.
            </p>
          </form>
        </>
      )}
    </div>
  );
}
