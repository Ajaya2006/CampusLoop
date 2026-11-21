import { useLayoutEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Flag,
  LayoutDashboard,
  LogOut,
  Moon,
  PackageSearch,
  ReceiptText,
  ShieldCheck,
  Store,
  Sun,
  Tag,
  Users,
} from 'lucide-react';
import Logo from './Logo';
import PageTransition from './PageTransition';
import Avatar from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import useUnreadCounts from '../../hooks/useUnreadCounts';
import '../../styles/adminTheme.css';

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/verifications', label: 'Verification', icon: ShieldCheck },
  { to: '/admin/listings', label: 'Listings', icon: Tag },
  { to: '/admin/listing-health', label: 'Listing health', icon: PackageSearch },
  { to: '/admin/reports', label: 'Reports', icon: Flag },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/transactions', label: 'Transactions', icon: ReceiptText },
  { to: '/admin/analytics', label: 'Activity', icon: BarChart3 },
];

/* One floating bar for every breakpoint. Desktop shows icon + label, the phone
   layout drops the label and keeps only the glyph. It is keyed by the route in
   AdminLayout, so the swipe-up entry replays on each section change. */
function AdminBottomBar() {
  return (
    <nav className="admin-bottom-bar" aria-label="Admin sections">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          aria-label={link.label}
          title={link.label}
          className="admin-bottom-bar__item"
        >
          <link.icon size={18} strokeWidth={1.8} className="admin-bottom-bar__icon" aria-hidden="true" />
          <span className="admin-bottom-bar__label">{link.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { resolved, toggle } = useTheme();
  const { notifications } = useUnreadCounts();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    document.body.classList.add('admin-mode');
    return () => document.body.classList.remove('admin-mode');
  }, []);

  const signOut = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="admin-shell flex min-h-screen flex-col bg-canvas">
      <header className="admin-topbar sticky top-0 z-30 border-b border-line bg-canvas">
        <div className="flex h-[74px] items-center gap-3 px-4 sm:px-6">
          <Link to="/admin" className="flex items-center gap-3" aria-label="Admin dashboard">
            <span className="sm:hidden">
              <Logo compact />
            </span>
            <span className="hidden sm:block">
              <Logo />
            </span>
          </Link>
          {/* Phone-only identity chip: the wordmark and console badge both hide. */}
          <span className="admin-mobile-badge inline-flex items-center rounded-full border border-brand-500/30 bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-700 sm:hidden">
            Admin
          </span>
          <span className="admin-console-badge hidden rounded-[7px] bg-brand-50 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-700 dark:bg-brand-900/30 dark:text-brand-200 lg:inline-block">
            Admin console
          </span>

          <p className="ml-auto hidden text-[11.5px] text-muted md:block">
            Moderating as <span className="font-semibold text-ink">{user?.full_name}</span>
          </p>

          <div className="ml-auto flex items-center gap-1 md:ml-3">
            <Link
              to="/marketplace"
              className="rounded-[9px] border border-line bg-surface p-2.5 text-muted transition hover:text-ink"
              aria-label="Back to marketplace"
              title="Back to marketplace"
            >
              <Store size={17} />
            </Link>
            <button
              type="button"
              onClick={toggle}
              className="hidden rounded-[9px] border border-line bg-surface p-2.5 text-muted transition hover:text-ink sm:inline-flex"
              aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {resolved === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <Link
              to="/notifications"
              className="relative rounded-[9px] border border-line bg-surface p-2.5 text-muted transition hover:text-ink"
              aria-label="Notifications"
            >
              <Bell size={17} />
              {notifications ? (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand-500 ring-2 ring-surface" />
              ) : null}
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="rounded-[9px] border border-line bg-surface p-2.5 text-muted transition hover:text-ink"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={17} />
            </button>
            <Link to="/profile" className="ml-1 flex items-center gap-2.5 rounded-[10px] p-1 pr-1.5 transition hover:bg-elevated">
              <Avatar name={user?.full_name} src={user?.avatar_url} size="sm" />
              <span className="hidden text-left sm:block">
                <span className="block max-w-[130px] truncate text-[12.5px] font-semibold leading-tight text-ink">
                  {user?.full_name}
                </span>
                <span className="block text-[10.5px] text-muted">Administrator</span>
              </span>
            </Link>
          </div>
        </div>
      </header>

      <div className="admin-shell__body flex min-w-0 flex-1 flex-col">
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:py-6">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>

        <footer className="border-t border-line px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-2 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} CampusLoop · Admin console</p>
            <div className="flex flex-wrap gap-4">
              <Link to="/settings" className="hover:text-ink">Privacy</Link>
              <Link to="/settings" className="hover:text-ink">Terms</Link>
              <Link to="/marketplace" className="hover:text-ink">Marketplace</Link>
            </div>
          </div>
        </footer>
      </div>

      {/* Remount per route so the swipe-up entry replays on every section. */}
      <div key={pathname}>
        <AdminBottomBar />
      </div>
    </div>
  );
}
