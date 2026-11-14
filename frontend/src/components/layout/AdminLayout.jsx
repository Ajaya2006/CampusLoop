import { useLayoutEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ChevronRight,
  Flag,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PackageSearch,
  ReceiptText,
  ShieldCheck,
  Store,
  Sun,
  Tag,
  Users,
  X,
} from 'lucide-react';
import Logo from './Logo';
import PageTransition from './PageTransition';
import Avatar from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import useUnreadCounts from '../../hooks/useUnreadCounts';
import { cx } from '../../utils/format';
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

function Sidebar({ onNavigate }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[74px] items-center px-5">
        <Logo />
      </div>
      <div className="px-4 pb-3">
        <p className="admin-console-badge rounded-[7px] bg-brand-50 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
          Admin console
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4" aria-label="Admin">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cx(
                'group flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-[13px] font-medium transition',
                isActive
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-ink/75 hover:bg-elevated hover:text-ink',
              )
            }
          >
            <link.icon size={17} strokeWidth={1.8} className="shrink-0" />
            <span className="flex-1">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-line p-3">
        <Link
          to="/marketplace"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-[12.5px] font-medium text-muted transition hover:bg-elevated hover:text-ink"
        >
          <Store size={16} /> Back to marketplace
          <ChevronRight size={13} className="ml-auto" />
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-[9px] px-3 py-2.5 text-left text-[12.5px] font-medium text-muted transition hover:bg-elevated hover:text-ink"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { user } = useAuth();
  const { resolved, toggle } = useTheme();
  const { notifications } = useUnreadCounts();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useLayoutEffect(() => {
    document.body.classList.add('admin-mode');
    return () => document.body.classList.remove('admin-mode');
  }, []);

  return (
    <div className="admin-shell min-h-screen bg-canvas lg:grid lg:grid-cols-[236px_1fr]">
      <aside className="admin-sidebar sticky top-0 hidden h-screen border-r border-line bg-surface lg:block">
        <Sidebar />
      </aside>

      <div
        className={cx('drawer-shell fixed inset-0 z-50 lg:hidden', drawerOpen && 'drawer-open')}
        aria-hidden={!drawerOpen}
      >
        <button
          type="button"
          data-no-ripple
          className="drawer-backdrop absolute inset-0"
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
          tabIndex={-1}
        />
        <aside className="admin-sidebar drawer-panel absolute inset-y-0 left-0 w-[270px] bg-surface shadow-lift">
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="absolute right-3 top-4 rounded-lg p-2 text-muted hover:bg-elevated hover:text-ink"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
          <Sidebar onNavigate={() => setDrawerOpen(false)} />
        </aside>
      </div>

      <div className="flex min-w-0 flex-col">
        <header className="admin-topbar sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur-md">
          <div className="flex h-[74px] items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-lg p-2 text-muted hover:bg-elevated hover:text-ink lg:hidden"
              aria-label="Open admin menu"
            >
              <Menu size={20} />
            </button>
            <div className="lg:hidden">
              <Logo compact />
            </div>

            <p className="ml-auto hidden text-[11.5px] text-muted md:block">
              Moderating as <span className="font-semibold text-ink">{user?.full_name}</span>
            </p>

            <div className="ml-auto flex items-center gap-1 md:ml-3">
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
    </div>
  );
}
