import { afterEach, describe, expect, it, vi } from 'vitest';

// Each test gets the module fresh: its state is the whole point.
async function fresh(key: string, provider = '') {
  vi.resetModules();
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', key);
  vi.stubEnv('VITE_MAP_PROVIDER', provider);
  return import('./google-maps-health');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('google maps health', () => {
  it('without a key every map is Leaflet, and nothing changes that', async () => {
    const h = await fresh('');
    expect(h.getGoogleMapsHealth().status).toBe('unconfigured');
    expect(h.mapProviderFor()).toBe('leaflet');
    h.reportGoogleMapsWorking();
    expect(h.mapProviderFor()).toBe('leaflet');
  });

  it('tries Google until it fails anywhere, then stays on Leaflet', async () => {
    const h = await fresh('test-key');
    expect(h.getGoogleMapsHealth().status).toBe('unknown');
    expect(h.mapProviderFor()).toBe('google');

    const heard: string[] = [];
    const stop = h.subscribeGoogleMapsHealth(() => heard.push(h.getGoogleMapsHealth().status));
    h.reportGoogleMapsFailure('auth');
    expect(h.getGoogleMapsHealth()).toEqual({ status: 'failed', reason: 'auth' });
    expect(h.mapProviderFor()).toBe('leaflet');
    // The first reason stands; later reports and successes change nothing.
    h.reportGoogleMapsFailure('timeout');
    h.reportGoogleMapsWorking();
    expect(h.getGoogleMapsHealth()).toEqual({ status: 'failed', reason: 'auth' });
    expect(heard).toEqual(['failed']);
    stop();
  });

  it('a map that renders proves the key', async () => {
    const h = await fresh('test-key');
    h.reportGoogleMapsWorking();
    expect(h.getGoogleMapsHealth().status).toBe('ok');
    expect(h.mapProviderFor()).toBe('google');
    // Google can still fail later (the key revoked mid-session).
    h.reportGoogleMapsFailure('auth');
    expect(h.mapProviderFor()).toBe('leaflet');
  });

  it('a refused key is remembered for that key only', async () => {
    const store = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
      setTimeout,
      clearTimeout,
    });
    try {
      const first = await fresh('key-one');
      first.reportGoogleMapsFailure('auth');
      expect((await fresh('key-one')).getGoogleMapsHealth()).toEqual({
        status: 'failed',
        reason: 'auth',
      });
      // A new key is tried at once.
      expect((await fresh('key-two')).getGoogleMapsHealth().status).toBe('unknown');

      // A slow network is not held against the key.
      store.clear();
      const slow = await fresh('key-three');
      slow.reportGoogleMapsFailure('timeout');
      expect((await fresh('key-three')).getGoogleMapsHealth().status).toBe('unknown');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('billing off is a refusal: Google logs it, nothing else says so', async () => {
    const h = await fresh('test-key');
    // Verified with a billing-disabled key: no gm_authFailure, tiles load
    // (watermarked); this console error and an in-map dialog are the signs.
    expect(
      h.googleMapsErrorCode(
        'Google Maps JavaScript API error: BillingNotEnabledMapError\nhttps://developers.google.com/maps/documentation/javascript/error-messages#billing-not-enabled-map-error',
      ),
    ).toBe('BillingNotEnabledMapError');
    h.noteGoogleConsoleError('Something unrelated went wrong');
    h.noteGoogleConsoleError('Google Maps JavaScript API error: SomeFutureNoticeMapError');
    expect(h.mapProviderFor()).toBe('google');
    h.noteGoogleConsoleError('Google Maps JavaScript API error: BillingNotEnabledMapError');
    expect(h.getGoogleMapsHealth()).toEqual({
      status: 'failed',
      reason: 'billing',
      code: 'BillingNotEnabledMapError',
    });
    expect(h.mapProviderFor()).toBe('leaflet');
  });

  it('a refused key reports even after a map proved it', async () => {
    const h = await fresh('test-key');
    h.reportGoogleMapsWorking();
    h.noteGoogleConsoleError('Google Maps JavaScript API error: ApiNotActivatedMapError');
    expect(h.getGoogleMapsHealth()).toMatchObject({ status: 'failed', reason: 'auth' });
    expect(h.mapProviderFor()).toBe('leaflet');
  });

  it("finds Google's in-map refusal: the error overlay or the can't-load dialog", async () => {
    const h = await fresh('test-key');
    const el = (sel: string | null) =>
      ({ querySelector: (s: string) => (sel && s.includes(sel) ? {} : null) }) as ParentNode;
    expect(h.showsGoogleRefusal(el(null))).toBe(false);
    expect(h.showsGoogleRefusal(el('.dismissButton'))).toBe(true);
    expect(h.showsGoogleRefusal(el('.gm-err-container'))).toBe(true);
  });

  describe('VITE_MAP_PROVIDER', () => {
    it('leaflet: Leaflet everywhere, whatever happens', async () => {
      const h = await fresh('test-key', 'leaflet');
      expect(h.getGoogleMapsHealth().status).toBe('off');
      expect(h.mapProviderFor()).toBe('leaflet');
      h.reportGoogleMapsWorking();
      h.reportGoogleMapsFailure('auth');
      expect(h.getGoogleMapsHealth().status).toBe('off');
      expect(await h.loadGoogleMaps()).toBe(false);
    });

    it('google: kept on Google even when it fails, the failure still on record', async () => {
      const h = await fresh('test-key', 'google');
      h.noteGoogleConsoleError('Google Maps JavaScript API error: BillingNotEnabledMapError');
      expect(h.getGoogleMapsHealth()).toMatchObject({ status: 'failed', reason: 'billing' });
      expect(h.mapProviderFor()).toBe('google');
    });

    it('google without a key is still Leaflet', async () => {
      const h = await fresh('', 'google');
      expect(h.mapProviderFor()).toBe('leaflet');
    });

    it('anything else is auto', async () => {
      const h = await fresh('test-key', 'bogus');
      expect(h.mapProviderFor()).toBe('google');
      h.reportGoogleMapsFailure('billing');
      expect(h.mapProviderFor()).toBe('leaflet');
    });
  });
});
