import { forwardRef } from 'react';

const variants = {
  primary: 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent',
  secondary: 'text-slate-200 border-white/[0.1] hover:border-white/[0.2] hover:bg-white/[0.05]',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20',
  ghost: 'bg-transparent hover:bg-white/[0.05] text-slate-300 border-transparent',
};

const Button = forwardRef(({
  variant = 'primary',
  loading = false,
  disabled = false,
  children,
  className = '',
  ...props
}, ref) => {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
        border transition-all duration-200
        hover:scale-[1.02] active:scale-[0.98]
        disabled:opacity-70 disabled:pointer-events-none
        ${variants[variant] || variants.primary}
        ${className}
      `.trim()}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
