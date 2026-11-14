import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Logo from './Logo';
import PageTransition from './PageTransition';
import AuthModeToggle from '../auth/AuthModeToggle';
import '../../styles/auth.css';

/* Drop the artwork into src/assets/auth/ (any name, png/jpg/webp) and it is
   picked up automatically: a file with "night" or "dark" in its name becomes
   the dark-mode scene, anything else becomes the day scene. */
const bundled = import.meta.glob('../../assets/auth/*.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const entries = Object.entries(bundled);
const dayArt = entries.find(([path]) => !/night|dark/i.test(path))?.[1] || entries[0]?.[1] || null;
const nightArt =
  entries.find(([path]) => /night|dark/i.test(path))?.[1] || dayArt;

export default function AuthLayout() {
  const { pathname } = useLocation();
  const showToggle = pathname === '/login' || pathname === '/register';

  return (
    <div
      className="auth-page"
      style={
        dayArt
          ? {
              '--auth-scene-day': `url(${dayArt})`,
              '--auth-scene-night': `url(${nightArt})`,
            }
          : undefined
      }
    >
      <div className="auth-shell">
        <aside className="auth-scene">
          <div className="auth-scene-logo">
            <Logo />
          </div>

          <div className="auth-scene-copy">
            <p className="auth-scene-kicker">Student marketplace</p>
            <h2 className="auth-scene-title">Buy, sell and swap without leaving campus.</h2>
            <p className="auth-scene-text">
              Verified students, moderated listings and fair campus prices — everything your hostel,
              lab and semester needs in one loop.
            </p>
          </div>
        </aside>

        <section className="auth-card">
          <div className="auth-card-top flex items-center justify-between gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted transition hover:text-ink"
            >
              <ArrowLeft size={13} /> Back to marketplace
            </Link>
          </div>

          <div className="mt-4 flex justify-center">
            <Logo size="lg" />
          </div>

          {showToggle ? (
            <div className="mt-5">
              <AuthModeToggle />
            </div>
          ) : null}

          <div className="mt-6">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>

          <p className="auth-card-note mt-6 text-center text-[10.5px] leading-relaxed text-muted">
            CampusLoop is an academic project. Deals are completed in person; no online payments are processed.
          </p>
        </section>
      </div>
    </div>
  );
}
