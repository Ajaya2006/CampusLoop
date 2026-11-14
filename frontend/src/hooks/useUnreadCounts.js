import { useCallback, useEffect, useState } from 'react';
import { chatService, notificationService } from '../services';
import { useAuth } from '../context/AuthContext';

/** Polls unread counters. Cheap enough for a demo; the chat socket updates live. */
export default function useUnreadCounts(intervalMs = 30000) {
  const { isAuthenticated } = useAuth();
  const [counts, setCounts] = useState({ messages: 0, notifications: 0 });

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [messages, notifications] = await Promise.all([
        chatService.unreadCount().catch(() => 0),
        notificationService.unreadCount().catch(() => 0),
      ]);
      setCounts({ messages, notifications });
    } catch {
      /* silent */
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setCounts({ messages: 0, notifications: 0 });
      return undefined;
    }
    refresh();
    const timer = setInterval(refresh, intervalMs);
    const onRefresh = () => refresh();
    window.addEventListener('campusloop:refresh-counts', onRefresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('campusloop:refresh-counts', onRefresh);
    };
  }, [isAuthenticated, refresh, intervalMs]);

  return { ...counts, refresh };
}
