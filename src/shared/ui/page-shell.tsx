import * as React from 'react';
import { cn } from '@/shared/lib/cn';

interface PageShellProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function PageShell({
  title,
  description,
  actions,
  icon,
  className,
  children,
}: PageShellProps) {
  return (
    <div className={cn('flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8', className)}>
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:flex">
              {icon}
            </div>
          )}
          <div className="min-w-0 space-y-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="flex flex-1 flex-col gap-6">{children}</div>
    </div>
  );
}
