import type { ConversationDetail, Suggestion, ToolRun } from '@/entities/advisor';

export interface ChatItem {
  key: string;
  role: 'user' | 'assistant';
  text: string;
  tools: ToolRun[];
  /** Suggestions this answer proposed, rendered under it. */
  suggestions: Suggestion[];
  /** The turn failed; `text` is the reason. */
  error?: boolean;
}

/**
 * A stored conversation as chat items.
 *
 * Stored messages do not say which answer proposed which suggestion. When
 * exactly one answer used `propose_change` they all belong to it; otherwise
 * they are returned separately (`unplaced`) and shown after the transcript
 * rather than pinned to an answer that may not have written them.
 */
export function itemsFromDetail(detail: ConversationDetail): {
  items: ChatItem[];
  unplaced: Suggestion[];
} {
  const items: ChatItem[] = detail.messages.map((m, i) => ({
    key: `${detail.id}:${i}`,
    role: m.role,
    text: m.text,
    tools: m.tools.map((name) => ({ name })),
    suggestions: [],
  }));
  if (detail.suggestions.length === 0) return { items, unplaced: [] };

  const proposers = items.filter(
    (it) => it.role === 'assistant' && it.tools.some((tool) => tool.name === 'propose_change'),
  );
  if (proposers.length === 1) {
    proposers[0].suggestions = detail.suggestions;
    return { items, unplaced: [] };
  }
  return { items, unplaced: detail.suggestions };
}
