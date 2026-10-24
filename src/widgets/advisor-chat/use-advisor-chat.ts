import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  advisorApi,
  advisorKeys,
  useAdvisorConversation,
  type Suggestion,
} from '@/entities/advisor';
import { extractErrorMessage } from '@/shared/api/errors';
import { itemsFromDetail, type ChatItem } from './transcript';

let seq = 0;
const nextKey = () => `local:${++seq}`;

/**
 * The advisor chat's state: which conversation is open (`?c=` in the URL, so
 * it survives a reload and can be linked), its transcript, and the turn in
 * flight.
 *
 * A conversation opened from the rail is read from the server. Once this tab
 * talks in it, the transcript is kept locally instead — that copy knows which
 * answer proposed which suggestion, which the stored one cannot say.
 */
export function useAdvisorChat() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const conversationId = params.get('c');

  const [local, setLocal] = React.useState<{
    id: string | null;
    items: ChatItem[];
    unplaced: Suggestion[];
  }>({ id: null, items: [], unplaced: [] });
  const [streaming, setStreaming] = React.useState(false);
  const [liveTools, setLiveTools] = React.useState<string[]>([]);
  const abortRef = React.useRef<AbortController | null>(null);

  const isLocal = local.id === conversationId;
  const detail = useAdvisorConversation(isLocal ? null : conversationId);

  const fromServer = React.useMemo(
    () => (detail.data ? itemsFromDetail(detail.data) : { items: [], unplaced: [] as Suggestion[] }),
    [detail.data],
  );
  const items = isLocal ? local.items : fromServer.items;
  const unplaced = isLocal ? local.unplaced : fromServer.unplaced;

  const setConversation = React.useCallback(
    (id: string | null) => {
      setParams(
        (prev) => {
          if (id) prev.set('c', id);
          else prev.delete('c');
          return prev;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const open = React.useCallback(
    (id: string) => {
      if (streaming) return;
      setConversation(id);
    },
    [setConversation, streaming],
  );

  const startNew = React.useCallback(() => {
    if (streaming) return;
    setLocal({ id: null, items: [], unplaced: [] });
    setConversation(null);
  }, [setConversation, streaming]);

  const stop = React.useCallback(() => abortRef.current?.abort(), []);

  // Leaving the page cancels the turn in flight.
  React.useEffect(() => () => abortRef.current?.abort(), []);

  const send = React.useCallback(
    async (message: string) => {
      const text = message.trim();
      if (!text || streaming) return;

      let cid = conversationId;
      // Carry the stored transcript over so the new turn appends to what is
      // on screen.
      const seed = isLocal ? local : { id: cid, ...fromServer };
      setLocal({
        id: cid,
        items: [...seed.items, { key: nextKey(), role: 'user', text, tools: [], suggestions: [] }],
        unplaced: seed.unplaced,
      });
      setStreaming(true);
      setLiveTools([]);

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        await advisorApi.streamChat(
          { conversation_id: cid ?? undefined, message: text },
          {
            signal: controller.signal,
            onEvent: (event) => {
              switch (event.type) {
                case 'conversation':
                  cid = event.data.conversation_id;
                  setLocal((l) => ({ ...l, id: cid }));
                  setConversation(cid);
                  void queryClient.invalidateQueries({ queryKey: advisorKeys.conversations() });
                  break;
                case 'tool':
                  setLiveTools((tools) => [...tools, event.data.name]);
                  break;
                case 'answer':
                  setLocal((l) => ({
                    ...l,
                    items: [
                      ...l.items,
                      {
                        key: nextKey(),
                        role: 'assistant',
                        text: event.data.answer,
                        tools: event.data.tools,
                        suggestions: event.data.suggestions,
                      },
                    ],
                  }));
                  break;
                case 'error':
                  break; // streamChat rejects with it below
              }
            },
          },
        );
      } catch (err) {
        if (!controller.signal.aborted) {
          setLocal((l) => ({
            ...l,
            items: [
              ...l.items,
              {
                key: nextKey(),
                role: 'assistant',
                text: extractErrorMessage(err),
                tools: [],
                suggestions: [],
                error: true,
              },
            ],
          }));
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setStreaming(false);
        setLiveTools([]);
        void queryClient.invalidateQueries({ queryKey: advisorKeys.conversations() });
        void queryClient.invalidateQueries({ queryKey: advisorKeys.suggestions() });
        // The cached stored copy is now behind; read it fresh next time.
        if (cid) queryClient.removeQueries({ queryKey: advisorKeys.conversation(cid) });
      }
    },
    [conversationId, fromServer, isLocal, local, queryClient, setConversation, streaming],
  );

  return {
    conversationId,
    items,
    unplaced,
    loading: !isLocal && !!conversationId && detail.isLoading,
    loadError: !isLocal && detail.isError,
    streaming,
    liveTools,
    open,
    startNew,
    send,
    stop,
  };
}
