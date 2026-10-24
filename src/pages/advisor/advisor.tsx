import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Bot, ListChecks } from 'lucide-react';
import {
  useAdvisorStatus,
  useAdvisorSuggestions,
  type Suggestion,
} from '@/entities/advisor';
import { AdvisorChat } from '@/widgets/advisor-chat/advisor-chat';
import { useAdvisorChat } from '@/widgets/advisor-chat/use-advisor-chat';
import { ConversationRail } from '@/widgets/advisor-conversation-rail/conversation-rail';
import { AdvisorDigests } from '@/widgets/advisor-digests/advisor-digests';
import { SuggestionCard } from '@/widgets/advisor-suggestion-card/suggestion-card';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

const TABS = ['chat', 'pending', 'digests'] as const;
const RECENT_DECIDED = 10;
type AdvisorTab = (typeof TABS)[number];

/**
 * The AI fleet advisor (permission 4). The page is exactly the height of the
 * layout's scroll area and never taller: the chat's transcript scrolls inside
 * its own pane, the pending and digest tabs inside theirs.
 */
export default function AdvisorPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab: AdvisorTab = TABS.includes(tabParam as AdvisorTab) ? (tabParam as AdvisorTab) : 'chat';
  const setTab = (next: string) =>
    setParams(
      (prev) => {
        if (next === 'chat') prev.delete('tab');
        else prev.set('tab', next);
        return prev;
      },
      { replace: true },
    );

  const status = useAdvisorStatus();
  const enabled = status.data?.enabled ?? false;
  const chat = useAdvisorChat();

  // Every suggestion, so a change decided here stays on screen with its
  // result instead of vanishing from a pending-only list.
  const all = useAdvisorSuggestions();
  const { pendingList, decided } = React.useMemo(() => {
    const list = all.data ?? [];
    return {
      pendingList: list.filter((s) => s.status === 'pending' || s.status === 'applying'),
      decided: list
        .filter((s) => s.status !== 'pending' && s.status !== 'applying')
        .sort((a, b) => (b.decided_at ?? '').localeCompare(a.decided_at ?? ''))
        .slice(0, RECENT_DECIDED),
    };
  }, [all.data]);
  // Inline cards in the transcript read their status from the same list, so
  // a decision made in the Pending tab shows in the chat too.
  const latest = React.useMemo(() => {
    const map = new Map<string, Suggestion>();
    for (const s of all.data ?? []) map.set(s.id, s);
    return map;
  }, [all.data]);

  const pendingCount = pendingList.length;
  const disabledReason = status.isLoading
    ? t('advisor.status.checking')
    : !enabled
      ? t('advisor.status.disabled')
      : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 md:p-6 lg:p-8">
      <header className="flex shrink-0 flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex min-w-0 items-start gap-3">
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:flex">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">
              {t('advisor.title')}
            </h1>
            <p className="text-sm text-muted-foreground">{t('advisor.subtitle')}</p>
          </div>
        </div>
        {status.data && (
          <Badge variant={enabled ? 'success' : 'warning'} className="self-start">
            {enabled
              ? t('advisor.status.enabled', { model: status.data.model ?? '—' })
              : t('advisor.status.off')}
          </Badge>
        )}
      </header>

      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="shrink-0 self-start">
          <TabsTrigger value="chat">{t('advisor.tabs.chat')}</TabsTrigger>
          <TabsTrigger value="pending" className="gap-1.5">
            {t('advisor.tabs.pending')}
            {pendingCount > 0 && (
              <span className="rounded-full bg-warning/15 px-1.5 text-[10.5px] font-semibold tabular-nums text-warning">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="digests">{t('advisor.tabs.digests')}</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="min-h-0 flex-1">
          <div className="flex h-full min-h-0 flex-col gap-3 md:flex-row">
            <ConversationRail
              className="max-h-40 shrink-0 md:max-h-none md:w-64"
              activeId={chat.conversationId}
              locked={chat.streaming}
              onOpen={chat.open}
              onNew={chat.startNew}
              onDeletedActive={chat.startNew}
            />
            <AdvisorChat
              items={chat.items}
              unplaced={chat.unplaced}
              loading={chat.loading}
              loadError={chat.loadError}
              streaming={chat.streaming}
              liveTools={chat.liveTools}
              onSend={(m) => void chat.send(m)}
              onStop={chat.stop}
              disabledReason={disabledReason}
              latest={latest}
            />
          </div>
        </TabsContent>

        <TabsContent value="pending" className="min-h-0 flex-1 overflow-y-auto">
          {all.isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-40 w-full rounded-lg" />
              <Skeleton className="h-40 w-full rounded-lg" />
            </div>
          ) : all.isError ? (
            <p className="py-6 text-center text-sm text-destructive">
              {t('advisor.pending.loadError')}
            </p>
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
              {pendingCount === 0 ? (
                <EmptyState
                  icon={<ListChecks className="h-6 w-6" aria-hidden="true" />}
                  title={t('advisor.pending.emptyTitle')}
                  description={t('advisor.pending.emptyDescription')}
                />
              ) : (
                pendingList.map((s) => <SuggestionCard key={s.id} suggestion={s} />)
              )}
              {decided.length > 0 && (
                <>
                  <h2 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('advisor.pending.recentlyDecided')}
                  </h2>
                  {decided.map((s) => (
                    <SuggestionCard key={s.id} suggestion={s} />
                  ))}
                </>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="digests" className="min-h-0 flex-1 overflow-y-auto">
          <AdvisorDigests enabled={enabled} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
