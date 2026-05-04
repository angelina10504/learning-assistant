import { useState, useEffect, useRef } from 'react';

/**
 * Animates a number from 0 to target value when element enters viewport.
 * @param {number} end - Target number
 * @param {number} duration - Animation duration in ms (default 1200)
 * @param {number} decimals - Decimal places (default 0)
 * @returns {{ count, ref }} - Current count value and ref to attach to container
 */
const useCountUp = (end, duration = 1200, decimals = 0) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = performance.now();
          const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(parseFloat((eased * end).toFixed(decimals)));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration, decimals, hasAnimated]);

  // Reset when end value changes
  useEffect(() => {
    setHasAnimated(false);
    setCount(0);
  }, [end]);

  return { count, ref };
};

export default useCountUp;
