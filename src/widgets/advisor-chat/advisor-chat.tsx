import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, SendHorizontal, Sparkles, Square, TriangleAlert } from 'lucide-react';
import type { Suggestion } from '@/entities/advisor';
import { SuggestionCard } from '@/widgets/advisor-suggestion-card/suggestion-card';
import { Button } from '@/shared/ui/button';
import { Markdown } from '@/shared/ui/markdown';
import { Skeleton } from '@/shared/ui/skeleton';
import { Textarea } from '@/shared/ui/textarea';
import { cn } from '@/shared/lib/cn';
import { LiveToolChips, ToolRunChips } from './tool-chips';
import type { ChatItem } from './transcript';

export const MAX_MESSAGE_LENGTH = 4000;

interface AdvisorChatProps {
  items: ChatItem[];
  unplaced: Suggestion[];
  loading: boolean;
  loadError: boolean;
  streaming: boolean;
  liveTools: string[];
  onSend: (message: string) => void;
  onStop: () => void;
  /** Why the composer is off (advisor not configured); null when it is on. */
  disabledReason: string | null;
  /** Fresher copies of suggestions (by id) than the transcript holds. */
  latest: Map<string, Suggestion>;
}

/**
 * Transcript and composer. The transcript scrolls inside its own pane and the
 * composer stays pinned under it: the component fills whatever height its
 * parent gives it and never grows the page.
 */
export function AdvisorChat({
  items,
  unplaced,
  loading,
  loadError,
  streaming,
  liveTools,
  onSend,
  onStop,
  disabledReason,
  latest,
}: AdvisorChatProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Follow the conversation as it grows.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items.length, liveTools.length, streaming, unplaced.length]);

  const canSend = !disabledReason && !streaming && draft.trim().length > 0;
  const submit = () => {
    if (!canSend) return;
    onSend(draft);
    setDraft('');
  };

  const fresh = (s: Suggestion) => latest.get(s.id) ?? s;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5"
        role="log"
        aria-label={t('advisor.chat.transcript')}
      >
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="ms-auto h-10 w-2/3 rounded-lg" />
            <Skeleton className="h-24 w-5/6 rounded-lg" />
          </div>
        ) : loadError ? (
          <p className="py-10 text-center text-sm text-destructive">{t('advisor.chat.loadError')}</p>
        ) : items.length === 0 && !streaming ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Bot className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-foreground">{t('advisor.chat.emptyTitle')}</p>
            <p className="max-w-md text-xs">{t('advisor.chat.emptyDescription')}</p>
          </div>
        ) : (
          <ol className="flex flex-col gap-4">
            {items.map((item) => (
              <li
                key={item.key}
                className={cn('flex flex-col gap-2', item.role === 'user' ? 'items-end' : 'items-start')}
              >
                {item.role === 'user' ? (
                  <div
                    dir="auto"
                    className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-ee-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground"
                  >
                    {item.text}
                  </div>
                ) : item.error ? (
                  <div
                    role="alert"
                    dir="auto"
                    className="flex max-w-[85%] items-start gap-2 rounded-2xl rounded-es-sm border border-destructive/40 bg-destructive/10 px-3.5 py-2 text-sm text-destructive"
                  >
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{item.text}</span>
                  </div>
                ) : (
                  <div className="w-full max-w-[92%] rounded-2xl rounded-es-sm border bg-background px-3.5 py-2.5">
                    <Markdown>{item.text}</Markdown>
                    <ToolRunChips tools={item.tools} />
                  </div>
                )}
                {item.suggestions.length > 0 && (
                  <div className="flex w-full max-w-[92%] flex-col gap-2">
                    {item.suggestions.map((s) => (
                      <SuggestionCard key={s.id} suggestion={fresh(s)} />
                    ))}
                  </div>
                )}
              </li>
            ))}
            {streaming && (
              <li className="flex flex-col items-start gap-2">
                <LiveToolChips tools={liveTools} />
              </li>
            )}
            {unplaced.length > 0 && (
              <li className="flex flex-col gap-2 border-t pt-4">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  {t('advisor.chat.proposedHere')}
                </p>
                {unplaced.map((s) => (
                  <SuggestionCard key={s.id} suggestion={fresh(s)} className="max-w-[92%]" />
                ))}
              </li>
            )}
          </ol>
        )}
      </div>

      <form
        className="shrink-0 border-t bg-card p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {disabledReason && (
          <p className="mb-2 text-xs text-muted-foreground">{disabledReason}</p>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            dir="auto"
            name="message"
            aria-label={t('advisor.chat.placeholder')}
            placeholder={t('advisor.chat.placeholder')}
            className="max-h-40 min-h-[44px] resize-none"
            rows={1}
            maxLength={MAX_MESSAGE_LENGTH}
            value={draft}
            disabled={!!disabledReason}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
          />
          {streaming ? (
            <Button type="button" variant="outline" size="icon" onClick={onStop} aria-label={t('advisor.chat.stop')}>
              <Square aria-hidden="true" />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!canSend} aria-label={t('advisor.chat.send')}>
              <SendHorizontal className="rtl:rotate-180" aria-hidden="true" />
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-[10.5px] text-muted-foreground">{t('advisor.chat.hint')}</p>
      </form>
    </div>
  );
}
