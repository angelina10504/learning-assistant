/**
 * Custom Recharts tooltip with glass/blur styling matching the dark theme.
 * Usage: <Tooltip content={<GlassTooltip />} />
 *
 * For custom label formatting, pass a labelFormatter prop to Recharts Tooltip:
 * <Tooltip content={<GlassTooltip />} labelFormatter={(val) => `Week ${val}`} />
 */
const GlassTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      className="rounded-xl px-4 py-3 shadow-2xl"
      style={{
        background: 'rgba(15,23,42,0.92)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {label !== undefined && label !== null && (
        <p className="text-xs text-white/50 mb-2 font-medium">{label}</p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: entry.color || '#818cf8' }}
          />
          <span className="text-white/60">{entry.name || entry.dataKey}:</span>
          <span className="text-white font-semibold">
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            {entry.unit || ''}
          </span>
        </div>
      ))}
    </div>
  );
};

export default GlassTooltip;
