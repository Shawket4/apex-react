import { useTranslation } from 'react-i18next';
import { Car as CarIcon, Edit, Gauge, Truck, User } from 'lucide-react';

import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';
import type { Car } from '@/entities/car/schemas';
import { carDocuments, carDocumentState } from '@/entities/car/expiry';
import { CarDocumentCell } from './car-document-cell';

/* -------------------------------------------------------------------------- */
/* Cars on a phone                                                             */
/*                                                                            */
/* The same split trips and oil changes use: one model, two presentations.     */
/* The dated papers are the reason anyone opens this screen, so on a card they */
/* get their own labelled row each rather than being folded into a single      */
/* status badge that says only that something, somewhere, has lapsed.          */
/* -------------------------------------------------------------------------- */

export function CarsMobileList({
  cars,
  loading,
  driverName,
  onEditCar,
  emptyState,
}: {
  cars: Car[];
  loading?: boolean;
  driverName: (car: Car) => string;
  onEditCar?: (car: Car) => void;
  emptyState?: React.ReactNode;
}) {
  const { t } = useTranslation();

  if (loading && cars.length === 0) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[168px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (cars.length === 0) return <>{emptyState}</>;

  return (
    <div className="grid gap-2">
      {cars.map((car) => {
        const docs = carDocuments(car);
        const state = carDocumentState(car);
        return (
          <article key={car.ID} className="rounded-lg border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <CarIcon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium tabular-nums" dir="auto">
                    {car.car_no_plate}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Truck className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {car.car_type || '—'}
                  </span>
                </span>
              </div>
              <Badge
                variant={
                  state === 'expired'
                    ? 'destructive'
                    : state === 'expiring'
                      ? 'warning'
                      : state === 'missing'
                        ? 'secondary'
                        : 'success'
                }
              >
                {t(`cars.status.${state}`)}
              </Badge>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
              <div className="min-w-0">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('cars.fields.driver')}
                </dt>
                <dd className="flex items-center gap-1 truncate">
                  <User className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {driverName(car)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('cars.fields.capacity')}
                </dt>
                <dd className="flex items-center gap-1 font-mono tabular-nums">
                  <Gauge className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {car.tank_capacity?.toLocaleString() ?? '—'} {t('cars.units.litre', 'L')}
                </dd>
              </div>
            </dl>

            <div className="mt-3 border-t pt-2">
              {docs.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">{t('cars.documents.none')}</p>
              ) : (
                <dl className="grid gap-2 sm:grid-cols-3">
                  {docs.map((doc) => (
                    <div key={doc.kind} className="min-w-0">
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t(`cars.documents.${doc.kind}`)}
                      </dt>
                      <dd>
                        <CarDocumentCell doc={doc} />
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            {onEditCar && (
              <div className={cn('mt-2 flex justify-end')}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-[11px]"
                  onClick={() => onEditCar(car)}
                >
                  <Edit className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('cars.editCar')}
                </Button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
