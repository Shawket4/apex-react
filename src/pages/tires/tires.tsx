import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleDot, Droplets, Loader2, Plus } from 'lucide-react';

import { toast } from '@/shared/ui/toaster';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { PageShell } from '@/shared/ui/page-shell';
import { Skeleton } from '@/shared/ui/skeleton';
import { extractErrorMessage } from '@/shared/api/errors';
import {
  oilCreditInputSchema,
  tireCreditInputSchema,
  type OilCreditInput,
  type TireCreditInput,
} from '@/entities/maint-stock/schemas';
import {
  useCreditOil,
  useCreditTires,
  useOilStock,
  useTireStock,
} from '@/entities/maint-stock/queries';

/**
 * Garage stock — Falcon's authoritative CREDIT ledger (level-4 route).
 *
 * Shipments are entered here; the maintenance system mirrors the numbers
 * down for the garage and pushes consumption debits back up idempotently.
 * Tires are fungible counts — individual tire identity (DOT, km, history)
 * is captured in the maintenance app at mount time, never here.
 */
export function TiresPage() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t('tiresStock.title')}
      description={t('tiresStock.subtitle')}
      icon={<CircleDot className="h-6 w-6" />}
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <TireStockCard />
        <OilStockCard />
      </div>
    </PageShell>
  );
}

/* ── tires ──────────────────────────────────────────────────────────────── */

function TireStockCard() {
  const { t } = useTranslation();
  const stock = useTireStock();
  const credit = useCreditTires();
  const form = useForm<TireCreditInput>({
    resolver: zodResolver(tireCreditInputSchema),
    defaultValues: { brand: '', model: '', size: '', on_hand_qty: 0 },
  });

  const submit = form.handleSubmit((values) => {
    credit.mutate(values, {
      onSuccess: () => {
        toast.success(t('tiresStock.added'));
        form.reset();
      },
      onError: (e) => toast.error(extractErrorMessage(e)),
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CircleDot className="h-4 w-4 text-primary" aria-hidden="true" />
          {t('tiresStock.tires')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stock.isLoading ? (
          <Skeleton className="h-24 rounded-lg" />
        ) : (stock.data ?? []).length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">{t('tiresStock.empty')}</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">{t('tiresStock.brand')}</th>
                  <th className="px-3 py-2 text-start">{t('tiresStock.model')}</th>
                  <th className="px-3 py-2 text-start">{t('tiresStock.size')}</th>
                  <th className="px-3 py-2 text-end">{t('tiresStock.qty')}</th>
                </tr>
              </thead>
              <tbody>
                {(stock.data ?? []).map((row) => (
                  <tr key={row.ID} className="border-t">
                    <td className="px-3 py-2" dir="ltr">
                      {row.brand}
                    </td>
                    <td className="px-3 py-2" dir="ltr">
                      {row.model ?? '—'}
                    </td>
                    <td className="px-3 py-2" dir="ltr">
                      {row.size ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-end font-mono tabular-nums">
                      {row.on_hand_qty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form onSubmit={(e) => void submit(e)} className="space-y-3 rounded-lg border p-3">
          <div className="text-sm font-semibold">{t('tiresStock.addShipment')}</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ts-brand">{t('tiresStock.brand')}</Label>
              <Input id="ts-brand" dir="ltr" aria-invalid={!!form.formState.errors.brand} {...form.register('brand')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ts-model">{t('tiresStock.model')}</Label>
              <Input id="ts-model" dir="ltr" {...form.register('model')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ts-size">{t('tiresStock.size')}</Label>
              <Input id="ts-size" dir="ltr" placeholder="315/80R22.5" {...form.register('size')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ts-qty">{t('tiresStock.addQty')}</Label>
              <Input
                id="ts-qty"
                type="number"
                inputMode="numeric"
                min={1}
                className="tabular-nums"
                aria-invalid={!!form.formState.errors.on_hand_qty}
                {...form.register('on_hand_qty')}
              />
            </div>
          </div>
          {(form.formState.errors.brand ?? form.formState.errors.on_hand_qty) && (
            <p className="text-[11px] font-medium text-destructive">{t('tiresStock.validation')}</p>
          )}
          <Button type="submit" disabled={credit.isPending} className="w-full">
            {credit.isPending ? (
              <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Plus aria-hidden="true" />
            )}
            {t('tiresStock.addShipment')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/* ── oil ────────────────────────────────────────────────────────────────── */

function OilStockCard() {
  const { t } = useTranslation();
  const stock = useOilStock();
  const credit = useCreditOil();
  const form = useForm<OilCreditInput>({
    resolver: zodResolver(oilCreditInputSchema),
    defaultValues: { oil_type: '', liters_on_hand: 0 },
  });

  const submit = form.handleSubmit((values) => {
    credit.mutate(values, {
      onSuccess: () => {
        toast.success(t('tiresStock.added'));
        form.reset();
      },
      onError: (e) => toast.error(extractErrorMessage(e)),
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Droplets className="h-4 w-4 text-primary" aria-hidden="true" />
          {t('tiresStock.oil')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stock.isLoading ? (
          <Skeleton className="h-24 rounded-lg" />
        ) : (stock.data ?? []).length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">{t('tiresStock.empty')}</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">{t('tiresStock.oilType')}</th>
                  <th className="px-3 py-2 text-end">{t('tiresStock.liters')}</th>
                </tr>
              </thead>
              <tbody>
                {(stock.data ?? []).map((row) => (
                  <tr key={row.ID} className="border-t">
                    <td className="px-3 py-2" dir="ltr">
                      {row.oil_type}
                    </td>
                    <td className="px-3 py-2 text-end font-mono tabular-nums">
                      {row.liters_on_hand}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form onSubmit={(e) => void submit(e)} className="space-y-3 rounded-lg border p-3">
          <div className="text-sm font-semibold">{t('tiresStock.addOil')}</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="os-type">{t('tiresStock.oilType')}</Label>
              <Input id="os-type" dir="ltr" placeholder="15W-40" aria-invalid={!!form.formState.errors.oil_type} {...form.register('oil_type')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="os-liters">{t('tiresStock.addLiters')}</Label>
              <Input
                id="os-liters"
                type="number"
                inputMode="decimal"
                min={1}
                step="0.5"
                className="tabular-nums"
                aria-invalid={!!form.formState.errors.liters_on_hand}
                {...form.register('liters_on_hand')}
              />
            </div>
          </div>
          {(form.formState.errors.oil_type ?? form.formState.errors.liters_on_hand) && (
            <p className="text-[11px] font-medium text-destructive">{t('tiresStock.validation')}</p>
          )}
          <Button type="submit" disabled={credit.isPending} className="w-full">
            {credit.isPending ? (
              <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Plus aria-hidden="true" />
            )}
            {t('tiresStock.addOil')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
