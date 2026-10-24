import { afterEach, describe, expect, it, vi } from 'vitest';

// Each test gets the module fresh: its state is the whole point.
async function fresh(key: string) {
  vi.resetModules();
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', key);
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
});
