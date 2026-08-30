import * as React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Card, CardContent } from './card';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

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

/* -------------------------------------------------------------------------- */
/* A figure that explains itself only when it has to                           */
/*                                                                            */
/* These cards are narrow and the numbers are not: a total in EGP clips long   */
/* before the card does. The figure measures itself and, only while it is      */
/* actually clipped, becomes a tooltip trigger carrying the whole number.      */
/* Radix opens on hover and focus; `onPointerDown` adds the touch case, which  */
/* is the one that matters here — this page is read on a phone.                */
/* -------------------------------------------------------------------------- */

function StatValue({
  children,
  className,
  full,
}: {
  children: React.ReactNode;
  className?: string;
  /** The unabbreviated figure, when `children` is already a compact form. */
  full?: React.ReactNode;
}) {
  const ref = React.useRef<HTMLParagraphElement>(null);
  const [clipped, setClipped] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 1px of slack absorbs sub-pixel rounding, which otherwise reports an
    // overflow on a figure that visibly fits.
    const measure = () => setClipped(el.scrollWidth > el.clientWidth + 1);
    measure();
    // The compact/full pair is swapped by a container query, so one of the two
    // has no box on the first pass and measures zero. Re-measure once the frame
    // has been laid out, and again when the web font lands.
    const raf = requestAnimationFrame(measure);
    document.fonts?.ready.then(measure).catch(() => {});
    if (typeof ResizeObserver === 'undefined') return () => cancelAnimationFrame(raf);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [children, full]);

  const text = toText(full ?? children);
  // A compact form always has more to show; a plain figure only once it clips.
  const hasMore = Boolean(text) && (full !== undefined || clipped);

  // One element in both states: the trigger is always mounted, so the ref never
  // moves and the measurement above keeps working after a resize.
  return (
    <Tooltip open={open && hasMore} onOpenChange={(o) => setOpen(o && hasMore)}>
      <TooltipTrigger asChild>
        <p
          ref={ref}
          className={cn(
            'truncate font-mono text-sm font-semibold leading-tight tracking-tight tabular-nums sm:text-base md:text-lg',
            className,
          )}
          aria-label={hasMore ? text : undefined}
          // Radix opens on hover and focus; touch has neither, and its own
          // pointer-down handler closes the tooltip — so re-open on the click
          // that follows.
          onClick={() => hasMore && setOpen(true)}
        >
          {children}
        </p>
      </TooltipTrigger>
      <TooltipContent className="font-mono tabular-nums">{text}</TooltipContent>
    </Tooltip>
  );
}

/** Tooltips carry text, so a figure built from elements contributes its strings. */
function toText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (React.isValidElement(node)) return toText((node.props as { children?: React.ReactNode }).children);
  return '';
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
          {responsive ? (
            <>
              <StatValue className={cn('stat-card-compact', valueClassName)} full={value.full}>
                {value.compact}
              </StatValue>
              <StatValue className={cn('stat-card-full', valueClassName)}>{value.full}</StatValue>
            </>
          ) : (
            <StatValue className={valueClassName}>{value as React.ReactNode}</StatValue>
          )}
          {subvalue && (
            <p className="truncate text-[10px] tabular-nums text-muted-foreground sm:text-[11px]">
              {subvalue}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}