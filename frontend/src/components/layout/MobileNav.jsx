import { NavLink } from 'react-router-dom';
import { Home, MessageCircle, Plus, Search, User } from 'lucide-react';
import { cx } from '../../utils/format';
import useUnreadCounts from '../../hooks/useUnreadCounts';
import { useAuth } from '../../context/AuthContext';

const ICONS = { Home, Search, Plus, MessageCircle, User };

const items = [
  { to: '/', label: 'Home', icon: 'Home', end: true },
  { to: '/marketplace', label: 'Explore', icon: 'Search' },
  { to: '/sell', label: 'Sell', icon: 'Plus', primary: true },
  { to: '/messages', label: 'Chat', icon: 'MessageCircle' },
  { to: '/dashboard', label: 'Profile', icon: 'User' },
];

export default function MobileNav() {
  const { messages } = useUnreadCounts();
  const { isAuthenticated } = useAuth();

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto flex max-w-md items-end justify-around px-2 pb-1 pt-1.5">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          if (item.primary) {
            return (
              <NavLink
                key={item.to}
                to={isAuthenticated ? item.to : '/login'}
                className="-mt-4 flex flex-col items-center gap-1"
                aria-label="Sell an item"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lift transition active:scale-95">
                  <Icon size={22} />
                </span>
                <span className="text-[10.5px] font-medium text-muted">{item.label}</span>
              </NavLink>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'relative flex min-w-[54px] flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10.5px] font-medium transition',
                  isActive ? 'text-brand-600 dark:text-brand-300' : 'text-muted',
                )
              }
            >
              <Icon size={20} />
              <span>{item.label}</span>
              {item.icon === 'MessageCircle' && messages ? (
                <span className="absolute right-1.5 top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                  {messages > 9 ? '9+' : messages}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
