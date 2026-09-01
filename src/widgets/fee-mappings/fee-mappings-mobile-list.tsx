import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Building2, MapPin, MapPinOff, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';
import { formatNumber } from '@/shared/lib/format';
import { isValidCoordinate } from '@/shared/lib/coords';
import { AccuracyBadge } from './accuracy-badge';
import { calculateAccuracy, type FeeMapping } from '@/entities/fee-mapping/schemas';

/* -------------------------------------------------------------------------- */
/* Fee mappings on a phone                                                     */
/*                                                                            */
/* The same split trips, oil changes and cars use: one row model, two          */
/* presentations. A six-column table with two distances and a badge does not   */
/* survive 390px — it was simply cut off at the right edge.                    */
/*                                                                            */
/* The card leads with the route, because that is what identifies a mapping,   */
/* and puts the two distances side by side, because comparing them is the      */
/* entire reason this screen exists.                                           */
/* -------------------------------------------------------------------------- */

export function FeeMappingsMobileList({
  rows,
  loading,
  onEdit,
  onDelete,
  onShowRoute,
  emptyState,
}: {
  rows: FeeMapping[];
  loading?: boolean;
  onEdit: (m: FeeMapping) => void;
  onDelete: (m: FeeMapping) => void;
  onShowRoute: (m: FeeMapping) => void;
  emptyState?: React.ReactNode;
}) {
  const { t } = useTranslation();

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[124px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) return <>{emptyState}</>;

  return (
    <div className="grid gap-2">
      {rows.map((m) => {
        const hasPin = isValidCoordinate(m.lat, m.lng);
        // Same derivation the table uses, so the badge and the difference
        // column cannot disagree about what "accurate" means.
        const { kind, diffKm } = calculateAccuracy(m.distance, m.osrmDistanceKm);
        const gap = kind === 'unknown' ? null : diffKm;

        return (
          <article key={m.id} className="rounded-lg border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium" dir="auto">
                  {m.terminal}
                </p>
                <p className="truncate text-[13px] text-muted-foreground" dir="auto">
                  → {m.dropOffPoint}
                </p>
              </div>
              <AccuracyBadge kind={kind} diffKm={diffKm} compact />
            </div>

            <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-1 text-[11px]">
              <Field label={t('feeMappings.fields.distance')}>
                {formatNumber(m.distance, 0)} km
              </Field>
              <Field label={t('feeMappings.fields.osrmDistance')}>
                {/* 0 means "never enriched", not "zero kilometres" — the column
                    is nullable in spirit but zero on the wire. */}
                {m.osrmDistanceKm ? `${formatNumber(m.osrmDistanceKm, 1)} km` : '—'}
              </Field>
              <Field
                label={t('feeMappings.fields.difference')}
                className={cn(gap != null && Math.abs(gap) >= 10 && 'text-destructive')}
              >
                {gap != null ? `${gap > 0 ? '+' : ''}${formatNumber(gap, 1)} km` : '—'}
              </Field>
            </dl>

            <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2">
              <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{m.company}</span>
              </span>
              <div className="flex shrink-0 items-center gap-1">
                {hasPin ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-primary hover:bg-primary/10"
                    onClick={() => onShowRoute(m)}
                    aria-label={t('feeMappings.actions.viewRoute')}
                  >
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    asChild
                    className="h-8 w-8 text-muted-foreground"
                    aria-label={t('feeMappings.actions.noPin')}
                  >
                    <Link to={`/locations?tab=dropoffs&q=${encodeURIComponent(m.dropOffPoint)}`}>
                      <MapPinOff className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-primary hover:bg-primary/10"
                  onClick={() => onEdit(m)}
                  aria-label={t('common.edit')}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onDelete(m)}
                  aria-label={t('common.delete')}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className={cn('truncate font-mono text-[12px] tabular-nums', className)}>{children}</dd>
    </div>
  );
}
