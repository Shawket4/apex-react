import { describe, expect, it } from 'vitest';

import { isJsonBlob, readJsonBlob, unwrapBlobErrorBody } from './blob-error';

const jsonBlob = (body: unknown) => new Blob([JSON.stringify(body)], { type: 'application/json' });

describe('unwrapBlobErrorBody', () => {
  it('turns a 422 JSON blob into the server message and code', async () => {
    const error = {
      response: {
        status: 422,
        data: jsonBlob({ error: 'لا توجد رحلات', code: 'WATANYA_EMPTY_RANGE' }),
      },
    };
    await unwrapBlobErrorBody(error);
    expect(error.response.data).toEqual({ error: 'لا توجد رحلات', code: 'WATANYA_EMPTY_RANGE' });
  });

  it('reads JSON even when the blob was typed as a spreadsheet', async () => {
    const error = {
      response: {
        data: new Blob(['{"message":"No trips match the selected filters"}'], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      },
    };
    await unwrapBlobErrorBody(error);
    expect(error.response.data).toEqual({ message: 'No trips match the selected filters' });
  });

  it('leaves a non-JSON blob as it was, so the generic fallback applies', async () => {
    const blob = new Blob(['<html>Bad Gateway</html>'], { type: 'text/html' });
    const error = { response: { status: 502, data: blob } };
    await unwrapBlobErrorBody(error);
    expect(error.response.data).toBe(blob);
  });

  it('ignores errors without a blob body', async () => {
    const plain = { response: { data: { error: 'x' } } };
    await unwrapBlobErrorBody(plain);
    expect(plain.response.data).toEqual({ error: 'x' });
    await expect(unwrapBlobErrorBody(new Error('network'))).resolves.toBeUndefined();
    await expect(unwrapBlobErrorBody(null)).resolves.toBeUndefined();
  });
});

describe('readJsonBlob / isJsonBlob', () => {
  it('passes a real file through untouched', async () => {
    const file = new Blob([new Uint8Array([0x50, 0x4b, 3, 4])], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    expect(isJsonBlob(file)).toBe(false);
    expect(await readJsonBlob(file)).toBeUndefined();
  });

  it('spots a JSON body', () => {
    expect(isJsonBlob(jsonBlob({ ok: false }))).toBe(true);
    expect(isJsonBlob({})).toBe(false);
  });
});
