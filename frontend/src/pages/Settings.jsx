import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Monitor, Moon, ShieldCheck, Sun, Sunrise } from 'lucide-react';
import { authService } from '../services';
import { apiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/common/Button';
import { Input } from '../components/common/Form';
import { InlineAlert } from '../components/common/Feedback';
import { VerifiedBadge } from '../components/common/Badge';
import { formatDate } from '../utils/format';

const themes = [
  { value: 'auto', label: 'Auto', icon: Sunrise },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

const clockTime = (date) =>
  date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export default function Settings() {
  useDocumentTitle('Settings');
  const { user, logout } = useAuth();
  const { theme, setTheme, requestGeolocation, daylightWindow, geo } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const chooseTheme = async (value) => {
    setTheme(value);
    if (value !== 'auto' || geo) return;
    const position = await requestGeolocation();
    if (position) {
      toast.success('Location added', 'Day and night now follow sunrise and sunset where you are.');
    } else {
      toast.info('Using the local clock', 'Allow location access to match the real sunrise and sunset.');
    }
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    setErrors({});
    setMessage('');
    if (form.new_password !== form.confirm) {
      setErrors({ confirm: 'New passwords do not match' });
      return;
    }
    setBusy(true);
    try {
      await authService.changePassword({ current_password: form.current_password, new_password: form.new_password });
      toast.success('Password changed', 'Use your new password next time you sign in.');
      setForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      const parsed = apiError(err, 'Could not change your password.');
      setErrors(parsed.fields);
      setMessage(parsed.message);
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Settings"
        description="Manage your account security, appearance and verification."
        breadcrumb={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Settings' }]}
      />

      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-ink">Account</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            ['Name', user?.full_name],
            ['Email', user?.email],
            ['College', user?.college],
            ['Course', user?.course || '—'],
            ['Member since', formatDate(user?.created_at)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] uppercase tracking-wider text-muted">{label}</dt>
              <dd className="mt-0.5 truncate text-sm font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <VerifiedBadge status={user?.verification_status} />
          <Link to="/verify" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
            Manage verification
          </Link>
          <Link to="/profile/edit" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
            Edit profile
          </Link>
        </div>
      </section>

      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-ink">Appearance</h2>
        <p className="mt-0.5 text-xs text-muted">
          Auto follows the real sunrise and sunset at your location; light and dark pin one mode.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {themes.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => chooseTheme(option.value)}
              aria-pressed={theme === option.value}
              className={`flex flex-col items-center gap-1.5 rounded-control border p-3 text-xs font-medium transition ${
                theme === option.value
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                  : 'border-line text-muted hover:border-brand-200'
              }`}
            >
              <option.icon size={17} />
              {option.label}
            </button>
          ))}
        </div>
        {theme === 'auto' ? (
          <p className="mt-2.5 text-xs text-muted">
            {daylightWindow?.polar === 'day'
              ? 'Midnight sun where you are, so the theme stays light.'
              : daylightWindow?.polar === 'night'
                ? 'Polar night where you are, so the theme stays dark.'
                : daylightWindow
                  ? `Sunrise ${clockTime(daylightWindow.sunrise)} · Sunset ${clockTime(daylightWindow.sunset)} at your location.`
                  : 'Location not shared yet, so the theme follows the local clock (light 06:00–18:30).'}
          </p>
        ) : null}
      </section>

      <section className="surface-card p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <ShieldCheck size={15} className="text-success" /> Change password
        </h2>
        {message ? <InlineAlert tone="danger" className="mt-3">{message}</InlineAlert> : null}
        <form onSubmit={submitPassword} className="mt-3 space-y-4">
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={form.current_password}
            error={errors.current_password}
            onChange={(event) => setForm({ ...form, current_password: event.target.value })}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              value={form.new_password}
              error={errors.new_password}
              onChange={(event) => setForm({ ...form, new_password: event.target.value })}
              hint="8+ characters with a letter and a number."
              required
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              error={errors.confirm}
              onChange={(event) => setForm({ ...form, confirm: event.target.value })}
              required
            />
          </div>
          <Button type="submit" loading={busy}>Update password</Button>
        </form>
      </section>

      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-ink">Session</h2>
        <p className="mt-0.5 text-xs text-muted">
          Signing out clears the tokens stored in this browser. JWTs are stateless, so treat your device as the session.
        </p>
        <Button variant="secondary" className="mt-3" icon={LogOut} onClick={signOut}>Sign out</Button>
      </section>

      <p className="pb-2 text-center text-[11px] text-muted">
        CampusLoop does not process payments and never asks for OTPs or bank details.
      </p>
    </div>
  );
}
