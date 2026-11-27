import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BatteryFull, CircleDot, ClipboardCheck, Droplets, Loader2, Plus } from 'lucide-react';

import { toast } from '@/shared/ui/toast';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { PageShell } from '@/shared/ui/page-shell';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { useTabParam } from '@/shared/hooks/use-tab-param';
import { MaintBatteriesList } from '@/widgets/maint-batteries-list/maint-batteries-list';
import { MaintTiresList } from '@/widgets/maint-tires-list/maint-tires-list';
import { StockCountDialog } from '@/widgets/stock-count/stock-count-dialog';
import { useStockCount } from '@/widgets/stock-count/use-stock-count';
import { canCountStock } from '@/entities/maint-stock/api';
import { batterySpec } from '@/entities/maintenance/lib';
import { extractErrorMessage } from '@/shared/api/errors';
import {
  batteryCreditInputSchema,
  oilCreditInputSchema,
  tireCreditInputSchema,
  type BatteryCreditInput,
  type OilCreditInput,
  type TireCreditInput,
} from '@/entities/maint-stock/schemas';
import {
  useBatteryStock,
  useCreditBatteries,
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
 *
 * Batteries are the third stock item: new ones are counted per product
 * (brand, model, Ah, volts) in the garage system alone — no Falcon ledger —
 * and each gets a record of its own once the garage fits it.
 *
 * The other tabs are the other half: every individual tire, and every
 * battery, as the garage system holds them, read-only.
 *
 * A stock count ("we counted N") is the one thing here that goes the other
 * way: it is posted to the garage system, which corrects its book figure and
 * mirrors the movement up to Falcon. The figures in these tables are still
 * Falcon's, so they follow a count a moment later.
 */
const TABS = ['stock', 'all', 'batteries'] as const;

export function TiresPage() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useTabParam(TABS);
  return (
    <PageShell
      title={t('tiresStock.title')}
      description={t('tiresStock.subtitle')}
      icon={<CircleDot className="h-6 w-6" />}
    >
      <Tabs value={tab} onValueChange={setTab} dir={i18n.dir()}>
        <TabsList>
          <TabsTrigger value="stock">{t('tiresStock.tabs.stock')}</TabsTrigger>
          <TabsTrigger value="all">{t('tiresStock.tabs.all')}</TabsTrigger>
          <TabsTrigger value="batteries">{t('tiresStock.tabs.batteries')}</TabsTrigger>
        </TabsList>
        <TabsContent value="stock">
          {/* min-w-0: a wide table scrolls in its card instead of widening the column. */}
          <div className="grid gap-3 lg:grid-cols-2 [&>*]:min-w-0">
            <TireStockCard />
            <OilStockCard />
            <BatteryStockCard className="lg:col-span-2" />
          </div>
          {!canCountStock && (
            <p className="pt-3 text-xs text-muted-foreground">
              {t('tiresStock.count.notConfigured')}
            </p>
          )}
        </TabsContent>
        <TabsContent value="all">
          <MaintTiresList />
        </TabsContent>
        <TabsContent value="batteries">
          <MaintBatteriesList />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

/* ── stock count ────────────────────────────────────────────────────────── */

function CountHeader() {
  const { t } = useTranslation();
  return (
    <th className="w-px px-3 py-2">
      <span className="sr-only">{t('tiresStock.count.action')}</span>
    </th>
  );
}

function CountCell({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <td className="w-px whitespace-nowrap px-2 py-1 text-end">
      <Button type="button" variant="ghost" size="sm" onClick={onClick}>
        <ClipboardCheck aria-hidden="true" />
        {/* The icon alone on a phone, so the table fits. */}
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">{t('tiresStock.count.action')}</span>
      </Button>
    </td>
  );
}

/* ── tires ──────────────────────────────────────────────────────────────── */

function TireStockCard() {
  const { t } = useTranslation();
  const stock = useTireStock();
  const credit = useCreditTires();
  const refId = useRef<string | null>(null);
  const counting = useStockCount();
  const form = useForm<TireCreditInput>({
    resolver: zodResolver(tireCreditInputSchema),
    defaultValues: { brand: '', model: '', size: '', on_hand_qty: 0 },
  });

  const submit = form.handleSubmit((values) => {
    // One id per shipment: a retry after a failure adds it once, not twice.
    refId.current ??= crypto.randomUUID();
    credit.mutate({ input: values, refId: refId.current }, {
      onSuccess: () => {
        refId.current = null;
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
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">{t('tiresStock.brand')}</th>
                  <th className="px-3 py-2 text-start">{t('tiresStock.model')}</th>
                  <th className="px-3 py-2 text-start">{t('tiresStock.size')}</th>
                  <th className="px-3 py-2 text-end">{t('tiresStock.qty')}</th>
                  {canCountStock && <CountHeader />}
                </tr>
              </thead>
              <tbody>
                {(stock.data ?? []).map((row) => (
                  <tr key={`${row.brand}|${row.model ?? ''}|${row.size ?? ''}`} className="border-t">
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
                    {canCountStock && (
                      <CountCell
                        onClick={() =>
                          counting.count({
                            kind: 'tires',
                            brand: row.brand,
                            model: row.model ?? '',
                            size: row.size ?? '',
                            book: row.on_hand_qty,
                          })
                        }
                      />
                    )}
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
              <Input id="ts-size" dir="ltr" placeholder={t('tiresStock.sizePlaceholder', { defaultValue: '315/80R22.5…' })} {...form.register('size')} />
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
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Plus aria-hidden="true" />
            )}
            {t('tiresStock.addShipment')}
          </Button>
        </form>
      </CardContent>
      <StockCountDialog {...counting.dialog} />
    </Card>
  );
}

/* ── oil ────────────────────────────────────────────────────────────────── */

function OilStockCard() {
  const { t } = useTranslation();
  const stock = useOilStock();
  const credit = useCreditOil();
  const refId = useRef<string | null>(null);
  const counting = useStockCount();
  const form = useForm<OilCreditInput>({
    resolver: zodResolver(oilCreditInputSchema),
    defaultValues: { oil_type: '', liters_on_hand: 0 },
  });

  const submit = form.handleSubmit((values) => {
    // One id per shipment: a retry after a failure adds it once, not twice.
    refId.current ??= crypto.randomUUID();
    credit.mutate({ input: values, refId: refId.current }, {
      onSuccess: () => {
        refId.current = null;
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
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">{t('tiresStock.oilType')}</th>
                  <th className="px-3 py-2 text-end">{t('tiresStock.liters')}</th>
                  {canCountStock && <CountHeader />}
                </tr>
              </thead>
              <tbody>
                {(stock.data ?? []).map((row) => (
                  <tr key={row.oil_type} className="border-t">
                    <td className="px-3 py-2" dir="ltr">
                      {row.oil_type}
                    </td>
                    <td className="px-3 py-2 text-end font-mono tabular-nums">
                      {row.liters_on_hand}
                    </td>
                    {canCountStock && (
                      <CountCell
                        onClick={() =>
                          counting.count({
                            kind: 'oil',
                            oilType: row.oil_type,
                            book: row.liters_on_hand,
                          })
                        }
                      />
                    )}
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
              <Input id="os-type" dir="ltr" placeholder={t('tiresStock.oilTypePlaceholder', { defaultValue: '15W-40…' })} aria-invalid={!!form.formState.errors.oil_type} {...form.register('oil_type')} />
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
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Plus aria-hidden="true" />
            )}
            {t('tiresStock.addOil')}
          </Button>
        </form>
      </CardContent>
      <StockCountDialog {...counting.dialog} />
    </Card>
  );
}

/* ── batteries ──────────────────────────────────────────────────────────── */

function BatteryStockCard({ className }: { className?: string }) {
  const { t } = useTranslation();
  const stock = useBatteryStock();
  const credit = useCreditBatteries();
  const refId = useRef<string | null>(null);
  const counting = useStockCount();
  const form = useForm<BatteryCreditInput>({
    resolver: zodResolver(batteryCreditInputSchema),
    defaultValues: { brand: '', model: '', capacity_ah: null, voltage: null, cca: null, qty: 0 },
  });
  const errors = form.formState.errors;

  const submit = form.handleSubmit((values) => {
    // One id per shipment: a retry after a failure adds it once, not twice.
    refId.current ??= crypto.randomUUID();
    credit.mutate({ input: values, refId: refId.current }, {
      onSuccess: () => {
        refId.current = null;
        toast.success(t('tiresStock.added'));
        form.reset();
      },
      onError: (e) => toast.error(extractErrorMessage(e)),
    });
  });

  const rows = stock.data ?? [];

  return (
    <Card className={className}>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <BatteryFull className="h-4 w-4 text-primary" aria-hidden="true" />
          {t('tiresStock.batteries')}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t('tiresStock.batteriesHint')}</p>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {stock.isLoading ? (
          <Skeleton className="h-24 rounded-lg" />
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">{t('tiresStock.empty')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">{t('tiresStock.battery')}</th>
                  <th className="px-3 py-2 text-start">{t('tiresStock.spec')}</th>
                  <th className="px-3 py-2 text-end">{t('tiresStock.qty')}</th>
                  {canCountStock && <CountHeader />}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const spec = batterySpec(row);
                  return (
                    <tr
                      key={row.id ?? `${row.brand}|${row.model ?? ''}|${row.capacity_ah ?? ''}|${row.voltage ?? ''}`}
                      className="border-t"
                    >
                      <td className="px-3 py-2">
                        <div className="font-medium" dir="ltr">
                          {[row.brand, row.model].filter(Boolean).join(' ')}
                        </div>
                        {row.batteries > 0 && (
                          <div className="text-[11px] text-muted-foreground">
                            {t('tiresStock.onRecord', { n: row.batteries })}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="whitespace-nowrap" dir="ltr">
                          {spec ?? '—'}
                        </div>
                        {row.cca !== null && (
                          <div className="whitespace-nowrap text-[11px] text-muted-foreground" dir="ltr">
                            {row.cca} CCA
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-end font-mono tabular-nums">{row.on_hand_qty}</td>
                      {canCountStock && (
                        <CountCell
                          onClick={() =>
                            counting.count({
                              kind: 'batteries',
                              brand: row.brand,
                              model: row.model,
                              capacity_ah: row.capacity_ah,
                              voltage: row.voltage,
                              cca: row.cca,
                              book: row.on_hand_qty,
                            })
                          }
                        />
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <form onSubmit={(e) => void submit(e)} className="space-y-3 rounded-lg border p-3">
          <div className="text-sm font-semibold">{t('tiresStock.addBatteries')}</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="bs-brand">{t('tiresStock.brand')}</Label>
              <Input id="bs-brand" dir="ltr" aria-invalid={!!errors.brand} {...form.register('brand')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bs-model">{t('tiresStock.model')}</Label>
              <Input id="bs-model" dir="ltr" {...form.register('model')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bs-ah">{t('tiresStock.capacity')}</Label>
              <Input
                id="bs-ah"
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="100"
                className="tabular-nums"
                aria-invalid={!!errors.capacity_ah}
                {...form.register('capacity_ah')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bs-v">{t('tiresStock.voltage')}</Label>
              <Input
                id="bs-v"
                type="number"
                inputMode="numeric"
                min={2}
                placeholder="12"
                className="tabular-nums"
                aria-invalid={!!errors.voltage}
                {...form.register('voltage')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bs-cca">{t('tiresStock.cca')}</Label>
              <Input
                id="bs-cca"
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="800"
                className="tabular-nums"
                aria-invalid={!!errors.cca}
                {...form.register('cca')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bs-qty">{t('tiresStock.addQty')}</Label>
              <Input
                id="bs-qty"
                type="number"
                inputMode="numeric"
                min={1}
                className="tabular-nums"
                aria-invalid={!!errors.qty}
                {...form.register('qty')}
              />
            </div>
          </div>
          {(errors.brand ?? errors.qty ?? errors.capacity_ah ?? errors.voltage ?? errors.cca) && (
            <p className="text-[11px] font-medium text-destructive">{t('tiresStock.batteryValidation')}</p>
          )}
          <Button type="submit" disabled={credit.isPending} className="w-full">
            {credit.isPending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Plus aria-hidden="true" />
            )}
            {t('tiresStock.addBatteries')}
          </Button>
        </form>
      </CardContent>
      <StockCountDialog {...counting.dialog} />
    </Card>
  );
}
