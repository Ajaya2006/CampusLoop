import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, KeyRound, Lock } from 'lucide-react';
import { authService } from '../services';
import { apiError } from '../services/api';
import { useToast } from '../context/ToastContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import Button from '../components/common/Button';
import AuthField from '../components/auth/AuthField';
import { InlineAlert } from '../components/common/Feedback';

export default function ResetPassword() {
  useDocumentTitle('Choose a new password');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ token: params.get('token') || '', password: '', confirm_password: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [visible, setVisible] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setErrors({});
    if (form.password !== form.confirm_password) {
      setErrors({ confirm_password: 'Passwords do not match' });
      return;
    }
    setBusy(true);
    try {
      await authService.resetPassword(form);
      setDone(true);
      toast.success('Password updated');
      setTimeout(() => navigate('/login', { replace: true }), 1600);
    } catch (err) {
      const parsed = apiError(err, 'Could not reset your password.');
      setErrors(parsed.fields);
      setMessage(parsed.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="text-center">
        <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success">
          <CheckCircle2 size={26} />
        </span>
        <h1 className="font-display text-2xl font-extrabold text-ink">Password updated</h1>
        <p className="mt-2 text-sm text-muted">Taking you to the sign-in page…</p>
        <Link to="/login" className="mt-4 inline-block text-sm font-semibold text-brand-600">Sign in now</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-[23px] font-extrabold leading-tight tracking-tight text-ink">
        Choose a new password
      </h1>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
        Paste the reset token from the previous step, then set a new password.
      </p>

      {message ? <InlineAlert tone="danger" className="mt-5">{message}</InlineAlert> : null}

      <form onSubmit={submit} className="mt-5 space-y-3.5">
        <AuthField
          label="Reset token"
          name="token"
          icon={KeyRound}
          value={form.token}
          error={errors.token}
          onChange={(event) => setForm({ ...form, token: event.target.value })}
          required
        />
        <AuthField
          label="New password"
          name="password"
          type={visible ? 'text' : 'password'}
          icon={Lock}
          value={form.password}
          error={errors.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          hint="At least 8 characters, including a letter and a number."
          autoComplete="new-password"
          action={
            <button
              type="button"
              onClick={() => setVisible((value) => !value)}
              className="auth-action"
              aria-label={visible ? 'Hide password' : 'Show password'}
            >
              {visible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          required
        />
        <AuthField
          label="Confirm new password"
          name="confirm_password"
          type={visible ? 'text' : 'password'}
          icon={Lock}
          value={form.confirm_password}
          error={errors.confirm_password}
          onChange={(event) => setForm({ ...form, confirm_password: event.target.value })}
          autoComplete="new-password"
          required
        />
        <Button type="submit" block size="lg" loading={busy} className="auth-submit">
          Reset password
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        Remembered it?{' '}
        <Link to="/login" className="font-semibold text-brand-600">Sign in</Link>
      </p>
    </div>
  );
}
