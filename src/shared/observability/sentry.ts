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

  // Which service this came from. Every service shares one Sentry project, so
  // without this you are left inferring the source from the release string or
  // the SDK name.
  event.tags = { ...event.tags, service: 'apex-react' };

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

function tracesSampleRate(): number {
  const raw = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE);
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.5;
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
    // Without browserTracingIntegration a sample rate does nothing at all —
    // no transactions are created, so no request data ever appears. That is
    // why the rate alone was not enough.
    integrations: [
      Sentry.browserTracingIntegration(),
      // Session Replay, masked to the bone.
      //
      // A replay is a recording of the screen, and this app's screen is driver
      // names, phone numbers, plates and coordinates. Recording it verbatim
      // would drive straight through the PII controls in `beforeSend`, which
      // scrub structured event fields and can do nothing about a video.
      //
      // So every one of these is load-bearing, not a default worth tidying:
      // all text masked, all inputs masked, all media blocked. What survives is
      // the shape of the session — what was clicked, in what order, what the
      // layout looked like when it broke — which is the part that helps.
      //
      // Network bodies are NOT captured: networkDetailAllowUrls is left unset
      // on purpose. Turning it on would record request and response payloads,
      // which is the single richest source of personal data in the app.
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],
    // Env-tunable so the rate can be changed at build time without a code
    // change; this Sentry runs on modest hardware and tracing is what loads it.
    tracesSampleRate: tracesSampleRate(),
    // Which requests carry the trace id onward, as `sentry-trace` and
    // `baggage`, so a backend error lands on the same Sentry trace as the
    // click that caused it.
    //
    // Left unset, the SDK propagates to same-origin requests only. In the
    // browser the API is same-origin (nginx serves the app and proxies
    // /api/*), so that was already working — but in the Tauri build the page
    // is served from tauri://localhost and every API call is cross-origin, so
    // nothing propagated there at all.
    //
    // The relative pattern must stay: with this option set, the same-origin
    // default no longer applies on its own, and dropping it would break the
    // web build to fix the desktop one.
    tracePropagationTargets: [/^\//, 'apextransport.ddns.net'],
    // Never record sessions that are going fine: that is continuous DOM
    // capture of every user all day, for no diagnostic gain, on a Sentry box
    // with modest hardware.
    replaysSessionSampleRate: 0,
    // Every error gets its replay. The buffer is only kept in the browser and
    // is uploaded when something actually breaks.
    replaysOnErrorSampleRate: 1.0,
    beforeSend: scrubEvent,
  });
}
