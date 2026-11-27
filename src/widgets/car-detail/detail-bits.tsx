import * as React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { formatNumber } from '@/shared/lib/format';

/* The pieces the car page's tire and battery panels are built from. */

export function Km({ value }: { value: number | null }) {
  const { t } = useTranslation();
  if (value === null) return <>—</>;
  return (
    <span className="tabular-nums">
      {formatNumber(value)} {t('common.unit.km')}
    </span>
  );
}

/** Label / value rows; a value of null or '' is left out, not dashed. */
export function Facts({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== false);
  if (shown.length === 0) return null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[11rem_1fr]">
      {shown.map(([label, value]) => (
        <React.Fragment key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words font-medium">{value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 border-t pt-3">
      <h5 className="text-xs font-semibold text-muted-foreground">{title}</h5>
      {children}
    </div>
  );
}

/** A link to one work order of the garage. */
export function WorkOrderLink({ id, label }: { id: string; label: string }) {
  return (
    <Link
      to={`/work-orders/${id}`}
      className="inline-flex items-center gap-0.5 text-primary hover:underline"
    >
      {label}
      <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
    </Link>
  );
}
