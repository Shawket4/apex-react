import * as React from 'react';
import { Card } from './card';
import { cn } from '@/shared/lib/cn';

interface ChartCardProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned actions — typically an Export button or filter toggle */
  actions?: React.ReactNode;
  /**
   * Body height. Required when the card contains a Recharts ResponsiveContainer
   * since ResponsiveContainer reads its parent's height in pixels — `flex-1`
   * doesn't work because the parent (Card) doesn't establish a height.
   *
   * Pass a number for px, a string for arbitrary CSS (`'40vh'`, etc.), or
   * `'auto'` to let content size itself (suitable for non-chart content).
   */
  height?: number | string;
  className?: string;
  bodyClassName?: string;
  /** Pad the body — defaults to true. Charts often want padding off. */
  padded?: boolean;
  children?: React.ReactNode;
}

/**
 * A standard card layout for charts and chart-shaped widgets:
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ Title              [optional actions →]      │
 *   │ description (optional)                        │
 *   ├──────────────────────────────────────────────┤
 *   │                                               │
 *   │            chart / content here              │
 *   │                                               │
 *   └──────────────────────────────────────────────┘
 *
 * **Height handling.** The body is given a fixed pixel/CSS height via inline
 * style — Recharts' ResponsiveContainer needs a real height to measure
 * against. Using Tailwind class-based heights (`h-[320px]`) works, but the
 * inline style guarantees correct behaviour even when Tailwind purges
 * unfamiliar arbitrary values.
 */
export function ChartCard({
  title,
  description,
  actions,
  height = 320,
  className,
  bodyClassName,
  padded = true,
  children,
}: ChartCardProps) {
  const heightStyle =
    height === 'auto'
      ? undefined
      : { height: typeof height === 'number' ? `${height}px` : height };

  return (
    <Card className={cn('flex flex-col overflow-hidden', className)}>
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3 md:px-5 md:py-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight md:text-base">
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
      <div
        className={cn(padded && 'p-4 md:p-5', bodyClassName)}
        style={heightStyle}
      >
        {children}
      </div>
    </Card>
  );
}
