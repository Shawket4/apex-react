import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type SortingState,
  type ColumnFiltersState,
  type ExpandedState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { Button } from './button';
import { Skeleton } from './skeleton';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: TData) => void;
  pageSize?: number;
  className?: string;
  /**
   * Optional footer row, typically used for column totals.
   *
   * Pass a function that receives the table's data and returns either an
   * array of cell values (one per column, must match `columns.length`) or
   * a fully rendered <tr>. When provided, the table renders a sticky
   * highlighted footer below the body.
   */
  footer?: (data: TData[]) => React.ReactNode[] | React.ReactElement;
  /**
   * Optional row-expansion config.
   *
   * Pass `getRowCanExpand` to gate which rows are expandable, and
   * `renderSubComponent` to render the expanded content (typically a
   * sub-table inset with start-side padding for visual hierarchy).
   *
   * When provided, rows render an additional toggle behaviour — clicking
   * the row toggles expansion (instead of firing `onRowClick`, which is
   * disabled when expansion is enabled to avoid conflicting handlers).
   */
  getRowCanExpand?: (row: Row<TData>) => boolean;
  renderSubComponent?: (row: Row<TData>) => React.ReactNode;
}

/**
 * Generic data table on top of TanStack Table v8.
 *
 * Sortable column headers, client-side filtering, paginated, with optional
 * row-click handler, footer totals slot, and (new) row expansion for
 * drill-down hierarchies.
 *
 * **Row expansion.** When `renderSubComponent` is passed, each row that
 * passes `getRowCanExpand` becomes clickable; clicking toggles the expansion
 * state and renders the sub-component in a full-width row beneath. The
 * sub-component is your responsibility — typically a nested table for the
 * drill-down level. Expansion state is preserved across renders by TanStack
 * Table's internal state machine.
 *
 * Multiple rows can be expanded simultaneously. If you need exclusive (one-
 * at-a-time) expansion, manage the state externally and reset it via
 * controlled props (not currently exposed; add when needed).
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  loading,
  emptyState,
  onRowClick,
  pageSize = 20,
  className,
  footer,
  getRowCanExpand,
  renderSubComponent,
}: DataTableProps<TData, TValue>) {
  const { t } = useTranslation();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [expanded, setExpanded] = React.useState<ExpandedState>({});

  const expansionEnabled = !!renderSubComponent;

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, rowSelection, expanded },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: expansionEnabled ? getExpandedRowModel() : undefined,
    getRowCanExpand,
    initialState: { pagination: { pageSize } },
  });

  // Resolve the footer slot — accept array-of-cells or rendered element forms
  const renderedFooter = React.useMemo(() => {
    if (!footer || loading || data.length === 0) return null;
    const rendered = footer(data);
    if (Array.isArray(rendered)) {
      return (
        <tr className="border-t-2 bg-muted/40 font-semibold">
          {rendered.map((cell, i) => {
            const col = columns[i];
            const align = (col?.meta as { align?: 'start' | 'end' | 'center' } | undefined)?.align;
            return (
              <td
                key={i}
                className={cn(
                  'px-4 py-3 text-sm tabular-nums',
                  align === 'end' && 'text-end',
                  align === 'center' && 'text-center',
                )}
              >
                {cell}
              </td>
            );
          })}
        </tr>
      );
    }
    return rendered;
  }, [footer, data, loading, columns]);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="h-11 px-4 text-start font-medium"
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          type="button"
                          className="flex items-center gap-1 hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {columns.map((_, j) => (
                      <td key={j} className="p-4">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const canExpand =
                    expansionEnabled && row.getCanExpand && row.getCanExpand();
                  const isExpanded = canExpand && row.getIsExpanded();
                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        data-state={row.getIsSelected() && 'selected'}
                        data-expanded={isExpanded ? 'true' : undefined}
                        className={cn(
                          'border-b transition-colors last:border-0 hover:bg-muted/40 data-[state=selected]:bg-muted',
                          (onRowClick || canExpand) && 'cursor-pointer',
                          isExpanded && 'bg-muted/30',
                        )}
                        onClick={() => {
                          if (canExpand) {
                            row.toggleExpanded();
                          } else {
                            onRowClick?.(row.original);
                          }
                        }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3 align-middle">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                      {isExpanded && renderSubComponent && (
                        <tr key={`${row.id}-expanded`} className="bg-muted/10">
                          <td
                            colSpan={row.getVisibleCells().length}
                            className="p-0"
                          >
                            {renderSubComponent(row)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-48 text-center text-muted-foreground">
                    {emptyState ?? t('common.noResults')}
                  </td>
                </tr>
              )}
            </tbody>
            {renderedFooter && <tfoot>{renderedFooter}</tfoot>}
          </table>
        </div>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}