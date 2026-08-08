import type { TFunction } from 'i18next';
import { exportToExcel, EXCEL_PALETTE } from '@/shared/lib/excel';
import { fmtDate } from '@/shared/lib/format';
import type { Transaction, TransactionStatistics } from '@/entities/transaction/schemas';

interface ExportArgs {
  rows: Transaction[];
  statistics?: TransactionStatistics;
  t: TFunction;
  meta?: string;
}

function buildColumns(t: TFunction) {
  return [
    {
      key: 'date',
      header: t('fleetExpenses.fields.date'),
      accessor: (r: Transaction) => fmtDate(r.occurred_at ?? r.created_at),
      width: 16,
    },
    {
      key: 'description',
      header: t('fleetExpenses.fields.description'),
      accessor: (r: Transaction) => r.description || r.counterparty || '—',
      width: 34,
    },
    {
      key: 'type',
      header: t('fleetExpenses.fields.expenseType'),
      accessor: (r: Transaction) => r.category || '—',
      width: 16,
    },
    {
      key: 'car',
      header: t('fleetExpenses.fields.car'),
      accessor: (r: Transaction) => r.car_no_plate || '—',
      width: 16,
    },
    {
      key: 'company',
      header: t('fleetExpenses.fields.company'),
      accessor: (r: Transaction) => r.company || '—',
      width: 16,
    },
    {
      key: 'paymentMethod',
      header: t('fleetExpenses.fields.paymentMethod'),
      accessor: (r: Transaction) => r.payment_method || '—',
      width: 16,
    },
    {
      key: 'paidBy',
      header: t('fleetExpenses.fields.paidBy'),
      accessor: (r: Transaction) => r.paid_by || '—',
      width: 18,
    },
    {
      key: 'source',
      header: t('fleetExpenses.fields.source'),
      accessor: (r: Transaction) => t(`fleetExpenses.sources.${r.source}`, r.source),
      width: 14,
    },
    {
      key: 'reference',
      header: t('fleetExpenses.fields.reference'),
      accessor: (r: Transaction) => r.reference || '—',
      width: 20,
    },
    {
      key: 'amount',
      header: t('fleetExpenses.fields.amount'),
      accessor: (r: Transaction) => r.amount ?? 0,
      type: 'money' as const,
      width: 16,
      total: true,
    },
    {
      // Derived from the 0.1% IPN fee, not a stored column. Exported so the
      // figures can be reconciled against a bank statement.
      key: 'fee',
      header: t('fleetExpenses.fields.fee'),
      accessor: (r: Transaction) => r.fee ?? 0,
      type: 'money' as const,
      width: 14,
      total: true,
    },
  ];
}

export async function exportFleetExpenses({
  rows,
  statistics,
  t,
  meta,
}: ExportArgs): Promise<void> {
  const stats = statistics
    ? [
        {
          label: t('fleetExpenses.stats.total'),
          value: statistics.total_amount,
          type: 'money' as const,
          color: EXCEL_PALETTE.brand,
        },
        {
          label: t('fleetExpenses.stats.count'),
          value: statistics.expense_count,
          type: 'number' as const,
        },
        {
          label: t('fleetExpenses.stats.fees'),
          value: statistics.total_fees,
          type: 'money' as const,
        },
      ]
    : undefined;

  await exportToExcel({
    filename: `fleet-expenses-${new Date().toISOString().slice(0, 10)}`,
    meta,
    sheets: [
      {
        name: 'Expenses',
        title: t('fleetExpenses.title'),
        subtitle: t('fleetExpenses.subtitle'),
        columns: buildColumns(t),
        rows,
        stats,
        totals: true,
      },
      // A second sheet rather than a merged one: the breakdowns are aggregates
      // over the same rows, and interleaving them with line items makes the
      // totals row ambiguous.
      ...(statistics
        ? [
            {
              name: 'Breakdown',
              title: t('fleetExpenses.breakdownTitle'),
              columns: [
                {
                  key: 'dimension',
                  header: t('fleetExpenses.breakdownDimension'),
                  accessor: (r: BreakdownRow) => r.dimension,
                  width: 20,
                },
                {
                  key: 'key',
                  header: t('fleetExpenses.breakdownKey'),
                  accessor: (r: BreakdownRow) => r.key,
                  width: 28,
                },
                {
                  key: 'count',
                  header: t('fleetExpenses.stats.count'),
                  accessor: (r: BreakdownRow) => r.count,
                  type: 'integer' as const,
                  width: 12,
                },
                {
                  key: 'total',
                  header: t('fleetExpenses.fields.amount'),
                  accessor: (r: BreakdownRow) => r.total,
                  type: 'money' as const,
                  width: 18,
                },
              ],
              rows: flattenBreakdowns(statistics, t),
            },
          ]
        : []),
    ],
  });
}

interface BreakdownRow {
  dimension: string;
  key: string;
  count: number;
  total: number;
}

function flattenBreakdowns(s: TransactionStatistics, t: TFunction): BreakdownRow[] {
  const dims: Array<[string, TransactionStatistics['by_type']]> = [
    [t('fleetExpenses.fields.expenseType'), s.by_type],
    [t('fleetExpenses.fields.car'), s.by_car],
    [t('fleetExpenses.fields.company'), s.by_company],
    [t('fleetExpenses.fields.paymentMethod'), s.by_payment_method],
    [t('fleetExpenses.fields.source'), s.by_source],
  ];

  return dims.flatMap(([dimension, items]) =>
    items.map((b) => ({
      dimension,
      key: b.key,
      count: b.count,
      total: b.total_amount,
    })),
  );
}
