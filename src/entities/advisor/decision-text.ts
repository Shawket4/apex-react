import type { Suggestion } from './schemas';

/** i18next's `t(key, options)`, narrowed to what these texts need. */
export type DecisionTranslate = (key: string, options: Record<string, unknown>) => string;

const SERVICE_DEFAULTS: Record<string, string> = {
  falcon: 'FalconGo',
  maint: 'Maintenance',
  apex: 'Bank ledger',
};

/** The system a suggestion writes to, by name: FalconGo, Maintenance, Bank ledger. */
export function serviceName(target: string | null | undefined, t: DecisionTranslate): string {
  const key = target ?? 'falcon';
  return t(`advisor.suggestion.services.${key}`, { defaultValue: SERVICE_DEFAULTS[key] ?? key });
}

export interface DecisionToast {
  kind: 'success' | 'error';
  text: string;
}

/** The toast for a decision the server answered (2xx), naming the target system. */
export function decisionToast(s: Suggestion, t: DecisionTranslate): DecisionToast | null {
  const service = serviceName(s.target, t);
  switch (s.status) {
    case 'applied':
      return {
        kind: 'success',
        text: t('advisor.toast.applied', { service, defaultValue: 'Change applied in {{service}}' }),
      };
    case 'failed':
      return {
        kind: 'error',
        text: t('advisor.toast.applyFailed', { service, defaultValue: '{{service}} refused the change' }),
      };
    case 'rejected':
      return { kind: 'success', text: t('advisor.toast.rejected', { defaultValue: 'Suggestion rejected' }) };
    default:
      return null;
  }
}

/**
 * The server's own words in an error body: RFC 7807 `detail` first (what
 * apex-rust sends), then `message`, then `error`.
 */
export function serverMessage(err: unknown): string | null {
  const payload = (err as { payload?: unknown } | null)?.payload;
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  for (const key of ['detail', 'message', 'error']) {
    const v = p[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

/**
 * The toast for a refused decision. A 409 is not always a race: the server
 * also answers 409 when the target's AI audit log is not deployed or the
 * target is unknown, and then its message is the useful part. Only a message
 * that says the suggestion is "already" decided (or none at all) becomes the
 * "already decided" text.
 */
export function decisionErrorText(
  err: unknown,
  t: DecisionTranslate,
  fallback: string,
): string {
  const status = (err as { status?: number } | null)?.status;
  const message = serverMessage(err);
  if (status === 409) {
    if (!message || /\balready\b/i.test(message)) {
      return t('advisor.toast.alreadyDecided', {
        defaultValue: 'Someone already decided this suggestion',
      });
    }
    return message;
  }
  return message ?? fallback;
}
