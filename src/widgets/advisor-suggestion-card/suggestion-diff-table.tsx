import { ArrowRight } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { formatDiffValue, humanizeField, suggestionDiffRows, type ValueFormatter } from './suggestion-diff';

interface SuggestionDiffTableProps {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  labels: { field: string; before: string; after: string };
  /** Display name for a field key; defaults to the humanized key. */
  fieldLabel?: (field: string) => string;
  /** Display text for a value, by field; defaults to the plain rendering. */
  formatValue?: ValueFormatter;
}

/**
 * Before → after, one row per field. Changed rows are emphasised; unchanged
 * ones stay for context (which truck, which driver) but recede.
 *
 * The layout is fixed so long values wrap inside their column instead of
 * pushing the card sideways on a phone. Each value cell aligns to the page's
 * start; the value itself is `dir="auto"`, so an Arabic plate in the English
 * UI reads right-to-left without hugging the far edge.
 */
export function SuggestionDiffTable({
  before,
  after,
  labels,
  fieldLabel = humanizeField,
  formatValue = formatDiffValue,
}: SuggestionDiffTableProps) {
  const rows = suggestionDiffRows(before, after, formatValue);
  if (rows.length === 0) return null;

  return (
    <div className="rounded-md border">
      <table className="w-full table-fixed border-collapse text-xs">
        <colgroup>
          <col className="w-[30%]" />
          <col />
          <col className="w-4" />
          <col />
        </colgroup>
        <thead>
          <tr className="bg-muted/50 text-muted-foreground">
            <th scope="col" className="px-2 py-1.5 text-start font-medium">
              {labels.field}
            </th>
            <th scope="col" className="px-2 py-1.5 text-start font-medium">
              {labels.before}
            </th>
            <th scope="col" className="px-0 py-1.5" aria-hidden="true" />
            <th scope="col" className="px-2 py-1.5 text-start font-medium">
              {labels.after}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.field}
              data-changed={row.changed || undefined}
              className={cn('border-t align-top', !row.changed && 'text-muted-foreground')}
            >
              <th scope="row" className="break-words px-2 py-1.5 text-start font-medium">
                {fieldLabel(row.field)}
              </th>
              <td
                className={cn(
                  'px-2 py-1.5 text-start [overflow-wrap:anywhere]',
                  row.changed && 'text-destructive line-through decoration-destructive/50',
                )}
              >
                <span dir="auto">{row.before}</span>
              </td>
              <td className="px-0 py-1.5 text-muted-foreground" aria-hidden="true">
                <ArrowRight className="mt-0.5 h-3 w-3 rtl:rotate-180" />
              </td>
              <td
                className={cn(
                  'px-2 py-1.5 text-start [overflow-wrap:anywhere]',
                  row.changed && 'font-semibold text-success',
                )}
              >
                <span dir="auto">{row.after}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
