import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, ChevronUp, MinusCircle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { formatNumber } from '@/shared/lib/format';
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
    container: 'border-success/40 bg-success/10 text-success',
    dot: 'bg-success',
    iconKey: 'check',
  },
  conservative: {
    container: 'border-warning/40 bg-warning/10 text-warning',
    dot: 'bg-warning',
    iconKey: 'down',
  },
  overestimate: {
    container: 'border-destructive/40 bg-destructive/10 text-destructive',
    dot: 'bg-destructive',
    iconKey: 'up',
  },
  unknown: {
    container: 'border-border bg-muted text-muted-foreground',
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
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
        tone.container,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {t(`feeMappings.accuracy.${kind}`)}
      {!compact && kind !== 'unknown' && diffKm != null && (
        <span className="opacity-70 tabular-nums">
          {diffKm > 0 ? '+' : ''}
          {formatNumber(diffKm, 1)}&nbsp;{t('feeMappings.units.km', 'km')}
        </span>
      )}
    </span>
  );
}
