import { ArrowRight } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { humanizeField, suggestionDiffRows } from './suggestion-diff';

interface SuggestionDiffTableProps {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  labels: { field: string; before: string; after: string };
  /** Display name for a field key; defaults to the humanized key. */
  fieldLabel?: (field: string) => string;
}

/**
 * Before → after, one row per field. Changed rows are emphasised; unchanged
 * ones stay for context (which truck, which driver) but recede.
 */
export function SuggestionDiffTable({
  before,
  after,
  labels,
  fieldLabel = humanizeField,
}: SuggestionDiffTableProps) {
  const rows = suggestionDiffRows(before, after);
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-muted/50 text-muted-foreground">
            <th scope="col" className="px-2 py-1.5 text-start font-medium">
              {labels.field}
            </th>
            <th scope="col" className="px-2 py-1.5 text-start font-medium">
              {labels.before}
            </th>
            <th scope="col" className="w-4 px-0 py-1.5" aria-hidden="true" />
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
              className={cn('border-t', !row.changed && 'text-muted-foreground')}
            >
              <th scope="row" className="px-2 py-1.5 text-start font-medium">
                {fieldLabel(row.field)}
              </th>
              <td dir="auto" className={cn('px-2 py-1.5', row.changed && 'text-destructive line-through decoration-destructive/50')}>
                {row.before}
              </td>
              <td className="px-0 py-1.5 text-muted-foreground" aria-hidden="true">
                <ArrowRight className="h-3 w-3 rtl:rotate-180" />
              </td>
              <td dir="auto" className={cn('px-2 py-1.5', row.changed && 'font-semibold text-success')}>
                {row.after}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
