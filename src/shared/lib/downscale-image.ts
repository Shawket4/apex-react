/**
 * Shrink a photo before it is uploaded.
 *
 * A phone camera hands over 4–12 MB for a picture of a licence that reads just
 * as well at a fifth of that, and the upload is usually on mobile data. The
 * longest edge is brought down to `maxEdge` and the result re-encoded as JPEG.
 *
 * It also makes a file the server accepts out of one it would refuse: an
 * iPhone's HEIC, which Safari can decode and nothing else in the chain can.
 *
 * Anything that is not a picture, that the browser cannot decode, or that would
 * not come out smaller is returned as it was — this never fails an upload, it
 * only declines to help.
 */
export interface PreparedImage {
  blob: Blob;
  name: string;
}

interface Options {
  /** Longest edge of the result, in pixels. */
  maxEdge?: number;
  quality?: number;
  /** Files already this small, in a type the server takes, are left alone. */
  skipBelowBytes?: number;
  /** The types that may be sent as they are. */
  passthroughTypes?: readonly string[];
}

const DEFAULT_PASSTHROUGH = ['image/jpeg', 'image/png', 'image/webp'] as const;

function jpegName(name: string): string {
  const stem = name.replace(/\.[^./\\]+$/, '');
  return `${stem || 'image'}.jpg`;
}

export async function downscaleImage(file: File, options: Options = {}): Promise<PreparedImage> {
  const {
    maxEdge = 2400,
    quality = 0.85,
    skipBelowBytes = 1_500_000,
    passthroughTypes = DEFAULT_PASSTHROUGH,
  } = options;
  const original: PreparedImage = { blob: file, name: file.name };

  const looksLikeImage = file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name);
  if (!looksLikeImage) return original;

  const accepted = passthroughTypes.includes(file.type);
  if (accepted && file.size <= skipBelowBytes) return original;

  let bitmap: ImageBitmap;
  try {
    // `from-image` applies the EXIF rotation, so a portrait photo stays one.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return original;
  }

  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return original;
    // A transparent PNG becomes a JPEG: paper, not black, behind it.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob) return original;
    if (accepted && blob.size >= file.size) return original;
    return { blob, name: jpegName(file.name) };
  } finally {
    bitmap.close();
  }
}
