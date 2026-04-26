// src/shared/lib/coords.ts
export function isValidCoordinate(lat?: number | string | null, lng?: number | string | null): boolean {
    const numLat = Number(lat);
    const numLng = Number(lng);

    if (isNaN(numLat) || isNaN(numLng)) return false;
    if (numLat === 0 && numLng === 0) return false;

    return true;
}