import type { ReactNode } from 'react';

interface AlertProps {
  variant: 'error' | 'success' | 'info';
  children: ReactNode;
}

const ICONS = {
  error: '⚠️',
  success: '✓',
  info: 'ℹ️',
};

export function Alert({ variant, children }: AlertProps) {
  const styles = {
    error: 'bg-red-50 text-red-700 border-red-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    info: 'bg-primary-50 text-primary-700 border-primary-200',
  };

  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm animate-fade-in ${styles[variant]}`}
      role="alert"
    >
      <span aria-hidden="true" className="shrink-0 leading-5">
        {ICONS[variant]}
      </span>
      <span>{children}</span>
    </div>
  );
}
