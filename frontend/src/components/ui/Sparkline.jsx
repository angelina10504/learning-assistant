/**
 * Tiny inline sparkline SVG for stat cards.
 * @param {number[]} data - Array of numbers (7 values ideal)
 * @param {string} color - Stroke color (default '#818cf8')
 * @param {number} width - SVG width (default 80)
 * @param {number} height - SVG height (default 28)
 */
const Sparkline = ({ data = [], color = '#818cf8', width = 80, height = 28 }) => {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - 2 - ((val - min) / range) * (height - 4);
    return `${x},${y}`;
  });

  const polyline = points.join(' ');
  const areaPath = `M0,${height} L${points.join(' L')} L${width},${height} Z`;

  // Safe gradient id — strip non-alphanum chars
  const gradId = `spark-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  const lastPt = points[points.length - 1].split(',');
  const dotX = parseFloat(lastPt[0]);
  const dotY = parseFloat(lastPt[1]);

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradId})`} />
      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle cx={dotX} cy={dotY} r={2.5} fill={color} />
    </svg>
  );
};

export default Sparkline;
