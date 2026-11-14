import { Link, Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LoadingPage } from '../components/common/Feedback';
import Button from '../components/common/Button';

function VerificationGate() {
  return (
    <div className="mx-auto max-w-lg py-10">
      <div className="surface-card p-7 text-center">
        <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10 text-warning">
          <ShieldAlert size={26} />
        </span>
        <h1 className="text-xl font-bold text-ink">Verify your student account</h1>
        <p className="mt-2 text-sm text-muted">
          CampusLoop is limited to verified students. Submit your college and student ID so a moderator can
          confirm your account. This usually takes less than a day.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link to="/verify">
            <Button icon={ShieldCheck}>Start verification</Button>
          </Link>
          <Link to="/marketplace">
            <Button variant="secondary">Browse marketplace</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Forbidden() {
  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <h1 className="text-xl font-bold text-ink">Administrator access only</h1>
      <p className="mt-2 text-sm text-muted">Your account does not have permission to open this area.</p>
      <Link to="/dashboard" className="mt-5 inline-block">
        <Button variant="secondary">Back to dashboard</Button>
      </Link>
    </div>
  );
}

export default function ProtectedRoute({ children, requireVerified = false, requireAdmin = false }) {
  const { user, booting, isVerified, isAdmin } = useAuth();
  const location = useLocation();

  if (booting) return <LoadingPage label="Checking your session…" />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (requireAdmin && !isAdmin) return <Forbidden />;
  if (requireVerified && !isVerified) return <VerificationGate />;

  return children;
}
