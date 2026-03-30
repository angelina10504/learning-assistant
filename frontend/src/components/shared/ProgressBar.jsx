import { motion } from 'framer-motion';

const ProgressBar = ({
  value = 0,
  max = 100,
  color = 'indigo',
  height = 'h-2',
  showLabel = false,
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  const colorClasses = {
    indigo: 'bg-indigo-500',
    cyan: 'bg-cyan-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    amber: 'bg-amber-500',
  };

  return (
    <div className="w-full">
      <div className={`w-full ${height} bg-slate-700 rounded-full overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`${colorClasses[color]} ${height} rounded-full`}
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
