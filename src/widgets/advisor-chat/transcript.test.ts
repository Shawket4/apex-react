import { describe, expect, it } from 'vitest';
import { conversationDetailSchema, suggestionSchema } from '@/entities/advisor/schemas';
import { itemsFromDetail } from './transcript';

const suggestion = suggestionSchema.parse({
  id: 's1',
  conversation_id: 'c1',
  kind: 'assign_driver',
  title: 'Put Mahmoud on 1234',
  rationale: null,
  before: { driver_name: 'Ahmed' },
  after: { driver_name: 'Mahmoud' },
  target: 'falcongo',
  method: 'PUT',
  path: '/api/cars/12',
  body: {},
  status: 'pending',
  proposed_for_user_id: 3,
  decided_by_user_id: null,
  decided_at: null,
  applied_at: null,
  result_status: null,
  result: null,
  created_at: '2026-10-24T10:00:00Z',
});

const detail = (tools: (string[] | undefined)[]) =>
  conversationDetailSchema.parse({
    id: 'c1',
    messages: tools.map((t, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      text: `m${i}`,
      tools: t,
    })),
    suggestions: [suggestion],
  });

describe('itemsFromDetail', () => {
  it('pins suggestions to the one answer that proposed changes', () => {
    const { items, unplaced } = itemsFromDetail(
      detail([undefined, ['fleet_overview'], undefined, ['find_truck', 'propose_change']]),
    );
    expect(unplaced).toEqual([]);
    expect(items[3].suggestions.map((s) => s.id)).toEqual(['s1']);
    expect(items[1].suggestions).toEqual([]);
    expect(items[3].tools).toEqual([{ name: 'find_truck' }, { name: 'propose_change' }]);
  });

  it('leaves them unplaced when it cannot tell which answer proposed them', () => {
    const { items, unplaced } = itemsFromDetail(
      detail([undefined, ['propose_change'], undefined, ['propose_change']]),
    );
    expect(unplaced.map((s) => s.id)).toEqual(['s1']);
    expect(items.every((i) => i.suggestions.length === 0)).toBe(true);
  });

  it('parses a suggestion with nulls into safe defaults', () => {
    expect(suggestion.rationale).toBe('');
    expect(suggestion.before).toEqual({ driver_name: 'Ahmed' });
    expect(suggestionSchema.parse({ ...suggestion, before: null }).before).toEqual({});
  });
});
