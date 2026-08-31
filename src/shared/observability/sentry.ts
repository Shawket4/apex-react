import * as Sentry from '@sentry/react';

import { REDACTED, isSensitiveKey, redact, redactQuery, redactUrl } from './redaction';

/**
 * Sentry wiring.
 *
 * Two rules govern this module.
 *
 * **It is off unless `VITE_SENTRY_DSN` is set.** With the variable unset or
 * blank, `initSentry` returns without installing anything and the app behaves
 * exactly as it did before Sentry existed. Nothing else may assume a client is
 * present.
 *
 * **The scrubbing below is a compliance control, not a preference.** The
 * operator publishes a privacy policy stating that error reports exclude
 * personal data, and this is what makes that true. Apex shows driver names,
 * phone numbers, vehicle plates and GPS coordinates, all of which pass through
 * this bundle routinely. Do not relax `beforeSend`, and do not set
 * `sendDefaultPii` to true, without a corresponding change to that policy.
 */

/**
 * Errors the app raises at itself rather than bugs.
 *
 * A 4xx is the server telling a user they typed something wrong or may not see
 * something; reporting those would bury real faults under an unbounded stream
 * of ones that are not. 5xx and network failures are kept.
 */
function isExpectedClientError(event: Sentry.ErrorEvent, hint?: Sentry.EventHint): boolean {
  const status = (hint?.originalException as { response?: { status?: number } } | undefined)
    ?.response?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) return true;
  const name = event.exception?.values?.[0]?.type;
  return name === 'AbortError' || name === 'CanceledError';
}

/** The compliance control. See the module docs before changing anything here. */
export function scrubEvent(
  event: Sentry.ErrorEvent,
  hint?: Sentry.EventHint,
): Sentry.ErrorEvent | null {
  if (isExpectedClientError(event, hint)) return null;

  // Whatever the SDK inferred about who is using the app, drop it.
  // `sendDefaultPii: false` already suppresses most of this; clearing it
  // outright means a future SDK release cannot quietly widen what "default"
  // covers.
  delete event.user;
  delete event.server_name;

  if (event.request) {
    // The body is the highest-risk field in the whole event: on this app it is
    // trip, driver and fuel JSON.
    delete event.request.data;
    delete event.request.cookies;
    if (event.request.url) event.request.url = redactUrl(event.request.url);
    if (typeof event.request.query_string === 'string') {
      event.request.query_string = redactQuery(event.request.query_string);
    }
    if (event.request.headers) {
      for (const name of Object.keys(event.request.headers)) {
        if (isSensitiveKey(name)) delete event.request.headers[name];
      }
    }
  }

  if (event.extra) event.extra = redact(event.extra) as typeof event.extra;
  if (event.contexts) event.contexts = redact(event.contexts) as typeof event.contexts;
  if (event.tags) {
    for (const k of Object.keys(event.tags)) {
      if (isSensitiveKey(k)) event.tags[k] = REDACTED;
    }
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
      ...crumb,
      data: crumb.data ? (redact(crumb.data) as Record<string, unknown>) : undefined,
    }));
  }

  return event;
}

/** Install Sentry, or don't. */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT?.trim() || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE?.trim() || undefined,
    // Compliance: never send the SDK's idea of "default" personal data. This
    // also keeps IP addresses off the event.
    sendDefaultPii: false,
    // A tenth of traffic. This Sentry runs on modest hardware; raising it is a
    // deliberate decision rather than a default.
    tracesSampleRate: 0.1,
    // Session Replay records the DOM, which on this app is a screen full of
    // driver names and plates. Off, and it should stay off.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend: scrubEvent,
  });
}
