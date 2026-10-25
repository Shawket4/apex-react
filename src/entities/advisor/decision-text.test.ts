import { describe, expect, it } from 'vitest';
import en from '@/shared/i18n/locales/en.json';
import ar from '@/shared/i18n/locales/ar.json';
import { decisionErrorText, decisionToast, serverMessage, serviceName } from './decision-text';
import type { Suggestion } from './schemas';

/** The shape of the client's ApiError (status + parsed body), without its i18n import. */
const apiErr = (status: number, payload?: unknown) =>
  Object.assign(new Error('Request failed'), { status, payload });

/** A `t` over the real locale file with i18next's `{{x}}` interpolation. */
function translator(dict: unknown) {
  return (key: string, options: Record<string, unknown>) => {
    const found = key
      .split('.')
      .reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], dict);
    const template = typeof found === 'string' ? found : String(options.defaultValue ?? key);
    return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(options[name] ?? ''));
  };
}
const tEn = translator(en);
const tAr = translator(ar);

function suggestion(over: Partial<Suggestion>): Suggestion {
  return {
    id: 's1',
    conversation_id: null,
    kind: 'update_trip',
    title: 'Fix the plate',
    rationale: '',
    before: {},
    after: {},
    target: 'falcon',
    method: 'PUT',
    path: '/trips/1',
    status: 'applied',
    decided_at: null,
    applied_at: null,
    created_at: null,
    ...over,
  } as Suggestion;
}

describe('decisionToast', () => {
  it('names the system the change went to', () => {
    expect(decisionToast(suggestion({ target: 'falcon' }), tEn)).toEqual({
      kind: 'success',
      text: 'Change applied in FalconGo',
    });
    expect(decisionToast(suggestion({ target: 'maint' }), tEn)?.text).toBe('Change applied in Maintenance');
    expect(decisionToast(suggestion({ target: 'apex', status: 'failed' }), tEn)).toEqual({
      kind: 'error',
      text: 'Bank ledger refused the change',
    });
  });

  it('names it in Arabic too', () => {
    expect(decisionToast(suggestion({ target: 'maint' }), tAr)?.text).toBe('تم تطبيق التغيير في الصيانة');
    expect(decisionToast(suggestion({ target: 'apex', status: 'failed' }), tAr)?.text).toBe(
      'لم يقبل نظام دفتر البنك التغيير',
    );
  });

  it('treats a missing target as FalconGo and says nothing while pending', () => {
    expect(serviceName(null, tEn)).toBe('FalconGo');
    expect(decisionToast(suggestion({ status: 'rejected' }), tEn)?.text).toBe('Suggestion rejected');
    expect(decisionToast(suggestion({ status: 'pending' }), tEn)).toBeNull();
  });
});

describe('decisionErrorText', () => {
  const problem = (detail: string) =>
    apiErr(409, {
      type: 'about:blank#conflict',
      title: 'Conflict',
      status: 409,
      detail,
    });

  it('keeps "already decided" for a real race', () => {
    expect(decisionErrorText(problem('suggestion is already applied'), tEn, 'x')).toBe(
      'Someone already decided this suggestion',
    );
    expect(decisionErrorText(apiErr(409), tAr, 'x')).toBe('تم البت في هذا الاقتراح بالفعل');
  });

  it("shows the server's reason for any other 409", () => {
    const msg =
      "maint-rust's AI audit log is not deployed yet, so the change cannot be recorded as made via AI; the suggestion stays pending";
    expect(decisionErrorText(problem(msg), tEn, 'x')).toBe(msg);
    expect(decisionErrorText(problem('unknown target `foo`'), tEn, 'x')).toBe('unknown target `foo`');
  });

  it("prefers the server's words, else the fallback", () => {
    expect(decisionErrorText(apiErr(400, { message: 'bad plate' }), tEn, 'fb')).toBe('bad plate');
    expect(decisionErrorText(apiErr(500), tEn, 'fb')).toBe('fb');
  });

  it('reads detail before message before error', () => {
    expect(serverMessage({ payload: { detail: 'd', message: 'm', error: 'e' } })).toBe('d');
    expect(serverMessage({ payload: { message: 'm', error: 'e' } })).toBe('m');
    expect(serverMessage({ payload: { error: 'e' } })).toBe('e');
    expect(serverMessage({ payload: 'text' })).toBeNull();
    expect(serverMessage(null)).toBeNull();
  });
});
