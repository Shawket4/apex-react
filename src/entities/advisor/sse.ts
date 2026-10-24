import {
  answerEventSchema,
  conversationEventSchema,
  errorEventSchema,
  toolEventSchema,
  type AdvisorStreamEvent,
} from './schemas';

/* -------------------------------------------------------------------------- */
/* Server-sent events, parsed by hand                                          */
/*                                                                             */
/* `/advisor/chat` is a POST, so EventSource is out and the stream arrives as  */
/* arbitrary byte chunks from fetch. This is the WHATWG event-stream grammar,  */
/* reduced to what the advisor sends: `event:` and `data:` fields, `:` comment */
/* lines (the 15 s `: ping`), events ended by a blank line. A chunk may end    */
/* anywhere — mid-field, mid-line, between the CR and LF of one line ending.   */
/* -------------------------------------------------------------------------- */

export interface SseEvent {
  /** `message` when the event had no `event:` field. */
  event: string;
  /** Every `data:` line of the event, joined with `\n`. */
  data: string;
}

export interface SseParser {
  /** Feed the next decoded chunk; returns the events it completed. */
  push(chunk: string): SseEvent[];
  /** The stream closed: complete whatever the last chunk left open. */
  end(): SseEvent[];
}

export function createSseParser(): SseParser {
  let buffer = '';
  let eventName = '';
  let dataLines: string[] = [];

  function line(text: string, out: SseEvent[]): void {
    if (text === '') {
      if (dataLines.length > 0) {
        out.push({ event: eventName || 'message', data: dataLines.join('\n') });
      }
      eventName = '';
      dataLines = [];
      return;
    }
    if (text.startsWith(':')) return; // comment — `: ping`
    const colon = text.indexOf(':');
    const field = colon === -1 ? text : text.slice(0, colon);
    let value = colon === -1 ? '' : text.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') eventName = value;
    else if (field === 'data') dataLines.push(value);
    // id / retry / unknown fields: nothing to do for the advisor.
  }

  return {
    push(chunk) {
      buffer += chunk;
      const out: SseEvent[] = [];
      let start = 0;
      for (let i = 0; i < buffer.length; i++) {
        const c = buffer[i];
        if (c !== '\n' && c !== '\r') continue;
        // A CR at the very end may be the first half of a CRLF; wait for the
        // next chunk before deciding where the line ends.
        if (c === '\r' && i === buffer.length - 1) break;
        line(buffer.slice(start, i), out);
        if (c === '\r' && buffer[i + 1] === '\n') i++;
        start = i + 1;
      }
      buffer = buffer.slice(start);
      return out;
    },
    end() {
      const out: SseEvent[] = [];
      const rest = buffer.replace(/\r$/, '');
      buffer = '';
      if (rest !== '') line(rest, out);
      line('', out);
      return out;
    },
  };
}

/** Parse a whole event-stream body at once (tests, fixtures). */
export function parseSse(text: string): SseEvent[] {
  const parser = createSseParser();
  return [...parser.push(text), ...parser.end()];
}

/**
 * Type one raw event. Unknown event names and payloads that do not match the
 * contract come back as null: the stream carries on, the event is skipped.
 */
export function toAdvisorEvent(raw: SseEvent): AdvisorStreamEvent | null {
  let json: unknown;
  try {
    json = JSON.parse(raw.data);
  } catch {
    return null;
  }
  switch (raw.event) {
    case 'conversation': {
      const r = conversationEventSchema.safeParse(json);
      return r.success ? { type: 'conversation', data: r.data } : null;
    }
    case 'tool': {
      const r = toolEventSchema.safeParse(json);
      return r.success ? { type: 'tool', data: r.data } : null;
    }
    case 'answer': {
      const r = answerEventSchema.safeParse(json);
      return r.success ? { type: 'answer', data: r.data } : null;
    }
    case 'error': {
      const r = errorEventSchema.safeParse(json);
      return r.success ? { type: 'error', data: r.data } : null;
    }
    default:
      return null;
  }
}
