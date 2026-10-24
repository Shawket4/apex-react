import { describe, expect, it } from 'vitest';
import { createSseParser, parseSse, toAdvisorEvent, type SseEvent } from './sse';

const STREAM =
  'event: conversation\ndata: {"conversation_id":"c1"}\n\n' +
  ': ping\n\n' +
  'event: tool\ndata: {"name":"fleet_overview","args":{}}\n\n' +
  'event: answer\ndata: {"conversation_id":"c1","answer":"**hi**","suggestions":[],"tools":[{"name":"fleet_overview","ms":12,"ok":true}]}\n\n';

/** Feed `text` in pieces cut at `cuts` (character offsets). */
function feed(text: string, cuts: number[]): SseEvent[] {
  const parser = createSseParser();
  const out: SseEvent[] = [];
  let last = 0;
  for (const cut of [...cuts, text.length]) {
    out.push(...parser.push(text.slice(last, cut)));
    last = cut;
  }
  out.push(...parser.end());
  return out;
}

describe('createSseParser', () => {
  it('reads named events and skips the ping comment', () => {
    const events = parseSse(STREAM);
    expect(events.map((e) => e.event)).toEqual(['conversation', 'tool', 'answer']);
    expect(JSON.parse(events[0].data)).toEqual({ conversation_id: 'c1' });
  });

  it('gives the same events however the stream is chunked', () => {
    const whole = parseSse(STREAM);
    // Every single cut point, including mid-field and mid-"\n\n".
    for (let i = 1; i < STREAM.length; i++) {
      expect(feed(STREAM, [i])).toEqual(whole);
    }
    // One character at a time.
    expect(feed(STREAM, Array.from({ length: STREAM.length - 1 }, (_, i) => i + 1))).toEqual(whole);
  });

  it('does not emit an event until its blank line arrives', () => {
    const parser = createSseParser();
    expect(parser.push('event: tool\ndata: {"name":"run_sql"}\n')).toEqual([]);
    expect(parser.push('\n')).toEqual([{ event: 'tool', data: '{"name":"run_sql"}' }]);
  });

  it('joins multi-line data with newlines', () => {
    expect(parseSse('event: answer\ndata: line one\ndata: line two\ndata:\n\n')).toEqual([
      { event: 'answer', data: 'line one\nline two\n' },
    ]);
  });

  it('handles CRLF and lone CR line endings, including a CRLF split across chunks', () => {
    const crlf = 'event: tool\r\ndata: {"name":"x"}\r\n\r\n';
    const expected = [{ event: 'tool', data: '{"name":"x"}' }];
    expect(parseSse(crlf)).toEqual(expected);
    expect(parseSse('event: tool\rdata: {"name":"x"}\r\r')).toEqual(expected);
    const cr = crlf.indexOf('\r');
    expect(feed(crlf, [cr + 1])).toEqual(expected); // cut between \r and \n
  });

  it('strips exactly one space after the colon', () => {
    expect(parseSse('data:  two spaces\n\n')).toEqual([{ event: 'message', data: ' two spaces' }]);
    expect(parseSse('data:none\n\n')).toEqual([{ event: 'message', data: 'none' }]);
  });

  it('ignores comment-only blocks and events without data', () => {
    expect(parseSse(': ping\n\n: ping\n\nevent: tool\n\n')).toEqual([]);
  });

  it('flushes a final event the server closed without a blank line', () => {
    expect(parseSse('event: error\ndata: {"message":"boom"}')).toEqual([
      { event: 'error', data: '{"message":"boom"}' },
    ]);
  });
});

describe('toAdvisorEvent', () => {
  it('types each advisor event', () => {
    const typed = parseSse(STREAM).map(toAdvisorEvent);
    expect(typed.map((e) => e?.type)).toEqual(['conversation', 'tool', 'answer']);
    const answer = typed[2];
    expect(answer?.type === 'answer' && answer.data.tools[0]).toEqual({
      name: 'fleet_overview',
      ms: 12,
      ok: true,
    });
  });

  it('reads an error event', () => {
    expect(toAdvisorEvent({ event: 'error', data: '{"message":"no key"}' })).toEqual({
      type: 'error',
      data: { message: 'no key' },
    });
  });

  it('skips unknown events and malformed payloads', () => {
    expect(toAdvisorEvent({ event: 'mystery', data: '{}' })).toBeNull();
    expect(toAdvisorEvent({ event: 'tool', data: 'not json' })).toBeNull();
    expect(toAdvisorEvent({ event: 'answer', data: '{"answer":1}' })).toBeNull();
  });
});
