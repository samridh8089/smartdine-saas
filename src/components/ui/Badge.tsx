import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple' | 'veg' | 'non-veg';
  className?: string;
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold';
  
  const variants = {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border border-amber-100',
    error: 'bg-rose-50 text-rose-700 border border-rose-100',
    info: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
    purple: 'bg-purple-50 text-purple-700 border border-purple-100',
    neutral: 'bg-slate-50 text-slate-700 border border-slate-200',
    veg: 'bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 before:content-[""] before:inline-block before:w-2 before:h-2 before:bg-emerald-600 before:rounded-full',
    'non-veg': 'bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 before:content-[""] before:inline-block before:w-0 before:h-0 before:border-l-[4px] before:border-l-transparent before:border-r-[4px] before:border-r-transparent before:border-b-[8px] before:border-b-rose-600'
  };

  return (
    <span className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
