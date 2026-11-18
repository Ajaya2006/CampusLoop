import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Heart, LayoutDashboard, LogOut, Moon, Settings, ShieldCheck, Sun, Tag, User } from 'lucide-react';
import Logo from './Logo';
import LiquidNavigation from '../navigation/LiquidNavigation';
import Avatar from '../common/Avatar';
import GlassPopover from '../common/GlassPopover';
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

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
      <div className="mx-auto flex w-full max-w-[1360px] items-center gap-3">
        <Link to="/" className="liquid-glass-item inline-flex shrink-0 items-center rounded-2xl px-2.5 py-1.5" aria-label="CampusLoop home">
          <Logo />
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="liquid-control-cluster">
            <button
              type="button"
              onClick={toggle}
              className="liquid-control"
              aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {resolved === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {isAuthenticated ? (
              <Link
                to="/notifications"
                className="liquid-control"
                aria-label={`Notifications${notifications ? `, ${notifications} unread` : ''}`}
              >
                <Bell size={18} />
                {notifications ? (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-danger" />
                ) : null}
              </Link>
            ) : null}
          </div>

          {isAuthenticated ? (
            <>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  className="liquid-glass-item flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2"
                  onClick={() => setMenuOpen((value) => !value)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Account menu"
                >
                  <Avatar name={user?.full_name} src={user?.avatar_url} size="sm" />
                  <ChevronDown size={13} className="hidden text-muted sm:block" />
                </button>
                <GlassPopover
                  open={menuOpen}
                  anchorRef={menuRef}
                  onClose={() => setMenuOpen(false)}
                  className="w-60"
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
                      className="mt-1 flex w-full items-center gap-2.5 border-t border-line/60 px-3 pb-2 pt-3 text-sm text-danger transition hover:text-danger/80"
                    >
                      <LogOut size={16} /> Sign out
                    </button>
                </GlassPopover>
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
