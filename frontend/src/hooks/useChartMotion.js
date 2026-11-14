import { useEffect, useRef, useState } from 'react';

/**
 * Chart animations in this app are CSS keyframes, so they only play once, on
 * the element's first mount. Data usually arrives in a later commit than that
 * mount (and switching the period re-uses the same DOM), so by the time the
 * bars carry real values the animation has already finished and the chart
 * looks static. Bumping a key whenever the data signature changes remounts the
 * chart body, which makes the keyframes run again for the numbers on screen.
 */
export function useReplayKey(signature) {
  const [replay, setReplay] = useState(0);
  const previous = useRef(signature);

  useEffect(() => {
    if (previous.current === signature) return;
    previous.current = signature;
    setReplay((value) => value + 1);
  }, [signature]);

  return replay;
}

function reducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Counts a number up from its current value to the new one, so KPI figures and
 * donut totals animate instead of snapping to the final value.
 */
export function useCountUp(value, { duration = 720, delay = 0 } = {}) {
  const target = Number.isFinite(Number(value)) ? Number(value) : 0;
  const [display, setDisplay] = useState(() => (reducedMotion() ? target : 0));
  const displayRef = useRef(display);
  displayRef.current = display;

  useEffect(() => {
    if (reducedMotion()) {
      displayRef.current = target;
      setDisplay(target);
      return undefined;
    }

    const from = displayRef.current;
    if (from === target) return undefined;

    const handle = { frame: 0 };
    const start = performance.now() + delay;

    const tick = (now) => {
      const progress = duration > 0 ? Math.min(1, Math.max(0, (now - start) / duration)) : 1;
      const eased = 1 - (1 - progress) ** 3;
      const next = from + (target - from) * eased;
      displayRef.current = next;
      setDisplay(next);
      if (progress < 1) handle.frame = requestAnimationFrame(tick);
    };

    handle.frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle.frame);
  }, [target, duration, delay]);

  return display;
}
