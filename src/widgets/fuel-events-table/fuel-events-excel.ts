import type { TFunction } from 'i18next';
import { exportToExcel, EXCEL_PALETTE } from '@/shared/lib/excel';
import type { FuelEvent } from '@/entities/fuel-event/schemas';
import { normaliseMethod } from '@/entities/fuel-event/schemas';
import { analyseEvents, type EfficiencyMap } from '@/shared/lib/fuel';
import { fmtDate } from '@/shared/lib/format';

export type FuelEventGrouping = 'none' | 'vehicle' | 'driver';

interface ExportFuelEventsArgs {
    events: FuelEvent[];
    grouping: FuelEventGrouping;
    t: TFunction;
    meta?: string;
}

interface ExportGroupArgs {
    groupKey: string;
    events: FuelEvent[];
    grouping: 'vehicle' | 'driver';
    t: TFunction;
    meta?: string;
}

function buildColumns(t: TFunction, map: EfficiencyMap) {
    return [
        {
            key: 'plate',
            header: t('fuelEvents.fields.carPlate'),
            accessor: (e: FuelEvent) => e.car_no_plate,
            width: 16,
        },
        {
            key: 'driver',
            header: t('fuelEvents.fields.driver'),
            accessor: (e: FuelEvent) => e.driver_name ?? '—',
            width: 22,
        },
        {
            key: 'method',
            header: t('fuelEvents.method.label'),
            accessor: (e: FuelEvent) => {
                const m = normaliseMethod(e.method);
                return m === 'PetroApp' ? t('fuelEvents.method.petroApp') : t('fuelEvents.method.manual');
            },
            width: 12,
            fontColor: (e: FuelEvent) =>
                normaliseMethod(e.method) === 'PetroApp' ? EXCEL_PALETTE.brand : EXCEL_PALETTE.muted,
        },
        {
            key: 'date',
            header: t('fuelEvents.fields.date'),
            accessor: (e: FuelEvent) => new Date(e.date),
            type: 'date' as const,
            width: 14,
        },
        {
            key: 'liters',
            header: t('fuelEvents.fields.liters'),
            accessor: (e: FuelEvent) => e.liters,
            type: 'number' as const,
            width: 12,
            total: true,
        },
        {
            key: 'pricePerLiter',
            header: t('fuelEvents.fields.pricePerLiter'),
            accessor: (e: FuelEvent) => e.price_per_liter,
            type: 'moneyRaw' as const,
            width: 14,
        },
        {
            key: 'price',
            header: t('fuelEvents.fields.totalPrice'),
            accessor: (e: FuelEvent) => e.price,
            type: 'moneyRaw' as const,
            width: 14,
            total: true,
        },
        {
            key: 'odoBefore',
            header: t('fuelEvents.fields.odometerBefore'),
            accessor: (e: FuelEvent) => e.odometer_before,
            type: 'integer' as const,
            width: 14,
        },
        {
            key: 'odoAfter',
            header: t('fuelEvents.fields.odometerAfter'),
            accessor: (e: FuelEvent) => e.odometer_after,
            type: 'integer' as const,
            width: 14,
        },
        {
            key: 'distance',
            header: t('fuelEvents.fields.distance'),
            accessor: (e: FuelEvent) => Math.max(0, e.odometer_after - e.odometer_before),
            type: 'integer' as const,
            width: 12,
            total: true,
        },
        {
            key: 'fuelRate',
            header: t('fuelEvents.fields.fuelRate'),
            accessor: (e: FuelEvent) => {
                const a = map.get(e.ID);
                return a?.status === 'paired' ? a.effectiveRate : e.fuel_rate;
            },
            type: 'number' as const,
            width: 12,
            fontColor: (e: FuelEvent) => rateColor(map, e),
        },
        {
            key: 'status',
            header: t('common.status'),
            accessor: (e: FuelEvent) => {
                const a = map.get(e.ID);
                return a ? t(a.labelKey) : '';
            },
            width: 14,
            fontColor: (e: FuelEvent) => rateColor(map, e),
        },
    ];
}

function rateColor(map: EfficiencyMap, e: FuelEvent): string | undefined {
    const a = map.get(e.ID);
    if (!a) return undefined;
    switch (a.status) {
        case 'good':
            return EXCEL_PALETTE.green;
        case 'average':
            return EXCEL_PALETTE.amber;
        case 'poor':
            return EXCEL_PALETTE.red;
        case 'paired':
            return EXCEL_PALETTE.brand;
        default:
            return EXCEL_PALETTE.muted;
    }
}

function groupEventsBy(
    events: FuelEvent[],
    grouping: FuelEventGrouping,
): Record<string, FuelEvent[]> {
    if (grouping === 'none') return { All: events };
    const buckets: Record<string, FuelEvent[]> = {};
    for (const e of events) {
        const key = grouping === 'vehicle' ? e.car_no_plate : (e.driver_name?.trim() || '—');
        (buckets[key] ??= []).push(e);
    }
    return buckets;
}

