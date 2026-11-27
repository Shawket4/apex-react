import { describe, expect, it } from 'vitest';
import en from '@/shared/i18n/locales/en.json';
import ar from '@/shared/i18n/locales/ar.json';
import { KNOWN_FLAG_TYPES } from './schemas';

/**
 * Every `flag_type` etit-proxy raises (grep `flag_type: "` in its src/).
 * A type missing from KNOWN_FLAG_TYPES renders as its raw key in the audit
 * dialog, which is how suboptimal_order and three others showed until
 * 2026-11-27 despite having translations.
 */
const PROXY_FLAG_TYPES = [
  'allowed_stop',
  'banned_road',
  'excess_distance',
  'excess_duration',
  'ineffective_bundling',
  'no_return_data',
  'no_terminal_departure',
  'return_pending',
  'route_deviation',
  'skipped_delivery',
  'suboptimal_order',
  'unplanned_stop',
];

const flagTypes = (locale: unknown) =>
  (locale as { tripAudit: { flagTypes: Record<string, string> } }).tripAudit.flagTypes;
const flagDetails = (locale: unknown) =>
  (locale as { tripAudit: { flagDetails: Record<string, string> } }).tripAudit.flagDetails;

describe('trip-audit flag types', () => {
  it('knows every flag type the proxy raises', () => {
    for (const type of PROXY_FLAG_TYPES) {
      expect(KNOWN_FLAG_TYPES, type).toContain(type);
    }
  });

  it('labels every known flag type in English and Arabic', () => {
    for (const type of KNOWN_FLAG_TYPES) {
      expect(flagTypes(en)[type], `en ${type}`).toBeTruthy();
      expect(flagTypes(ar)[type], `ar ${type}`).toBeTruthy();
    }
  });

  it('has the banned-road detail strings, with their placeholders, in both languages', () => {
    for (const locale of [en, ar]) {
      expect(flagDetails(locale).bannedTitle).toContain('{{road}}');
      expect(flagDetails(locale).bannedHours).toContain('{{hours}}');
      expect(flagDetails(locale).bannedAlwaysTitle).toContain('{{road}}');
      expect(flagDetails(locale).bannedAlways).toBeTruthy();
    }
  });

  it('no longer names OSRM in any visible label', () => {
    const visible = (locale: unknown) =>
      JSON.stringify(locale)
        .replace(/"[A-Za-z]*[Oo]srm[A-Za-z]*":/g, '') // key names
        .replace(/\{\{osrm\}\}/g, ''); // placeholders
    expect(visible(en)).not.toMatch(/osrm/i);
    expect(visible(ar)).not.toMatch(/osrm/i);
  });
});
