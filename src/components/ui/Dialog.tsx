import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Dialog({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md'
}: DialogProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Dialog Content */}
      <div className={`relative bg-white rounded-xl shadow-xl w-full ${sizeClasses[size]} overflow-hidden flex flex-col max-h-[90vh] animate-pop z-10`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base md:text-lg font-semibold text-slate-900">{title}</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1 text-sm text-slate-600">
          {children}
        </div>

        {/* Footer */}
        {footer ? (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
