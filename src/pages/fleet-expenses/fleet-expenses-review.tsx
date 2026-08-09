import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Inbox,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  EyeOff,
  Repeat,
  Layers,
  Gauge,
  MessageSquare,
} from 'lucide-react';

import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { StatCard } from '@/shared/ui/stat-card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { cn } from '@/shared/lib/cn';
import { formatDateTime } from '@/shared/lib/format';
import { usePermissions } from '@/shared/hooks/use-permissions';

import {
  useIgnoredMessages,
  useReclassify,
  useReparseOne,
  useReviewQueue,
} from '@/entities/raw-message/queries';
import { STATUS_TONE, type RawMessage } from '@/entities/raw-message/schemas';

type Tab = 'review' | 'ignored';

/**
 * The human-in-the-loop screen.
 *
 * Both of the "stronger" discriminators the design hoped for are unavailable
 * here: the bank SMS arrive in a 1:1 chat that also carries ordinary
 * conversation, from the same JID, with no forwarder prefix. Content scoring is
 * the only mechanism, so this screen is not a nicety — it is the correction
 * path, and roughly 93% of the chat is chatter the gate has to reject.
 */
export default function FleetExpensesReviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canManageExpenses } = usePermissions();
  const [tab, setTab] = React.useState<Tab>('review');

  const review = useReviewQueue();
  // Only fetched once the tab is opened — the ignored set is large and is not
  // needed to render the default view.
  const ignored = useIgnoredMessages(tab === 'ignored');

  const reclassify = useReclassify();
  const reparse = useReparseOne();

  const active = tab === 'review' ? review : ignored;
  const rows: RawMessage[] = active.data ?? [];

  const recurring = React.useMemo(
    () => rows.filter((r) => r.skeleton_count > 1).length,
    [rows],
  );

  return (
    <PageShell
      title={t('review.title')}
      description={t('review.subtitle')}
      icon={<Inbox className="h-5 w-5" />}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/fleet-expenses')}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('review.backToExpenses')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void active.refetch()}
            disabled={active.isFetching}
          >
            <RefreshCw className={cn('h-4 w-4', active.isFetching && 'animate-spin')} />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </Button>
        </div>
      }
    >
      {/* Stats stack on phones, sit side by side from `sm` up. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard
          label={t('review.stats.queue')}
          value={review.data?.length ?? 0}
          icon={Inbox}
          tone={review.data?.length ? 'warning' : 'success'}
        />
        <StatCard
          label={t('review.stats.recurring')}
          value={recurring}
          subvalue={t('review.stats.recurringHint')}
          icon={Layers}
          tone={recurring ? 'destructive' : 'default'}
        />
        <StatCard
          label={t('review.stats.ignored')}
          value={ignored.data?.length ?? '—'}
          subvalue={t('review.stats.ignoredHint')}
          icon={EyeOff}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="review" className="flex-1 sm:flex-none">
            {t('review.tabs.queue')}
            {review.data?.length ? (
              <span className="ms-1.5 rounded-full bg-amber-500/20 px-1.5 text-xs text-amber-600 dark:text-amber-400">
                {review.data.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="ignored" className="flex-1 sm:flex-none">
            {t('review.tabs.ignored')}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {active.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
          title={tab === 'review' ? t('review.empty.queue') : t('review.empty.ignored')}
          description={
            tab === 'review' ? t('review.empty.queueHint') : t('review.empty.ignoredHint')
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <MessageCard
              key={row.id}
              row={row}
              canAct={canManageExpenses}
              busy={reclassify.isPending || reparse.isPending}
              onMarkTransaction={() =>
                reclassify.mutate({ id: row.id, as: 'transaction' })
              }
              onMarkNoise={() => reclassify.mutate({ id: row.id, as: 'noise' })}
              onReparse={() => reparse.mutate(row.id)}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Card                                                                        */
/*                                                                            */
/* A card rather than a table row on purpose: the payload is a free-text        */
/* message, often long and often Arabic, which a table column cannot show       */
/* without truncating away the thing you need to read to make the decision.     */
/* -------------------------------------------------------------------------- */

function MessageCard({
  row,
  canAct,
  busy,
  onMarkTransaction,
  onMarkNoise,
  onReparse,
}: {
  row: RawMessage;
  canAct: boolean;
  busy: boolean;
  onMarkTransaction: () => void;
  onMarkNoise: () => void;
  onReparse: () => void;
}) {
  const { t } = useTranslation();
  const isRecurring = row.skeleton_count > 1;

  return (
    <Card className={cn(isRecurring && 'border-amber-500/40')}>
      <CardContent className="space-y-3 p-3 sm:p-4">
        {/* Meta row wraps on narrow screens instead of overflowing. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 font-medium',
              STATUS_TONE[row.parse_status] ?? STATUS_TONE.pending,
            )}
          >
            {t(`review.status.${row.parse_status}`, row.parse_status)}
          </span>

          {isRecurring && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-400">
              <Layers className="h-3 w-3" />
              {t('review.seenTimes', { count: row.skeleton_count })}
            </span>
          )}

          {row.triage_score != null && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Gauge className="h-3 w-3" />
              {t('review.score')} {row.triage_score}
            </span>
          )}

          <span className="ms-auto whitespace-nowrap text-muted-foreground">
            {formatDateTime(row.wa_timestamp)}
          </span>
        </div>

        {/*
          `break-words` matters here: bank references and wa_message_ids are long
          unbroken tokens that otherwise force horizontal page scroll on a phone.
          `dir="auto"` lets the browser pick RTL per message — these bodies are a
          mix of Arabic and English.
        */}
        <p
          dir="auto"
          className="whitespace-pre-wrap break-words rounded-md bg-muted/50 p-3 text-sm leading-relaxed"
        >
          {row.body || (
            <span className="italic text-muted-foreground">{t('review.emptyBody')}</span>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <MessageSquare className="h-3 w-3 shrink-0" />
          <span className="break-all">{row.sender ?? '—'}</span>
          {row.is_from_me && (
            <span className="rounded bg-muted px-1.5 py-0.5">{t('review.fromMe')}</span>
          )}
        </div>

        {canAct && (
          // Buttons go full-width and stack on phones so they are comfortably
          // tappable, then sit inline from `sm` up.
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={onMarkTransaction}
              disabled={busy}
              className="w-full sm:w-auto"
            >
              <CheckCircle2 className="h-4 w-4" />
              {t('review.actions.isTransaction')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onMarkNoise}
              disabled={busy}
              className="w-full sm:w-auto"
            >
              <EyeOff className="h-4 w-4" />
              {t('review.actions.isNoise')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onReparse}
              disabled={busy}
              className="w-full sm:w-auto"
            >
              <Repeat className="h-4 w-4" />
              {t('review.actions.reparse')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
