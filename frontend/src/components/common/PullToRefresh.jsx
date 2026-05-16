import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 80;   // px to pull before triggering refresh
const MAX_PULL  = 110;  // px max visual stretch

export default function PullToRefresh({ scrollContainerRef }) {
  const [pullY, setPullY]       = useState(0);   // 0–MAX_PULL
  const [phase, setPhase]       = useState('idle'); // idle | pulling | ready | refreshing
  const touchStartY              = useRef(0);
  const isPulling                = useRef(false);

  useEffect(() => {
    const el = scrollContainerRef?.current;
    if (!el) return;

    const onTouchStart = (e) => {
      // Only activate when the container is scrolled to the very top
      if (el.scrollTop > 2) return;
      touchStartY.current = e.touches[0].clientY;
      isPulling.current   = true;
    };

    const onTouchMove = (e) => {
      if (!isPulling.current) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta <= 0) {
        // Scrolling up — cancel pull
        isPulling.current = false;
        setPullY(0);
        setPhase('idle');
        return;
      }
      // Prevent native scroll while pulling down
      if (el.scrollTop === 0) e.preventDefault();

      const clamped = Math.min(delta * 0.5, MAX_PULL); // rubber-band damping
      setPullY(clamped);
      setPhase(clamped >= THRESHOLD ? 'ready' : 'pulling');
    };

    const onTouchEnd = () => {
      if (!isPulling.current) return;
      isPulling.current = false;

      if (phase === 'ready' || pullY >= THRESHOLD) {
        setPhase('refreshing');
        setPullY(52); // hold spinner in place
        // Small delay so user sees the spinner, then reload
        setTimeout(() => window.location.reload(), 500);
      } else {
        // Snap back
        setPullY(0);
        setPhase('idle');
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false });
    el.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, [scrollContainerRef, phase, pullY]);

  if (phase === 'idle') return null;

  const progress = Math.min(pullY / THRESHOLD, 1); // 0–1
  const isReady  = phase === 'ready' || phase === 'refreshing';

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      height: pullY,
      overflow: 'hidden',
      pointerEvents: 'none',
      transition: phase === 'refreshing' ? 'none' : 'none',
    }}>
      <div style={{
        width: 36,
        height: 36,
        marginBottom: 8,
        borderRadius: '50%',
        background: 'var(--c-surface)',
        border: '1px solid var(--c-border)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: progress,
        transform: `scale(${0.6 + 0.4 * progress})`,
        transition: 'transform 0.1s ease',
      }}>
        {phase === 'refreshing' ? (
          /* Spinning circle when refreshing */
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ animation: 'ptr-spin 0.7s linear infinite' }}>
            <circle cx="9" cy="9" r="7" fill="none" stroke="var(--c-primary)" strokeWidth="2.5"
              strokeDasharray="30" strokeDashoffset="10" strokeLinecap="round" />
          </svg>
        ) : (
          /* Arrow that rotates as you pull */
          <svg width="16" height="16" viewBox="0 0 16 16" style={{
            transform: `rotate(${isReady ? 180 : progress * 160}deg)`,
            transition: 'transform 0.15s ease',
          }}>
            <path d="M8 2v10M4 8l4 4 4-4" stroke={isReady ? 'var(--c-primary)' : 'var(--c-text3)'}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        )}
      </div>
      <style>{`@keyframes ptr-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
