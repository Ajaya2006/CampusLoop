import { useCallback, useEffect, useRef, useState } from 'react';
import { websocketUrl } from '../services/api';

/**
 * Reconnecting chat socket. The server authorises every connection, so an
 * expired token simply fails to connect and we fall back to REST polling.
 */
export default function useChatSocket(conversationId, { onEvent, enabled = true } = {}) {
  const [status, setStatus] = useState('idle');
  const socketRef = useRef(null);
  const retryRef = useRef(0);
  const closedRef = useRef(false);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  const connect = useCallback(() => {
    if (!conversationId || !enabled) return;
    setStatus('connecting');
    try {
      const socket = new WebSocket(websocketUrl(conversationId));
      socketRef.current = socket;

      socket.onopen = () => {
        retryRef.current = 0;
        setStatus('open');
      };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          handlerRef.current?.(payload);
        } catch {
          /* ignore malformed frames */
        }
      };
      socket.onclose = (event) => {
        if (closedRef.current) return;
        setStatus('closed');
        if (event.code === 4401 || event.code === 4403 || event.code === 4404) return;
        const delay = Math.min(8000, 800 * 2 ** retryRef.current);
        retryRef.current += 1;
        setTimeout(() => {
          if (!closedRef.current) connect();
        }, delay);
      };
      socket.onerror = () => setStatus('error');
    } catch {
      setStatus('error');
    }
  }, [conversationId, enabled]);

  useEffect(() => {
    closedRef.current = false;
    connect();
    return () => {
      closedRef.current = true;
      socketRef.current?.close();
      socketRef.current = null;
      setStatus('idle');
    };
  }, [connect]);

  const send = useCallback((payload) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  return { status, send, reconnect: connect };
}
