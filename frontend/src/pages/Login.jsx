import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-react';
import { SESSION_NOTICE_KEY, useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiError } from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';
import Button from '../components/common/Button';
import AuthField from '../components/auth/AuthField';
import { InlineAlert } from '../components/common/Feedback';

export default function Login() {
  useDocumentTitle('Sign in');
  const { login, isAuthenticated, booting } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_NOTICE_KEY);
    if (stored) {
      setNotice(stored);
      sessionStorage.removeItem(SESSION_NOTICE_KEY);
    }
  }, []);

  if (!booting && isAuthenticated) {
    return <Navigate to={location.state?.from || '/dashboard'} replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage('');
    try {
      const user = await login({ email: form.email.trim(), password: form.password });
      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}`);
      navigate(location.state?.from || (user.role === 'admin' ? '/admin' : '/dashboard'), { replace: true });
    } catch (err) {
      const parsed = apiError(err, 'Could not sign you in.');
      setErrors(parsed.fields);
      setMessage(parsed.message);
    } finally {
      setBusy(false);
    }
  };

  const useDemo = (role) => {
    setForm(
      role === 'admin'
        ? { email: 'admin@campusloop.app', password: 'Admin@12345' }
        : { email: 'ananya@student.edu', password: 'Student@123' },
    );
  };

  return (
    <div>
      <h1 className="font-display text-[25px] font-extrabold leading-tight tracking-tight text-ink">
        Welcome back, student
      </h1>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
        Sign in to manage your listings, chats and campus deals.
      </p>

      {notice ? (
        <InlineAlert tone="info" className="mt-4">
          {notice}
        </InlineAlert>
      ) : null}

      {message ? (
        <InlineAlert tone="danger" className="mt-4">
          {message}
        </InlineAlert>
      ) : null}

      <form onSubmit={submit} className="mt-5 space-y-3.5">
        <AuthField
          label="Student email"
          name="email"
          type="email"
          icon={Mail}
          autoComplete="email"
          placeholder="you@college.edu"
          value={form.email}
          error={errors.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          required
        />

        <AuthField
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          icon={Lock}
          autoComplete="current-password"
          placeholder="Your password"
          value={form.password}
          error={errors.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          action={
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="auth-action"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          required
        />

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-[11.5px] font-semibold text-brand-600 hover:text-brand-700">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" block size="lg" loading={busy} icon={LogIn} className="auth-submit">
          Sign in
        </Button>
      </form>

      <div className="auth-note mt-4">
        <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink">
          <Mail size={12} /> Demo accounts (seeded)
        </p>
        <p className="mt-0.5 text-[10.5px] text-muted">
          For evaluation only. These exist in the local seeded database.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => useDemo('student')}
            className="rounded-[9px] border border-line bg-surface px-2.5 py-1 text-[10.5px] font-medium text-ink transition hover:border-brand-300 hover:text-brand-600 active:scale-[0.98]"
          >
            Student · ananya@student.edu
          </button>
          <button
            type="button"
            onClick={() => useDemo('admin')}
            className="rounded-[9px] border border-line bg-surface px-2.5 py-1 text-[10.5px] font-medium text-ink transition hover:border-brand-300 hover:text-brand-600 active:scale-[0.98]"
          >
            Admin · admin@campusloop.app
          </button>
        </div>
      </div>
    </div>
  );
}
