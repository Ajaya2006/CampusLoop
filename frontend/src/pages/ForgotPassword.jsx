import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, Mail } from 'lucide-react';
import { authService } from '../services';
import { apiError } from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';
import Button from '../components/common/Button';
import AuthField from '../components/auth/AuthField';
import { InlineAlert } from '../components/common/Feedback';

export default function ForgotPassword() {
  useDocumentTitle('Forgot password');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await authService.forgotPassword(email.trim());
      setResult(data);
    } catch (err) {
      setError(apiError(err, 'Could not create a reset link.').message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink">
        <ArrowLeft size={14} /> Back to sign in
      </Link>
      <h1 className="mt-4 font-display text-[23px] font-extrabold leading-tight tracking-tight text-ink">
        Reset your password
      </h1>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
        Enter the email on your CampusLoop account. In this academic deployment no email provider is configured, so
        the reset token is shown to you directly.
      </p>

      {error ? <InlineAlert tone="danger" className="mt-5">{error}</InlineAlert> : null}

      {result ? (
        <div className="mt-6 space-y-4">
          <InlineAlert tone="success" title="Check your inbox (or the token below)">
            {result.message}
          </InlineAlert>
          {result.reset_token ? (
            <div className="rounded-card border border-line bg-canvas p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Development reset token</p>
              <code className="mt-2 block break-all rounded-control bg-surface p-3 text-[12px] text-ink">{result.reset_token}</code>
              <Link to={`/reset-password?token=${encodeURIComponent(result.reset_token)}`} className="mt-3 inline-block">
                <Button icon={KeyRound} size="sm">Continue to reset</Button>
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted">
              An email with the reset instructions has been sent. Follow the link in that email to choose a new
              password.
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-3.5">
          <AuthField
            label="Student email"
            name="email"
            type="email"
            icon={Mail}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@college.edu"
            autoComplete="email"
            required
          />
          <Button type="submit" block size="lg" loading={busy} className="auth-submit">
            Send reset link
          </Button>
        </form>
      )}
    </div>
  );
}
