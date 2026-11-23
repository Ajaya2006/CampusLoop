import { useEffect } from 'react';

const RIPPLE_SELECTOR = 'button:not(:disabled), [data-ripple]';

export default function MotionEffects() {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    const onPointerDown = (event) => {
      if (event.button !== 0) return;
      const target = event.target instanceof Element ? event.target.closest(RIPPLE_SELECTOR) : null;
      if (!target || target.closest('[data-no-ripple]')) return;
      if (target.tagName === 'BUTTON' && target.disabled) return;

      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.9;
      if (!size) return;

      /* Not a colour ripple: touching glass lights it from the point of
         contact and the glow spreads through the element, as in the
         reference. The span is a light source, so it stays a decoration. */
      const wave = document.createElement('span');
      wave.className = 'press-glow';
      wave.setAttribute('aria-hidden', 'true');
      wave.style.width = `${size}px`;
      wave.style.height = `${size}px`;
      wave.style.left = `${event.clientX - rect.left - size / 2}px`;
      wave.style.top = `${event.clientY - rect.top - size / 2}px`;

      target.classList.add('ripple-host');
      target.appendChild(wave);
      wave.addEventListener('animationend', () => wave.remove(), { once: true });
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  return null;
}
