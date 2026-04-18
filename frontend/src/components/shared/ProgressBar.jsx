import { motion } from 'framer-motion';

const ProgressBar = ({
  value = 0,
  max = 100,
  color = 'indigo',
  height = 'h-2',
  showLabel = false,
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  // Gradient for default/indigo/green; solid for red/amber
  const fillClass = {
    indigo: '',
    cyan: '',
    green: '',
    red: 'bg-red-500',
    amber: 'bg-amber-500',
  };

  const fillStyle = {
    indigo: { background: 'linear-gradient(90deg, #6366f1, #22d3ee)' },
    cyan:   { background: 'linear-gradient(90deg, #22d3ee, #6366f1)' },
    green:  { background: 'linear-gradient(90deg, #34d399, #22d3ee)' },
    red:    {},
    amber:  {},
  };

  return (
    <div className="w-full">
      <div className={`w-full ${height} bg-white/[0.06] rounded-full overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`${fillClass[color] || ''} ${height} rounded-full`}
          style={fillStyle[color] || fillStyle.indigo}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-xs text-slate-400">
          {value} / {max} ({Math.round(percentage)}%)
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
