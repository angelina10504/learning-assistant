const Badge = ({ children, color = 'indigo', className = '', onClick }) => {
  const colorClasses = {
    indigo: 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30',
    green: 'bg-green-500/20 text-green-200 border border-green-500/30',
    red: 'bg-red-500/20 text-red-200 border border-red-500/30',
    amber: 'bg-amber-500/20 text-amber-200 border border-amber-500/30',
    slate: 'bg-slate-700 text-slate-200 border border-slate-600',
  };

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
        colorClasses[color] || colorClasses.indigo
      } ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
