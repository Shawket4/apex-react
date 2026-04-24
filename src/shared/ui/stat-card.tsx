import * as React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Card, CardContent } from './card';

type StatCardTone = 'default' | 'primary' | 'success' | 'warning' | 'destructive';

const toneClasses: Record<StatCardTone, string> = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  subvalue?: React.ReactNode;
  icon?: LucideIcon;
  tone?: StatCardTone;
  className?: string;
}

/**
 * Compact KPI card. Designed to sit in grids of up to 6 across on desktop
 * without feeling empty, and collapse cleanly to 2 across on mobile.
 * Typography uses a tight scale: label is uppercase 10-11px, value is
 * responsive 14-18px, subvalue is muted 10-11px.
 */
export function StatCard({
  label,
  value,
  subvalue,
  icon: Icon,
  tone = 'default',
  className,
}: StatCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="flex items-center gap-3 p-3 sm:gap-3 sm:p-3.5">
        {Icon && (
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
              toneClasses[tone],
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[11px]">
            {label}
          </p>
          <p className="truncate text-sm font-semibold leading-tight tracking-tight sm:text-base md:text-lg">
            {value}
          </p>
          {subvalue && (
            <p className="truncate text-[10px] text-muted-foreground sm:text-[11px]">{subvalue}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}