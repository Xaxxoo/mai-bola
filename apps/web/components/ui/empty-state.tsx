import type { ReactNode } from 'react';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && <div className="mb-4 text-muted">{icon}</div>}
      <h3 className="text-lg font-heading font-semibold text-text">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted max-w-[280px]">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
