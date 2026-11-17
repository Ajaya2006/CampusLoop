import { useEffect, useState } from 'react';

const QUERY = '(min-width: 768px)';

/** Tracks the desktop/mobile navigation breakpoint without listening to every resize. */
export default function useResponsiveNavigation() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia?.(QUERY).matches ?? true,
  );

  useEffect(() => {
    const media = window.matchMedia?.(QUERY);
    if (!media) return undefined;
    const onChange = (event) => setIsDesktop(event.matches);
    setIsDesktop(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return { isDesktop, isMobile: !isDesktop };
}
