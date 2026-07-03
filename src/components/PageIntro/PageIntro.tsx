import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

// Pre-computed star field — deterministic, no Math.random()
const STARS = Array.from({ length: 55 }, (_, i) => ({
  x: `${((i * 61 + 13) % 97) + 1}%`,
  y: `${((i * 41 + 7) % 93) + 2}%`,
  size: (i % 3) + 1,
  opacity: 0.06 + (i % 6) * 0.05,
}));

const APP_CHARS = 'BalkanExplorer'.split('');

interface PageIntroProps {
  onComplete: () => void;
}

const PageIntro: React.FC<PageIntroProps> = ({ onComplete }) => {
  const [exiting, setExiting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Respect reduced-motion preference — skip instantly
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onComplete();
      return;
    }
    const t1 = window.setTimeout(() => setExiting(true), 2900);
    const t2 = window.setTimeout(() => { setDone(true); onComplete(); }, 3700);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [onComplete]);

  if (done) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #070d1c 0%, #0a1830 58%, #05101e 100%)' }}
      animate={exiting ? { y: '-100%' } : { y: '0%' }}
      transition={exiting ? { duration: 0.9, ease: [0.76, 0, 0.24, 1] } : { duration: 0 }}
    >
      {/* ── Star field ─────────────────────────────────────────────── */}
      {STARS.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{ left: s.x, top: s.y, width: s.size, height: s.size, opacity: s.opacity }}
        />
      ))}

      {/* ── Globe SVG ──────────────────────────────────────────────── */}
      <svg
        width="190"
        height="190"
        viewBox="-95 -95 190 190"
        className="mb-10 pointer-events-none"
        style={{ filter: 'drop-shadow(0 0 32px rgba(14,165,233,0.20))' }}
        aria-hidden="true"
      >
        {/* Ambient fill */}
        <motion.circle
          cx={0} cy={0} r={75}
          fill="rgba(14,165,233,0.04)"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />

        {/* Outer globe circle */}
        <motion.circle
          cx={0} cy={0} r={70}
          fill="none"
          stroke="#0ea5e9"
          strokeWidth={1.6}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.9 }}
          transition={{ duration: 1.15, ease: 'easeOut', delay: 0.15 }}
        />

        {/* Equator */}
        <motion.ellipse
          cx={0} cy={0} rx={70} ry={24}
          fill="none"
          stroke="#38bdf8"
          strokeWidth={1}
          strokeDasharray="5 4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.55 }}
          transition={{ duration: 0.95, ease: 'easeOut', delay: 0.3 }}
        />

        {/* Upper latitude */}
        <motion.ellipse
          cx={0} cy={-38} rx={57} ry={19}
          fill="none"
          stroke="#38bdf8"
          strokeWidth={0.8}
          strokeDasharray="3 5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.38 }}
          transition={{ duration: 0.85, ease: 'easeOut', delay: 0.45 }}
        />

        {/* Lower latitude */}
        <motion.ellipse
          cx={0} cy={38} rx={57} ry={19}
          fill="none"
          stroke="#38bdf8"
          strokeWidth={0.8}
          strokeDasharray="3 5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.38 }}
          transition={{ duration: 0.85, ease: 'easeOut', delay: 0.45 }}
        />

        {/* Central meridian */}
        <motion.ellipse
          cx={0} cy={0} rx={24} ry={70}
          fill="none"
          stroke="#0ea5e9"
          strokeWidth={0.9}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.45 }}
          transition={{ duration: 1.05, ease: 'easeOut', delay: 0.4 }}
        />

        {/* Tilted meridian A */}
        <motion.ellipse
          cx={0} cy={0} rx={24} ry={70}
          fill="none"
          stroke="#0ea5e9"
          strokeWidth={0.7}
          transform="rotate(55)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.32 }}
          transition={{ duration: 1.0, ease: 'easeOut', delay: 0.55 }}
        />

        {/* Tilted meridian B */}
        <motion.ellipse
          cx={0} cy={0} rx={24} ry={70}
          fill="none"
          stroke="#0ea5e9"
          strokeWidth={0.7}
          transform="rotate(-55)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.32 }}
          transition={{ duration: 1.0, ease: 'easeOut', delay: 0.7 }}
        />

        {/* Flight arc across the globe */}
        <motion.path
          d="M -60 -18 Q -28 -72 0 -8 Q 28 52 60 28"
          fill="none"
          stroke="#38bdf8"
          strokeWidth={1.3}
          strokeDasharray="5 4"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.75 }}
          transition={{ delay: 0.95, duration: 1.15, ease: 'easeInOut' }}
        />

        {/* Airplane body at start of arc */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.95, duration: 0.25 }}
        >
          <g transform="translate(-60,-18) rotate(-42)">
            <path
              d="M0,-5.5 L2.5,0 L8.5,1.5 L2.5,2.2 L2.5,5.5 L4,6.5 L0,5.5 L-4,6.5 L-2.5,5.5 L-2.5,2.2 L-8.5,1.5 L-2.5,0 Z"
              fill="#38bdf8"
            />
          </g>
        </motion.g>

        {/* Destination marker where the arc lands */}
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.9, duration: 0.45, type: 'spring', stiffness: 380, damping: 22 }}
          style={{ originX: '0px', originY: '-8px' }}
        >
          {/* Ripple */}
          <motion.circle
            cx={0} cy={-8} r={7}
            fill="none"
            stroke="#0ea5e9"
            strokeWidth={1.2}
            initial={{ scale: 1, opacity: 0.9 }}
            animate={{ scale: 3.2, opacity: 0 }}
            transition={{ delay: 2.1, duration: 1.1, repeat: Infinity, repeatDelay: 0.4 }}
          />
          {/* Pin */}
          <circle cx={0} cy={-8} r={5} fill="#0ea5e9" />
          <circle cx={0} cy={-8} r={2.2} fill="#fff" />
        </motion.g>
      </svg>

      {/* ── App name — staggered clip reveal ───────────────────────── */}
      <div className="flex overflow-hidden" role="heading" aria-level={1} aria-label="BalkanExplorer">
        {APP_CHARS.map((char, i) => (
          <motion.span
            key={i}
            className="text-5xl font-bold text-white tracking-widest"
            style={{ display: 'inline-block' }}
            initial={{ y: '120%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            transition={{
              delay: 0.8 + i * 0.048,
              duration: 0.55,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {char}
          </motion.span>
        ))}
      </div>

      {/* ── Tagline ────────────────────────────────────────────────── */}
      <motion.p
        className="mt-4 text-xs tracking-[0.35em] uppercase font-light"
        style={{ color: '#38bdf8', letterSpacing: '0.35em' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.65, duration: 0.75, ease: 'easeOut' }}
      >
        Discover the Hidden Balkans
      </motion.p>

      {/* ── Progress bar at bottom ─────────────────────────────────── */}
      <motion.div
        className="absolute bottom-0 left-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, #0ea5e9 0%, #6366f1 50%, #0ea5e9 100%)' }}
        initial={{ width: '0%' }}
        animate={{ width: '100%' }}
        transition={{ duration: 2.8, ease: 'linear', delay: 0.1 }}
      />
    </motion.div>
  );
};

export default PageIntro;
