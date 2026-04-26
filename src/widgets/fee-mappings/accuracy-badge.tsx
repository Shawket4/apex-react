import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, ChevronUp, MinusCircle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { AccuracyKind } from '@/entities/fee-mapping/schemas';

interface AccuracyBadgeProps {
  kind: AccuracyKind;
  diffKm?: number;
  /** Compact mode hides the diff suffix — for tight columns. */
  compact?: boolean;
}

const TONE: Record<
  AccuracyKind,
  { container: string; dot: string; iconKey: 'check' | 'down' | 'up' | 'minus' }
> = {
  accurate: {
    container:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    dot: 'bg-emerald-500',
    iconKey: 'check',
  },
  conservative: {
    container:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900',
    dot: 'bg-sky-500',
    iconKey: 'down',
  },
  overestimate: {
    container:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
    dot: 'bg-rose-500',
    iconKey: 'up',
  },
  unknown: {
    container:
      'bg-muted text-muted-foreground border-border',
    dot: 'bg-muted-foreground',
    iconKey: 'minus',
  },
};

const ICONS = {
  check: Check,
  down: ChevronDown,
  up: ChevronUp,
  minus: MinusCircle,
};

export function AccuracyBadge({ kind, diffKm, compact }: AccuracyBadgeProps) {
  const { t } = useTranslation();
  const tone = TONE[kind];
  const Icon = ICONS[tone.iconKey];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium',
        tone.container,
      )}
    >
      <Icon className="h-3 w-3" />
      {t(`feeMappings.accuracy.${kind}`)}
      {!compact && kind !== 'unknown' && diffKm != null && (
        <span className="opacity-70 tabular-nums">
          {diffKm > 0 ? '+' : ''}
          {diffKm.toFixed(1)}km
        </span>
      )}
    </span>
  );
}
