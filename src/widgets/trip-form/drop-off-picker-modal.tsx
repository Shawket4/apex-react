import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Search,
  UserMinus,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { useDropOffs } from '@/entities/mapping/queries';
import type { MappingDetail } from '@/entities/mapping/schemas';
import { normalize } from '@/shared/lib/normalize';
import { formatNumber, formatCurrency } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';

const PAGE_SIZE = 15;
const UNREGISTERED_VALUE = '__unregistered__';

interface DropOffPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: string;
  terminal: string;
  /** Currently selected drop-off (string), used to highlight the active option */
  value: string;
  /** Callback fired with both the chosen name and its mapping details (for fee/distance) */
  onSelect: (dropOff: string, mapping?: MappingDetail) => void;
  /** Drop-off names already chosen by sibling containers — disable them in the list */
  excludedDropOffs?: string[];
}

/**
 * Drop-off picker — a paginated, searchable modal with fee/distance shown
 * inline next to each option so the user can compare costs before clicking.
 *
 * The search uses the project-wide `normalize` for Arabic-aware matching
 * (handles diacritics, alif variants, ya/alef-maksura, etc).
 *
 * Includes an "Unregistered" sentinel option that lets the user save trips
 * for drop-offs that don't yet have a mapping row — driver still gets paid,
 * route just shows up as غير مسجل until ops adds the mapping.
 */
export function DropOffPickerModal({
  open,
  onOpenChange,
  company,
  terminal,
  value,
  onSelect,
  excludedDropOffs = [],
}: DropOffPickerModalProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useDropOffs(company, terminal, {
    enabled: open && !!company && !!terminal,
  });
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);

  // Reset on open / parent change
  React.useEffect(() => {
    if (!open) return;
    setSearch('');
    setPage(1);
  }, [open, company, terminal]);

  const dropOffs = data?.data ?? [];
  const mappings = data?.mappings ?? {};

  // Filter (Arabic-aware), then paginate
  const filtered = React.useMemo(() => {
    if (!search.trim()) return dropOffs;
    const needle = normalize(search);
    return dropOffs.filter((d) => normalize(d).includes(needle));
  }, [dropOffs, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const handlePick = (dropOff: string, mapping?: MappingDetail) => {
    onSelect(dropOff, mapping);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('trips.form.dropOffPicker.title')}</DialogTitle>
          <DialogDescription>
            {company && terminal
              ? t('trips.form.dropOffPicker.descriptionWithRoute', {
                  company,
                  terminal,
                })
              : t('trips.form.dropOffPicker.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t('trips.form.dropOffPicker.searchPlaceholder')}
              className="ps-9"
              autoFocus
            />
          </div>

          {/* Always-available unregistered option */}
          <button
            type="button"
            onClick={() => handlePick(UNREGISTERED_VALUE)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md border border-dashed bg-muted/30 px-3 py-2.5 text-start transition-colors hover:bg-muted/60',
              value === UNREGISTERED_VALUE && 'border-solid border-primary bg-primary/5',
            )}
          >
            <UserMinus className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm font-medium">
                {t('trips.form.dropOffPicker.unregistered')}
              </div>
              <div className="text-xs text-muted-foreground">
                {t('trips.form.dropOffPicker.unregisteredHint')}
              </div>
            </div>
            {value === UNREGISTERED_VALUE && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </button>

          {/* Results */}
          <ScrollArea className="h-[340px] rounded-md border">
            {isLoading ? (
              <div className="flex h-full items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pageItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <MapPin className="h-6 w-6" />
                {search
                  ? t('trips.form.dropOffPicker.noMatches')
                  : t('trips.form.dropOffPicker.empty')}
              </div>
            ) : (
              <ul className="divide-y">
                {pageItems.map((dropOff) => {
                  const mapping = mappings[dropOff];
                  const fee = Number(mapping?.fee ?? 0);
                  const distance = Number(mapping?.distance ?? 0);
                  const isSelected = dropOff === value;

                  return (
                    <li key={dropOff}>
                      <button
                        type="button"
                        onClick={() => handlePick(dropOff, mapping)}
                        className={cn(
                          'flex w-full items-center gap-3 px-3 py-2.5 text-start transition-colors',
                          'hover:bg-muted/60',
                          isSelected && 'bg-primary/5',
                        )}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {dropOff}
                            </span>
                          </div>
                          {mapping && (
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {distance > 0 && (
                                <span className="tabular-nums">
                                  {formatNumber(distance, 1)} km
                                </span>
                              )}
                              {fee > 0 && (
                                <span className="tabular-nums text-success">
                                  {formatCurrency(fee)}
                                </span>
                              )}
                              {mapping.route_name && (
                                <span className="truncate">
                                  {mapping.route_name}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="tabular-nums">
                {t('trips.form.dropOffPicker.resultsCount', {
                  shown: pageItems.length,
                  total: filtered.length,
                })}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                </Button>
                <span className="px-2 tabular-nums">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { UNREGISTERED_VALUE as DROP_OFF_UNREGISTERED };
