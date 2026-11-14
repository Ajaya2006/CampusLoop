import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  HandCoins,
  Heart,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Moon,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Sun,
  Tag,
  X,
} from 'lucide-react';
import Logo from './Logo';
import PageTransition from './PageTransition';
import Avatar from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import useUnreadCounts from '../../hooks/useUnreadCounts';
import { cx } from '../../utils/format';

const primaryLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/marketplace', label: 'Marketplace', icon: Store },
  { to: '/messages', label: 'Inbox', icon: Mail },
  { to: '/my-listings', label: 'My listings', icon: Tag },
  { to: '/offers', label: 'Offers', icon: HandCoins },
  { to: '/transactions', label: 'Transactions', icon: ReceiptText },
  { to: '/wishlist', label: 'Wishlist', icon: Heart },
];

function SidebarLink({ to, label, icon: Icon, count, onNavigate, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
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
      <Icon size={17} strokeWidth={1.8} className="shrink-0" />
      <span className="flex-1">{label}</span>
      {count ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-navy px-1.5 text-[10px] font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      ) : null}
    </NavLink>
  );
}

function Sidebar({ onNavigate, messages = 0 }) {
  const { user, isAdmin, logout } = useAuth();
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

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4" aria-label="Workspace">
        {primaryLinks.map((link) => (
          <SidebarLink
            key={link.to}
            {...link}
            count={link.to === '/messages' ? messages : 0}
            onNavigate={onNavigate}
          />
        ))}

        <div className="my-4 border-t border-line" />
        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Account</p>
        <SidebarLink to="/settings" label="Settings" icon={Settings} onNavigate={onNavigate} />
        {isAdmin ? <SidebarLink to="/admin" label="Admin panel" icon={ShieldCheck} onNavigate={onNavigate} /> : null}
        <button
          type="button"
          onClick={signOut}
          className="group flex w-full items-center gap-3 rounded-[9px] px-3 py-2.5 text-left text-[13px] font-medium text-ink/75 transition hover:bg-elevated hover:text-ink"
        >
          <LogOut size={17} strokeWidth={1.8} />
          Sign out
        </button>
      </nav>

      <div className="p-3">
        <div className="rounded-[14px] bg-elevated p-4">
          <p className="font-display text-[17px] font-bold leading-snug text-ink">Sell what you don’t use</p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
            Turn old books, gadgets and hostel gear into cash for the next semester.
          </p>
          <Link
            to="/sell"
            onClick={onNavigate}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-[9px] bg-brand-500 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-600"
          >
            <Plus size={14} /> Create a listing
          </Link>
        </div>
        {user?.verification_status !== 'verified' ? (
          <Link
            to="/verify"
            onClick={onNavigate}
            className="mt-2 flex items-center gap-2 rounded-[10px] border border-warning/25 bg-warning/5 px-3 py-2.5 text-[11.5px] font-medium text-warning"
          >
            <ShieldCheck size={14} /> Verify your student account
            <ArrowRight size={13} className="ml-auto" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default function WorkspaceLayout() {
  const { user } = useAuth();
  const { resolved, toggle } = useTheme();
  const { notifications, messages } = useUnreadCounts();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const search = (event) => {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/marketplace?q=${encodeURIComponent(value)}` : '/marketplace');
  };

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[236px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-line bg-surface lg:block">
        <Sidebar messages={messages} />
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
        <aside className="drawer-panel absolute inset-y-0 left-0 w-[270px] bg-surface shadow-lift">
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="absolute right-3 top-4 rounded-lg p-2 text-muted hover:bg-elevated hover:text-ink"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
          <Sidebar messages={messages} onNavigate={() => setDrawerOpen(false)} />
        </aside>
      </div>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur-md">
          <div className="flex h-[74px] items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-lg p-2 text-muted hover:bg-elevated hover:text-ink lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="lg:hidden">
              <Logo compact />
            </div>

            <form onSubmit={search} className="relative ml-auto hidden w-full max-w-[320px] sm:block">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the marketplace"
                className="h-10 w-full rounded-[9px] border border-line bg-surface pl-10 pr-10 text-[13px] text-ink placeholder:text-muted focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
                aria-label="Search the marketplace"
              />
              <SlidersHorizontal size={14} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
            </form>

            <div className="ml-auto flex items-center gap-1 sm:ml-2">
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
                <span className="hidden text-left md:block">
                  <span className="block max-w-[120px] truncate text-[12.5px] font-semibold leading-tight text-ink">
                    {user?.full_name}
                  </span>
                  <span className="block text-[10.5px] text-muted">{user?.role === 'admin' ? 'Admin' : 'Student'}</span>
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
            <p>© {new Date().getFullYear()} CampusLoop · Academic project</p>
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
