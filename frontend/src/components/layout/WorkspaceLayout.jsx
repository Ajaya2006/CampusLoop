import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell,
  HandCoins,
  Heart,
  LogOut,
  Mail,
  MoreHorizontal,
  Moon,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Tag,
  User,
} from 'lucide-react';
import Logo from './Logo';
import PageTransition from './PageTransition';
import LiquidNavigation from '../navigation/LiquidNavigation';
import Avatar from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import useUnreadCounts from '../../hooks/useUnreadCounts';
import { cx } from '../../utils/format';

const MORE_LINKS = [
  { to: '/my-listings', label: 'My listings', icon: Tag },
  { to: '/offers', label: 'Offers', icon: HandCoins },
  { to: '/transactions', label: 'Transactions', icon: ReceiptText },
  { to: '/meetings', label: 'Meetings', icon: Mail },
  { to: '/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function WorkspaceLayout() {
  const { user, isAdmin, logout } = useAuth();
  const { resolved, toggle } = useTheme();
  const { notifications } = useUnreadCounts();
  const [query, setQuery] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (event) => {
      if (moreRef.current && !moreRef.current.contains(event.target)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const search = (event) => {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/marketplace?q=${encodeURIComponent(value)}` : '/marketplace');
  };

  const signOut = async () => {
    await logout();
    setMoreOpen(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
        <div className="mx-auto flex w-full max-w-[1440px] items-center gap-2 sm:gap-3">
          <Link
            to="/marketplace"
            className="liquid-glass-item inline-flex shrink-0 items-center rounded-2xl px-2 py-1.5"
            aria-label="CampusLoop marketplace"
          >
            <span className="hidden sm:block">
              <Logo />
            </span>
            <span className="sm:hidden">
              <Logo compact />
            </span>
          </Link>

          <form onSubmit={search} className="relative ml-auto hidden w-full max-w-[240px] xl:block">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the marketplace"
              className="liquid-glass-field h-9 w-full pl-9 pr-9 text-[12.5px] text-ink placeholder:text-muted focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              aria-label="Search the marketplace"
            />
            <SlidersHorizontal size={13} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-2 xl:ml-0">
            <div className="liquid-control-cluster">
              <button
                type="button"
                onClick={toggle}
                className="liquid-control hidden sm:inline-flex"
                aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                {resolved === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </button>

              <Link
                to="/notifications"
                className="liquid-control"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {notifications ? (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-brand-500" />
                ) : null}
              </Link>

              <div className="relative" ref={moreRef}>
                <button
                  type="button"
                  onClick={() => setMoreOpen((value) => !value)}
                  aria-haspopup="menu"
                  aria-expanded={moreOpen}
                  aria-label="More workspace links"
                  className="liquid-control"
                >
                  <MoreHorizontal size={18} />
                </button>
                {moreOpen ? (
                  <div
                    role="menu"
                    className="pop-in liquid-glass liquid-glass-dropdown absolute right-0 top-full mt-3 w-56 p-1.5"
                  >
                    {MORE_LINKS.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        role="menuitem"
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-muted transition hover:bg-elevated hover:text-ink"
                      >
                        <item.icon size={15} /> {item.label}
                      </Link>
                    ))}
                    {isAdmin ? (
                      <Link
                        to="/admin"
                        role="menuitem"
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-muted transition hover:bg-elevated hover:text-ink"
                      >
                        <ShieldCheck size={15} /> Admin panel
                      </Link>
                    ) : null}
                    {user?.verification_status !== 'verified' ? (
                      <Link
                        to="/verify"
                        role="menuitem"
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-warning transition hover:bg-warning/10"
                      >
                        <ShieldCheck size={15} /> Verify student account
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={signOut}
                      className="mt-1 flex w-full items-center gap-2.5 border-t border-line/60 px-3 pb-2 pt-3 text-[13px] text-danger transition hover:text-danger/80"
                    >
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <Link
              to="/profile"
              className={cx('liquid-glass-item flex items-center gap-2 rounded-full py-1 pl-1 pr-1 xl:pr-2.5')}
              aria-label="Your profile"
            >
              <Avatar name={user?.full_name} src={user?.avatar_url} size="sm" />
              <span className="hidden text-left xl:block">
                <span className="block max-w-[110px] truncate text-[12px] font-semibold leading-tight text-ink">
                  {user?.full_name}
                </span>
                <span className="block text-[10px] text-muted">
                  {user?.role === 'admin' ? 'Admin' : <User size={10} className="inline" />} Student
                </span>
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] min-w-0 px-4 pb-32 pt-5 sm:px-6 lg:pb-32 lg:pt-6">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      <footer className="mx-auto w-full max-w-[1440px] px-4 pb-32 sm:px-6">
        <div className="flex flex-col gap-2 border-t border-line pt-4 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CampusLoop · Academic project</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/settings" className="hover:text-ink">Privacy</Link>
            <Link to="/settings" className="hover:text-ink">Terms</Link>
            <Link to="/marketplace" className="hover:text-ink">Marketplace</Link>
          </div>
        </div>
      </footer>

      <LiquidNavigation />
    </div>
  );
}
