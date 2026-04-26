import { useTranslation } from 'react-i18next';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';
import type { EnrichmentResult } from '@/entities/fee-mapping/schemas';

interface BulkEnrichDialogProps {
  results: EnrichmentResult[] | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Bulk OSRM enrichment results overlay.
 *
 * Shown after `POST /api/mappings/enrich-osrm` completes. The backend
 * processes every mapping with a valid coord and returns one result per
 * row, including per-row failures (mostly OSRM routing errors). Listed in
 * order with success/failure indicators.
 */
export function BulkEnrichDialog({ results, onOpenChange }: BulkEnrichDialogProps) {
  const { t } = useTranslation();
  const open = results !== null;

  if (!results) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  const succeeded = results.filter((r) => !r.error).length;
  const failed = results.length - succeeded;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>{t('feeMappings.bulkEnrich.title')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2">
            <SummaryCard
              label={t('feeMappings.bulkEnrich.processed')}
              value={results.length}
              tone="neutral"
            />
            <SummaryCard
              label={t('feeMappings.bulkEnrich.succeeded')}
              value={succeeded}
              tone="success"
            />
            <SummaryCard
              label={t('feeMappings.bulkEnrich.failed')}
              value={failed}
              tone={failed > 0 ? 'destructive' : 'neutral'}
            />
          </div>

          {/* Per-row results */}
          <div className="overflow-hidden rounded-md border">
            <ul className="divide-y">
              {results.map((r) => (
                <li
                  key={r.id}
                  className={cn(
                    'flex items-start gap-2.5 px-3 py-2 text-xs',
                    r.error && 'bg-destructive/5',
                  )}
                >
                  {r.error ? (
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.drop_off_point}</div>
                    {r.error ? (
                      <div className="text-destructive">{r.error}</div>
                    ) : (
                      <div className="text-muted-foreground tabular-nums">
                        {r.osrm_distance_km?.toFixed(2)} km · {r.osrm_duration_min?.toFixed(0)} min
                        {r.discrepancy_km != null && (
                          <>
                            {' '}
                            · Δ {r.discrepancy_km > 0 ? '+' : ''}
                            {r.discrepancy_km.toFixed(2)} km
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="me-1.5 h-3.5 w-3.5" />
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'success' | 'destructive';
}) {
  const cls = {
    neutral: 'bg-muted text-foreground',
    success: 'bg-success/10 text-success',
    destructive: 'bg-destructive/10 text-destructive',
  }[tone];
  return (
    <div className={cn('rounded-md p-2.5 text-center', cls)}>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-80">{label}</div>
    </div>
  );
}
