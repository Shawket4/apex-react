import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, ChevronUp, MinusCircle, MapPin } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { calculateAccuracy, type FeeMapping } from '@/entities/fee-mapping/schemas';

interface FeeMappingsStatsProps {
  mappings: FeeMapping[];
}

/**
 * KPI strip showing total + accuracy distribution + located-count.
 *
 * Numbers are computed locally from the full list, not the filtered list —
 * this view is always the global truth, so users can see "we have 200
 * total, 30 are inaccurate" even while the table is filtered down.
 */
export function FeeMappingsStats({ mappings }: FeeMappingsStatsProps) {
  const { t } = useTranslation();

  const stats = React.useMemo(() => {
    const acc = { total: mappings.length, accurate: 0, conservative: 0, overestimate: 0, unknown: 0, located: 0 };
    for (const m of mappings) {
      const { kind } = calculateAccuracy(m.distance, m.osrmDistanceKm);
      acc[kind]++;
      if (m.lat != null && m.lng != null && !(m.lat === 0 && m.lng === 0)) acc.located++;
    }
    return acc;
  }, [mappings]);

  const items: Array<{
    key: string;
    label: string;
    value: number;
    icon: React.ReactNode;
    tone: 'neutral' | 'success' | 'info' | 'destructive' | 'muted';
  }> = [
    {
      key: 'total',
      label: t('feeMappings.stats.total'),
      value: stats.total,
      icon: <MapPin className="h-3.5 w-3.5" />,
      tone: 'neutral',
    },
    {
      key: 'accurate',
      label: t('feeMappings.stats.accurate'),
      value: stats.accurate,
      icon: <Check className="h-3.5 w-3.5" />,
      tone: 'success',
    },
    {
      key: 'conservative',
      label: t('feeMappings.stats.conservative'),
      value: stats.conservative,
      icon: <ChevronDown className="h-3.5 w-3.5" />,
      tone: 'info',
    },
    {
      key: 'overestimate',
      label: t('feeMappings.stats.overestimate'),
      value: stats.overestimate,
      icon: <ChevronUp className="h-3.5 w-3.5" />,
      tone: 'destructive',
    },
    {
      key: 'unknown',
      label: t('feeMappings.stats.unknown'),
      value: stats.unknown,
      icon: <MinusCircle className="h-3.5 w-3.5" />,
      tone: 'muted',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
      {items.map((it) => (
        <StatCard {...it} key={it.key} />
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'neutral' | 'success' | 'info' | 'destructive' | 'muted';
}) {
  const toneClasses: Record<typeof tone, string> = {
    neutral: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    destructive: 'bg-destructive/10 text-destructive',
    muted: 'bg-muted text-muted-foreground',
  };
  return (
    <div className="flex items-center gap-2.5 rounded-lg border bg-card p-3">
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
          toneClasses[tone],
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="text-lg font-semibold leading-tight tabular-nums">{value}</p>
      </div>
    </div>
  );
}