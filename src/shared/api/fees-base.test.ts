import { describe, expect, it } from 'vitest';
import { deriveFeesBaseURL } from './fees-base';

describe('deriveFeesBaseURL', () => {
  it('swaps the Go base’s /api/go for the fee service path', () => {
    expect(deriveFeesBaseURL(undefined, 'https://apextransport.ddns.net/api/go')).toBe(
      'https://apextransport.ddns.net/public/distance-fetcher/api',
    );
  });

  it('tolerates a trailing slash and surrounding space on the Go base', () => {
    expect(deriveFeesBaseURL(undefined, ' https://host.test/api/go/ ')).toBe(
      'https://host.test/public/distance-fetcher/api',
    );
  });

  it('keeps a port and works on a relative base', () => {
    expect(deriveFeesBaseURL(undefined, 'http://127.0.0.1:3903/api/go')).toBe(
      'http://127.0.0.1:3903/public/distance-fetcher/api',
    );
    expect(deriveFeesBaseURL(undefined, '/api/go')).toBe('/public/distance-fetcher/api');
  });

  it('prefers an explicit base, without its trailing slash', () => {
    expect(
      deriveFeesBaseURL('https://fees.test/api/', 'https://apextransport.ddns.net/api/go'),
    ).toBe('https://fees.test/api');
  });

  it('ignores a blank explicit base', () => {
    expect(deriveFeesBaseURL('   ', 'https://host.test/api/go')).toBe(
      'https://host.test/public/distance-fetcher/api',
    );
  });

  it('gives null when the Go base does not end in /api/go', () => {
    expect(deriveFeesBaseURL(undefined, 'https://apextransport.ddns.net:3001')).toBeNull();
    expect(deriveFeesBaseURL(undefined, 'https://host.test/api/gopher')).toBeNull();
    expect(deriveFeesBaseURL(null, null)).toBeNull();
    expect(deriveFeesBaseURL(undefined, '')).toBeNull();
  });
});
