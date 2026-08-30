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
    <div className={cn('mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 p-3 sm:p-4', className)}>
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:flex">
              {icon}
            </div>
          )}
          <div className="min-w-0 space-y-0.5">
            <h1 className="truncate text-lg font-semibold leading-tight sm:text-xl">{title}</h1>
            {description && (
              <p className="text-[11.5px] text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="flex flex-1 flex-col gap-3">{children}</div>
    </div>
  );
}
