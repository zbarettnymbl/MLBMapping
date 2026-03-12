interface ProgressBarProps {
  value: number;
  max: number;
  variant?: 'amber' | 'cyan' | 'emerald';
  size?: 'sm' | 'md';
  label?: string;
  showPercentage?: boolean;
}

const barColorClasses: Record<string, string> = {
  amber: 'bg-amber-500',
  cyan: 'bg-cyan-500',
  emerald: 'bg-emerald-500',
};

const sizeClasses: Record<string, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
};

export function ProgressBar({
  value,
  max,
  variant = 'amber',
  size = 'md',
  label,
  showPercentage = true,
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-forge-300">{label}</span>}
          {showPercentage && (
            <span className="text-xs text-forge-400">{percentage}%</span>
          )}
        </div>
      )}
      <div className={['w-full bg-forge-800 rounded-full overflow-hidden', sizeClasses[size]].join(' ')}>
        <div
          className={['h-full rounded-full transition-all duration-300', barColorClasses[variant]].join(' ')}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
