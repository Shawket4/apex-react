import { beforeEach, describe, expect, it, vi } from 'vitest';

const del = vi.fn();

vi.mock('@/shared/api/client', () => ({
  apiClientEtit: { delete: (...a: unknown[]) => del(...a) },
}));

const { zoneApi } = await import('./api');

beforeEach(() => {
  del.mockReset();
});

describe('zoneApi.deleteZone', () => {
  it('resolves on the proxy\'s {"success":true} — no zone in the body', async () => {
    del.mockResolvedValue({ data: { success: true } });
    await expect(zoneApi.deleteZone(7)).resolves.toBeUndefined();
    expect(del).toHaveBeenCalledWith('api/v1/zones/7');
  });

  it('rejects a body that does not confirm the delete', async () => {
    del.mockResolvedValue({ data: { success: false } });
    await expect(zoneApi.deleteZone(7)).rejects.toThrow();
  });
});
