import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  size?: 'sm' | 'md';
  activeColor?: 'emerald' | 'sky' | 'amber' | 'indigo' | 'rose';
  ariaLabel?: string;
}

const COLOR_MAP: Record<NonNullable<ToggleSwitchProps['activeColor']>, string> = {
  emerald: 'bg-emerald-600 dark:bg-emerald-500',
  sky: 'bg-sky-600 dark:bg-sky-500',
  amber: 'bg-amber-500 dark:bg-amber-400',
  indigo: 'bg-indigo-600 dark:bg-indigo-500',
  rose: 'bg-rose-600 dark:bg-rose-500'
};

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  size = 'md',
  activeColor = 'emerald',
  ariaLabel
}) => {
  const isSm = size === 'sm';
  const trackW = isSm ? 'w-10 h-5' : 'w-12 h-6';
  const thumbSize = isSm ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const thumbTranslate = checked
    ? isSm
      ? 'translate-x-5'
      : 'translate-x-6'
    : 'translate-x-1';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel || label || 'Alternar opção'}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className="inline-flex items-center gap-2.5 cursor-pointer select-none group focus:outline-none"
    >
      <span
        className={`relative inline-flex items-center rounded-full transition-colors duration-200 shadow-inner ${trackW} ${
          checked
            ? COLOR_MAP[activeColor]
            : 'bg-slate-300 dark:bg-slate-700 group-hover:bg-slate-400 dark:group-hover:bg-slate-600'
        }`}
      >
        <span
          className={`inline-block rounded-full bg-white shadow-sm transform transition-transform duration-200 ${thumbSize} ${thumbTranslate}`}
        />
      </span>
      {label && (
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{label}</span>
      )}
    </button>
  );
};
