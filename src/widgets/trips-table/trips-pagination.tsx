import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { cn } from '@/shared/lib/cn';

interface TripsPaginationProps {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  loading?: boolean;
  className?: string;
}

const LIMIT_OPTIONS = [10, 25, 50, 100];

/**
 * Server-side pagination strip.
 *
 *   - Per-page selector (10 / 25 / 50 / 100)
 *   - Page numbers with ellipsis for long ranges
 *   - Jump-to-page input (lg+ only, when pages > 5)
 *   - Mobile collapses to "page X of Y" + prev/next
 *
 * All chevrons RTL-flip via Tailwind's `rtl:rotate-180` so Arabic users get
 * the expected direction without a separate component.
 */
export function TripsPagination({
  page,
  pages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  loading,
  className,
}: TripsPaginationProps) {
  const { t } = useTranslation();
  const [jumpValue, setJumpValue] = React.useState('');

  // Don't render at all when there's nothing to paginate AND results fit in
  // the smallest page size — keeps short-list pages clean.
  if (pages <= 1 && total <= LIMIT_OPTIONS[0]) return null;

  const startItem = total > 0 ? (page - 1) * limit + 1 : 0;
  const endItem = Math.min(page * limit, total);

  const handleJump = () => {
    const n = parseInt(jumpValue, 10);
    if (Number.isFinite(n) && n >= 1 && n <= pages) {
      onPageChange(n);
      setJumpValue('');
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      {/* Left: results count + per-page selector */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="tabular-nums">
          <span className="font-medium text-foreground">{startItem}</span>–
          <span className="font-medium text-foreground">{endItem}</span>{' '}
          {t('trips.pagination.of')}{' '}
          <span className="font-medium text-foreground">{total}</span>
        </span>
        <div className="hidden items-center gap-1.5 sm:flex">
          <span>·</span>
          <span>{t('trips.pagination.perPage')}:</span>
          <Select
            value={String(limit)}
            onValueChange={(v) => onLimitChange(Number(v))}
            disabled={loading}
          >
            <SelectTrigger className="h-7 w-[70px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIMIT_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Right: page navigation */}
      <div className="flex items-center gap-1.5">
        {pages > 5 && (
          <div className="hidden items-center gap-1.5 lg:flex">
            <span className="text-xs text-muted-foreground">
              {t('trips.pagination.goTo')}:
            </span>
            <Input
              type="number"
              min={1}
              max={pages}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJump();
              }}
              placeholder={String(page)}
              className="h-7 w-16 text-xs"
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              disabled={!jumpValue || loading}
              onClick={handleJump}
            >
              {t('trips.pagination.go')}
            </Button>
            <span className="text-xs text-muted-foreground">·</span>
          </div>
        )}

        <div className="flex items-center gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="hidden h-8 w-8 sm:inline-flex"
            disabled={page === 1 || loading}
            onClick={() => onPageChange(1)}
            aria-label={t('trips.pagination.firstPage')}
          >
            <ChevronsLeft className="h-4 w-4 rtl:rotate-180" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            disabled={page === 1 || loading}
            onClick={() => onPageChange(page - 1)}
            aria-label={t('trips.pagination.previousPage')}
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </Button>
          <div className="hidden items-center gap-0.5 sm:flex">
            {getPageNumbers(page, pages).map((entry, i) =>
              entry === 'ellipsis' ? (
                <span
                  key={`e-${i}`}
                  className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              ) : (
                <Button
                  key={entry}
                  size="icon"
                  variant={entry === page ? 'default' : 'ghost'}
                  className="h-8 w-8 text-xs tabular-nums"
                  onClick={() => onPageChange(entry)}
                  disabled={loading}
                >
                  {entry}
                </Button>
              ),
            )}
          </div>
          <span className="px-2 text-xs tabular-nums sm:hidden">
            {page} / {pages}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            disabled={page === pages || loading}
            onClick={() => onPageChange(page + 1)}
            aria-label={t('trips.pagination.nextPage')}
          >
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hidden h-8 w-8 sm:inline-flex"
            disabled={page === pages || loading}
            onClick={() => onPageChange(pages)}
            aria-label={t('trips.pagination.lastPage')}
          >
            <ChevronsRight className="h-4 w-4 rtl:rotate-180" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Compute which page numbers to show, with 'ellipsis' markers for long ranges.
 * Output stays under ~7 entries to keep the bar visually quiet.
 */
function getPageNumbers(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis', total];
  }
  if (current >= total - 3) {
    return [1, 'ellipsis', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total];
}
