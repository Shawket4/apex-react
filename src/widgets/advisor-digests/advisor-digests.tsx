import { useTranslation } from 'react-i18next';
import { Loader2, NotebookPen, RefreshCw } from 'lucide-react';
import { useAdvisorDigests, useRunDigest } from '@/entities/advisor';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Markdown } from '@/shared/ui/markdown';
import { Skeleton } from '@/shared/ui/skeleton';
import { format, formatDateTime } from '@/shared/lib/format';

const DIGEST_SPANS = [1, 7] as const;

export function AdvisorDigests({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const { data, isLoading, isError, isFetching, refetch } = useAdvisorDigests();
  const run = useRunDigest();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t('advisor.digests.description')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void refetch()}
            aria-label={t('common.refresh')}
          >
            <RefreshCw className={isFetching ? 'animate-spin' : undefined} aria-hidden="true" />
          </Button>
          {DIGEST_SPANS.map((days) => (
            <Button
              key={days}
              variant={days === 1 ? 'default' : 'outline'}
              disabled={!enabled || run.isPending}
              onClick={() => run.mutate(days)}
            >
              {run.isPending && run.variables === days ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <NotebookPen aria-hidden="true" />
              )}
              {t('advisor.digests.writeNow', { count: days })}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      ) : isError ? (
        <p className="py-6 text-center text-sm text-destructive">{t('advisor.digests.loadError')}</p>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<NotebookPen className="h-6 w-6" aria-hidden="true" />}
          title={t('advisor.digests.emptyTitle')}
          description={t('advisor.digests.emptyDescription')}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
                  <h3 className="text-sm font-semibold tabular-nums">
                    {d.period_start === d.period_end
                      ? format(d.period_start, 'd MMM yyyy')
                      : `${format(d.period_start, 'd MMM')} – ${format(d.period_end, 'd MMM yyyy')}`}
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    {[formatDateTime(d.created_at), d.model].filter(Boolean).join(' · ')}
                  </span>
                </div>
                <Markdown>{d.body}</Markdown>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
