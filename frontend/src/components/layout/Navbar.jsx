import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Plus,
  Settings,
  ShieldCheck,
  Sun,
  Tag,
  User,
  X,
} from 'lucide-react';
import Logo from './Logo';
import Avatar from '../common/Avatar';
import Button, { buttonStyles } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import useUnreadCounts from '../../hooks/useUnreadCounts';
import { NAV_LINKS, WORKSPACE_LINKS } from '../../constants';
import { cx } from '../../utils/format';

function CountDot({ count }) {
  if (!count) return null;
  return (
    <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
      {count > 9 ? '9+' : count}
    </span>
  );
}

const navLinkClass = ({ isActive }) =>
  cx(
    'relative rounded-control px-3 py-2 text-sm font-medium transition',
    isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200' : 'text-muted hover:bg-elevated hover:text-ink',
  );

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { resolved, toggle } = useTheme();
  const { notifications, messages } = useUnreadCounts();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    setMobileOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-surface/90 backdrop-blur-md">
      <div className="page-wrap flex h-16 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg p-2 text-muted transition hover:bg-elevated hover:text-ink lg:hidden"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Logo />
        </div>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}
          {isAuthenticated ? (
            <>
              <NavLink to="/messages" className={navLinkClass}>
                <span className="flex items-center gap-1.5">
                  Messages
                  {messages ? (
                    <span className="rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">{messages}</span>
                  ) : null}
                </span>
              </NavLink>
              <NavLink to="/my-listings" className={navLinkClass}>
                My Listings
              </NavLink>
            </>
          ) : null}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggle}
            className="hidden rounded-control p-2.5 text-muted transition hover:bg-elevated hover:text-ink sm:inline-flex"
            aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {isAuthenticated ? (
            <>
              <Link
                to="/notifications"
                className="relative rounded-control p-2.5 text-muted transition hover:bg-elevated hover:text-ink"
                aria-label={`Notifications${notifications ? `, ${notifications} unread` : ''}`}
              >
                <Bell size={19} />
                <CountDot count={notifications} />
              </Link>
              <Link
                to="/messages"
                className="relative rounded-control p-2.5 text-muted transition hover:bg-elevated hover:text-ink lg:hidden"
                aria-label={`Messages${messages ? `, ${messages} unread` : ''}`}
              >
                <MessageCircle size={19} />
                <CountDot count={messages} />
              </Link>
            </>
          ) : null}

          <Link to={isAuthenticated ? '/sell' : '/login'} className={cx(buttonStyles({ size: 'sm' }), 'hidden sm:inline-flex')}>
            <Plus size={16} /> Sell Item
          </Link>

          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-control p-1 transition hover:bg-elevated"
                onClick={() => setMenuOpen((value) => !value)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
              >
                <Avatar name={user?.full_name} src={user?.avatar_url} size="sm" />
                <ChevronDown size={14} className="hidden text-muted sm:block" />
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="pop-in absolute right-0 mt-2 w-60 overflow-hidden rounded-card border border-line bg-surface/95 p-1.5 shadow-lift backdrop-blur-xl"
                >
                  <div className="border-b border-line px-3 py-2.5">
                    <p className="truncate text-sm font-semibold text-ink">{user?.full_name}</p>
                    <p className="truncate text-xs text-muted">{user?.email}</p>
                  </div>
                  {[
                    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
                    { to: '/profile', label: 'My profile', icon: User },
                    { to: '/my-listings', label: 'My listings', icon: Tag },
                    { to: '/wishlist', label: 'Wishlist', icon: Heart },
                    { to: '/settings', label: 'Settings', icon: Settings },
                    ...(isAdmin ? [{ to: '/admin', label: 'Admin panel', icon: ShieldCheck }] : []),
                  ].map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-control px-3 py-2 text-sm text-muted transition hover:bg-elevated hover:text-ink"
                    >
                      <item.icon size={16} /> {item.label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="mt-1 flex w-full items-center gap-2.5 rounded-control border-t border-line px-3 py-2 text-sm text-danger transition hover:bg-danger/5"
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link to="/login" className={cx(buttonStyles({ variant: 'secondary', size: 'sm' }))}>
              Sign in
            </Link>
          )}
        </div>
      </div>

      {mobileOpen ? (
        <div className="pop-in origin-top border-t border-line bg-surface/95 px-4 pb-4 pt-2 backdrop-blur-xl lg:hidden">
          <div className="flex flex-col gap-1">
            {[...NAV_LINKS, ...(isAuthenticated ? WORKSPACE_LINKS : [])].map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMobileOpen(false)}
                className={navLinkClass}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={toggle} icon={resolved === 'dark' ? Sun : Moon}>
              {resolved === 'dark' ? 'Light' : 'Dark'} theme
            </Button>
            {isAuthenticated ? (
              <Button variant="secondary" size="sm" onClick={handleLogout} icon={LogOut}>
                Sign out
              </Button>
            ) : (
              <Link to="/register" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                Create account
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
