import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Inbox, RefreshCw, Search } from 'lucide-react';

import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';
import { formatCairoDateTime } from '@/shared/lib/cairo';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { usePermissions } from '@/shared/hooks/use-permissions';

import { useMessagesPaged } from '@/entities/raw-message/queries';
import {
  MESSAGE_STATUSES,
  STATUS_TONE,
  type Message,
  type MessageStatus,
} from '@/entities/raw-message/schemas';

/**
 * The Messages screen — every verdict the parser made, searchable.
 *
 * These are verdicts, not work items: nothing demands emptying. `matched`
 * minted a transaction; `suppressed` was excluded on purpose (the PetroApp
 * double-count guard) and the card says why in words; `ignored` matched no
 * template, and a wrongly-ignored bank SMS gets exactly one action — "Record
 * as transaction" — which opens the create form with the message pinned
 * alongside. Terminal and visible; nothing re-queues.
 */
export default function FleetExpensesMessagesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { canManageExpenses } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const [status, setStatus] = React.useState<MessageStatus>(() => {
    const s = searchParams.get('status');
    return (MESSAGE_STATUSES as readonly string[]).includes(s ?? '')
      ? (s as MessageStatus)
      : 'ignored';
  });
  // Off by default: 254 empty-body media rows would drown the list.
  const [includeMedia, setIncludeMedia] = React.useState(
    () => searchParams.get('media') === '1',
  );
  const [search, setSearch] = React.useState(() => searchParams.get('q') ?? '');
  const debouncedSearch = useDebounce(search, 250);

  React.useEffect(() => {
    const next = new URLSearchParams();
    if (status !== 'ignored') next.set('status', status);
    if (includeMedia) next.set('media', '1');
    if (debouncedSearch) next.set('q', debouncedSearch);
    setSearchParams(next, { replace: true });
  }, [status, includeMedia, debouncedSearch, setSearchParams]);

  const query = useMessagesPaged({
    status,
    q: debouncedSearch || undefined,
    include_media: includeMedia ? 'true' : undefined,
  });

  const messages = React.useMemo(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data],
  );

  return (
    <PageShell
      title={t('messages.title')}
      description={t('messages.subtitle')}
      icon={<Inbox className="h-5 w-5" />}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/fleet-expenses')}>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            <span className="hidden sm:inline">{t('messages.backToExpenses')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </Button>
        </div>
      }
    >
      {/* ── Chips + search ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {MESSAGE_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                'min-h-8 shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                status === s
                  ? 'border-foreground bg-foreground text-background'
                  : 'bg-card text-muted-foreground hover:bg-accent',
              )}
            >
              {t(`messages.chips.${s}`)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIncludeMedia((v) => !v)}
            aria-pressed={includeMedia}
            className={cn(
              'min-h-8 shrink-0 rounded-full border border-dashed px-3 py-1 text-xs font-semibold transition-colors',
              includeMedia
                ? 'border-foreground bg-foreground text-background'
                : 'bg-card text-muted-foreground hover:bg-accent',
            )}
          >
            {t('messages.chips.media')}
          </button>
        </div>

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('messages.searchPlaceholder')}
            className="ps-9"
            dir="auto"
          />
        </div>
      </div>

      {/* ── Cards ─────────────────────────────────────────────────────────── */}
      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-8 w-8" />}
          title={t('messages.empty.title')}
          description={t('messages.empty.hint')}
        />
      ) : (
        <>
          <div className="space-y-3">
            {messages.map((message) => (
              <MessageCard
                key={message.id}
                message={message}
                canAct={canManageExpenses}
                language={i18n.language}
              />
            ))}
          </div>

          {query.hasNextPage && (
            <div className="flex justify-center py-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
                className="w-full sm:w-auto"
              >
                {query.isFetchingNextPage ? t('common.loading') : t('common.loadMore')}
              </Button>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Card                                                                        */
/*                                                                            */
/* A card, not a table row: the payload is a free-text message, often long     */
/* and often Arabic. Verbatim body, dir="auto", pre-wrap, and                  */
/* overflow-wrap:anywhere so a bare-hex reference wraps at 375px instead of    */
/* forcing horizontal scroll.                                                  */
/* -------------------------------------------------------------------------- */

function MessageCard({
  message,
  canAct,
  language,
}: {
  message: Message;
  canAct: boolean;
  language: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const pill = message.template
    ? `${t(`messages.status.${message.status}`, message.status)} · ${message.template}`
    : t(`messages.status.${message.status}`, message.status);

  return (
    <div className="rounded-lg border bg-card p-3 sm:p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            STATUS_TONE[message.status] ?? STATUS_TONE.ignored,
          )}
        >
          {message.transaction_id && message.status === 'ignored'
            ? t('messages.recordedPill')
            : pill}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatCairoDateTime(message.wa_timestamp, language)}
        </span>
      </div>

      <p
        dir="auto"
        className="whitespace-pre-wrap break-words rounded-md bg-muted/50 p-3 text-sm leading-relaxed [overflow-wrap:anywhere]"
      >
        {message.body || (
          <span className="italic text-muted-foreground">{t('messages.emptyBody')}</span>
        )}
      </p>

      {message.is_from_me && (
        <p className="mt-1.5 text-xs text-muted-foreground">{t('messages.fromMe')}</p>
      )}

      {/* One line of consequence per verdict. */}
      {message.status === 'suppressed' && (
        <p className="mt-2 text-xs text-muted-foreground">{t('messages.suppressedWhy')}</p>
      )}

      {message.transaction_id ? (
        <p className="mt-2 text-sm">
          <Link
            to={`/fleet-expenses/${message.transaction_id}/edit`}
            state={{ from: 'messages' }}
            className="font-semibold text-primary hover:underline"
          >
            {message.status === 'matched'
              ? t('messages.toTransaction', { id: message.transaction_id })
              : t('messages.recordedAs', { id: message.transaction_id })}
          </Link>
        </p>
      ) : message.status === 'ignored' && canAct ? (
        <div className="mt-2.5">
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() =>
              navigate(`/fleet-expenses/new?raw_message_id=${message.id}`, {
                state: { from: 'messages' },
              })
            }
          >
            {t('messages.recordAsTransaction')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
