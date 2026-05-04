import { useState, useEffect, useRef } from 'react';

/**
 * Animated circular progress ring for mastery percentage.
 * @param {number} percentage - 0-100
 * @param {number} size - SVG size in px (default 120)
 * @param {number} strokeWidth - Ring thickness (default 8)
 * @param {string} label - Text below the number (default "Overall Mastery")
 */
const MasteryRing = ({ percentage = 0, size = 120, strokeWidth = 8, label = 'Overall Mastery' }) => {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef(null);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedPercent / 100) * circumference;

  // Determine color based on mastery tier
  const getColor = (pct) => {
    if (pct >= 80) return { stroke: '#34d399', glow: 'rgba(52,211,153,0.3)', text: 'text-emerald-400', tier: 'Mastered' };
    if (pct >= 60) return { stroke: '#818cf8', glow: 'rgba(129,140,248,0.3)', text: 'text-indigo-400', tier: 'Proficient' };
    if (pct >= 40) return { stroke: '#fbbf24', glow: 'rgba(251,191,36,0.3)', text: 'text-amber-400', tier: 'Developing' };
    return { stroke: '#f87171', glow: 'rgba(248,113,113,0.3)', text: 'text-red-400', tier: 'Emerging' };
  };

  const colorInfo = getColor(percentage);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 1500;
          const startTime = performance.now();
          const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setAnimatedPercent(Math.round(eased * percentage));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [percentage, hasAnimated]);

  // Reset when percentage changes
  useEffect(() => {
    setHasAnimated(false);
    setAnimatedPercent(0);
  }, [percentage]);

  return (
    <div ref={ref} className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Animated foreground ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colorInfo.stroke}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 0.1s ease-out',
              filter: `drop-shadow(0 0 6px ${colorInfo.glow})`,
            }}
          />
        </svg>
        {/* Center text — rotate back to upright since SVG is rotated -90deg */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${colorInfo.text}`}>{animatedPercent}%</span>
          <span className="text-[10px] text-white/40 font-medium">{colorInfo.tier}</span>
        </div>
      </div>
      <span className="text-xs text-white/50 font-medium">{label}</span>
    </div>
  );
};

export default MasteryRing;