function buildSummaryStats(events: FuelEvent[], t: TFunction) {
    const { totals } = analyseEvents(events);

    // Method breakdown for the stats panel — useful when a sheet mixes methods
    let petroApp = 0;
    let manual = 0;
    for (const e of events) {
        if (normaliseMethod(e.method) === 'PetroApp') petroApp++;
        else manual++;
    }

    const stats = [
        {
            label: t('fuelEvents.stats.totalFuel'),
            value: Math.round(totals.totalLiters * 100) / 100,
            type: 'number' as const,
            color: EXCEL_PALETTE.brand,
        },
        {
            label: t('fuelEvents.stats.totalCost'),
            value: Math.round(totals.totalCost * 100) / 100,
            type: 'moneyRaw' as const,
            color: EXCEL_PALETTE.brand,
        },
        {
            label: t('fuelEvents.stats.avgEfficiency'),
            value: `${(Math.round(totals.avgRate * 10) / 10).toFixed(1)} ${t('fuelEvents.efficiency.unit')}`,
            type: 'text' as const,
            color: EXCEL_PALETTE.green,
        },
        {
            label: t('fuelEvents.stats.events', { count: totals.totalEvents }),
            value: totals.totalEvents,
            type: 'number' as const,
            color: EXCEL_PALETTE.violet,
        },
    ];

    // Add a method breakdown when the sheet has more than one method
    if (petroApp > 0 && manual > 0) {
        stats.push({
            label: t('fuelEvents.method.petroApp'),
            value: petroApp,
            type: 'number' as const,
            color: EXCEL_PALETTE.brand,
        });
        stats.push({
            label: t('fuelEvents.method.manual'),
            value: manual,
            type: 'number' as const,
            color: EXCEL_PALETTE.muted,
        });
    }

    return stats;
}

/**
 * Full page export — all events, with per-group sheets when grouping is active.
 */
export async function exportFuelEvents({
    events,
    grouping,
    t,
    meta,
}: ExportFuelEventsArgs): Promise<void> {
    if (events.length === 0) return;

    const { map: overallMap } = analyseEvents(events);
    const overallColumns = buildColumns(t, overallMap);

    const allSheet = {
        name: t('fuelEvents.title'),
        title: t('fuelEvents.title'),
        subtitle: t('fuelEvents.subtitle'),
        columns: overallColumns,
        rows: events,
        stats: buildSummaryStats(events, t),
        totals: true,
    };

    const sheets: typeof allSheet[] = [allSheet];

    if (grouping !== 'none') {
        const groups = groupEventsBy(events, grouping);
        const sortedKeys = Object.keys(groups).sort(
            (a, b) =>
                groups[b].reduce((s, e) => s + e.price, 0) -
                groups[a].reduce((s, e) => s + e.price, 0),
        );

        if (sortedKeys.length > 1) {
            for (const key of sortedKeys) {
                const groupEvents = groups[key];
                const { map: groupMap } = analyseEvents(groupEvents);
                sheets.push({
                    name: key.slice(0, 31),
                    title: `${t('fuelEvents.title')} — ${key}`,
                    subtitle:
                        grouping === 'vehicle'
                            ? t('fuelEvents.fields.carPlate') + ': ' + key
                            : t('fuelEvents.fields.driver') + ': ' + key,
                    columns: buildColumns(t, groupMap),
                    rows: groupEvents,
                    stats: buildSummaryStats(groupEvents, t),
                    totals: true,
                });
            }
        }
    }

    const suffix =
        grouping === 'vehicle'
            ? '-by-vehicle'
            : grouping === 'driver'
                ? '-by-driver'
                : '';

    await exportToExcel({
        filename: `fuel-events${suffix}`,
        meta: meta ?? `${events.length} events · Generated ${fmtDate(new Date())}`,
        sheets,
    });
}

/**
 * Single-group export — just the events for one vehicle or one driver.
 */
export async function exportFuelEventsGroup({
    groupKey,
    events,
    grouping,
    t,
    meta,
}: ExportGroupArgs): Promise<void> {
    if (events.length === 0) return;

    const { map } = analyseEvents(events);

    const slug =
        groupKey
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'group';

    const suffix = grouping === 'vehicle' ? 'vehicle' : 'driver';

    await exportToExcel({
        filename: `fuel-events-${suffix}-${slug}`,
        meta: meta ?? `${groupKey} · ${events.length} events · Generated ${fmtDate(new Date())}`,
        sheets: [
            {
                name: groupKey.slice(0, 31),
                title: `${t('fuelEvents.title')} — ${groupKey}`,
                subtitle:
                    grouping === 'vehicle'
                        ? t('fuelEvents.fields.carPlate') + ': ' + groupKey
                        : t('fuelEvents.fields.driver') + ': ' + groupKey,
                columns: buildColumns(t, map),
                rows: events,
                stats: buildSummaryStats(events, t),
                totals: true,
            },
        ],
    });
}