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
  value: React.ReactNode | { full: React.ReactNode; compact: React.ReactNode };
  subvalue?: React.ReactNode;
  icon?: LucideIcon;
  tone?: StatCardTone;
  className?: string;
  valueClassName?: string;
}

function isResponsiveValue(
  v: StatCardProps['value'],
): v is { full: React.ReactNode; compact: React.ReactNode } {
  return (
    typeof v === 'object' &&
    v !== null &&
    !React.isValidElement(v) &&
    'full' in v &&
    'compact' in v
  );
}

export function StatCard({
  label,
  value,
  subvalue,
  icon: Icon,
  tone = 'default',
  className,
  valueClassName,
}: StatCardProps) {
  const responsive = isResponsiveValue(value);

  return (
    <Card
      className={cn('overflow-hidden', className)}
      style={{ containerType: 'inline-size' }}
    >
      <CardContent className="flex items-center gap-3 p-3">
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
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {responsive ? (
            <>
              <p
                className={cn(
                  'stat-card-compact truncate font-mono text-[22px] font-semibold leading-none tabular-nums',
                  valueClassName,
                )}
              >
                {value.compact}
              </p>
              <p
                className={cn(
                  'stat-card-full truncate font-mono text-[22px] font-semibold leading-none tabular-nums',
                  valueClassName,
                )}
              >
                {value.full}
              </p>
            </>
          ) : (
            <p
              className={cn(
                'truncate font-mono text-[22px] font-semibold leading-none tabular-nums',
                valueClassName,
              )}
            >
              {value as React.ReactNode}
            </p>
          )}
          {subvalue && (
            <p className="truncate text-[11.5px] tabular-nums text-muted-foreground">
              {subvalue}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}