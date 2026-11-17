import { Compass, Home, MessageCircle, Plus, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useUnreadCounts from '../../hooks/useUnreadCounts';
import LiquidNavigationDesktop from './LiquidNavigationDesktop';
import LiquidNavigationMobile from './LiquidNavigationMobile';

/* One configuration drives both layouts, so the desktop capsule and the mobile
   bottom bar can never disagree about a destination or the active item. */
const NAV_ITEMS = [
  { key: 'home', to: '/', label: 'Home', icon: Home, matches: (path) => path === '/' },
  {
    key: 'explore',
    to: '/marketplace',
    label: 'Explore',
    icon: Compass,
    matches: (path) => ['/marketplace', '/categories', '/product', '/seller'].some((base) => path === base || path.startsWith(`${base}/`)),
  },
  { key: 'sell', to: '/sell', label: 'Sell', icon: Plus, requiresAuth: true, matches: (path) => path.startsWith('/sell') },
  {
    key: 'chats',
    to: '/messages',
    label: 'Chats',
    icon: MessageCircle,
    requiresAuth: true,
    matches: (path) => path.startsWith('/messages'),
  },
  {
    key: 'profile',
    to: '/profile',
    label: 'Profile',
    icon: User,
    requiresAuth: true,
    matches: (path) =>
      ['/profile', '/dashboard', '/settings', '/my-listings', '/wishlist', '/offers', '/meetings', '/transactions', '/notifications', '/verify'].some(
        (base) => path === base || path.startsWith(`${base}/`),
      ),
  },
];

export function useMainNavigation() {
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();
  const { messages } = useUnreadCounts();

  const items = NAV_ITEMS.map((item) => ({
    ...item,
    to: item.requiresAuth && !isAuthenticated ? '/login' : item.to,
    badge: item.key === 'chats' ? messages : 0,
  }));

  const found = NAV_ITEMS.findIndex((item) => item.matches(pathname));
  const activeIndex = found === -1 ? 0 : found;

  return { items, activeIndex };
}

export default function LiquidNavigation() {
  const { items, activeIndex } = useMainNavigation();

  return (
    <>
      <LiquidNavigationDesktop items={items} activeIndex={activeIndex} />
      <LiquidNavigationMobile items={items} activeIndex={activeIndex} />
    </>
  );
}
