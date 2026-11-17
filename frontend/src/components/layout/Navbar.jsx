import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Heart, LayoutDashboard, LogOut, Moon, Settings, ShieldCheck, Sun, Tag, User } from 'lucide-react';
import Logo from './Logo';
import LiquidNavigation from '../navigation/LiquidNavigation';
import Avatar from '../common/Avatar';
import { buttonStyles } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import useUnreadCounts from '../../hooks/useUnreadCounts';
import { cx } from '../../utils/format';

/** Public header: floating glass capsule with the shared liquid navigation. */
export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { resolved, toggle } = useTheme();
  const { notifications } = useUnreadCounts();
  const [menuOpen, setMenuOpen] = useState(false);
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
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
      <div className="liquid-glass liquid-glass-nav mx-auto flex w-full max-w-[1360px] items-center gap-3 px-3 py-2">
        <Link to="/" className="shrink-0" aria-label="CampusLoop home">
          <Logo />
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={toggle}
            className="rounded-full p-2 text-muted transition hover:bg-elevated hover:text-ink"
            aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {resolved === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {isAuthenticated ? (
            <>
              <Link
                to="/notifications"
                className="relative rounded-full p-2 text-muted transition hover:bg-elevated hover:text-ink"
                aria-label={`Notifications${notifications ? `, ${notifications} unread` : ''}`}
              >
                <Bell size={18} />
                {notifications ? (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-danger ring-2 ring-surface" />
                ) : null}
              </Link>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-full p-1 transition hover:bg-elevated"
                  onClick={() => setMenuOpen((value) => !value)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Account menu"
                >
                  <Avatar name={user?.full_name} src={user?.avatar_url} size="sm" />
                  <ChevronDown size={13} className="hidden text-muted sm:block" />
                </button>
                {menuOpen ? (
                  <div
                    role="menu"
                    className="pop-in liquid-glass liquid-glass-dropdown absolute right-0 mt-2 w-60 p-1.5"
                  >
                    <div className="border-b border-line/60 px-3 py-2.5">
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
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-elevated hover:text-ink"
                      >
                        <item.icon size={16} /> {item.label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="mt-1 flex w-full items-center gap-2.5 rounded-xl border-t border-line/60 px-3 py-2 text-sm text-danger transition hover:bg-danger/5"
                    >
                      <LogOut size={16} /> Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <Link to="/login" className={cx(buttonStyles({ variant: 'secondary', size: 'sm' }), 'ml-1')}>
              Sign in
            </Link>
          )}
        </div>
      </div>

      <LiquidNavigation />
    </header>
  );
}
