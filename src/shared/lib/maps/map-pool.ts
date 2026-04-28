import { importLibrary } from '@googlemaps/js-api-loader';

/**
 * Singleton Map Pool with reference counting.
 *
 * Google Maps charges per Map Load (each `new google.maps.Map`). By
 * reusing a single instance and moving its container element between
 * parent nodes, we reduce billing to a single load per session.
 *
 * Reference counting is necessary because:
 *   - Multiple components may want the shared map at once (e.g. main map
 *     and a small preview in a side panel).
 *   - React's StrictMode mounts each component twice in dev, so naive
 *     claim/release would tear down the map between the two mounts.
 *   - Page transitions in SPA mode can have a brief overlap where both
 *     the old and new map host are mounted.
 *
 * The first claimer creates the map; subsequent claimers receive the
 * same instance. Only when the LAST claimer releases is the container
 * detached (we don't destroy the map — `google.maps.Map` has no public
 * teardown — but detaching it from the DOM frees the container slot).
 */

interface MapHandle {
  map: google.maps.Map;
  infoWindow: google.maps.InfoWindow;
}

let sharedMap: google.maps.Map | null = null;
let sharedInfoWindow: google.maps.InfoWindow | null = null;
let sharedContainer: HTMLDivElement | null = null;
let claimCount = 0;
let isInitializing = false;
const pendingRequests: Array<(handle: MapHandle) => void> = [];

/**
 * Claim the shared map for a parent element. The same parent (or
 * different ones) can call this multiple times — each call must be
 * paired with a matching `releaseSharedMap`.
 *
 * On the first claim, the map is constructed with `options`.
 * On subsequent claims, `options` is applied via `setOptions` and the
 * container is moved to the new parent.
 */
export async function getSharedMap(
  parent: HTMLElement,
  options: google.maps.MapOptions,
): Promise<MapHandle> {
  // Fast path: already initialized.
  if (sharedMap && sharedInfoWindow && sharedContainer) {
    sharedMap.setOptions(options);
    if (sharedContainer.parentElement !== parent) {
      parent.appendChild(sharedContainer);
    }
    claimCount += 1;
    return { map: sharedMap, infoWindow: sharedInfoWindow };
  }

  // Concurrent claim during init: enqueue.
  if (isInitializing) {
    return new Promise<MapHandle>((resolve) => {
      pendingRequests.push((handle) => {
        if (sharedContainer && sharedContainer.parentElement !== parent) {
          parent.appendChild(sharedContainer);
        }
        claimCount += 1;
        resolve(handle);
      });
    });
  }

  // First claim: build it.
  isInitializing = true;
  try {
    await Promise.all([
      importLibrary('maps') as Promise<google.maps.MapsLibrary>,
      importLibrary('marker'),
    ]);

    sharedContainer = document.createElement('div');
    sharedContainer.style.width = '100%';
    sharedContainer.style.height = '100%';

    sharedMap = new google.maps.Map(sharedContainer, options);
    sharedInfoWindow = new google.maps.InfoWindow();

    parent.appendChild(sharedContainer);
    claimCount = 1;

    const handle: MapHandle = { map: sharedMap, infoWindow: sharedInfoWindow };
    while (pendingRequests.length > 0) {
      pendingRequests.shift()!(handle);
    }
    return handle;
  } finally {
    isInitializing = false;
  }
}

/**
 * Release a claim. When the last claim is released, the container is
 * detached from the DOM. The map instance itself is retained for the
 * next claimer — releasing does not invalidate it.
 */
export function releaseSharedMap(map: google.maps.Map) {
  if (map !== sharedMap) return;
  claimCount = Math.max(0, claimCount - 1);
  if (claimCount === 0 && sharedContainer && sharedContainer.parentElement) {
    sharedContainer.parentElement.removeChild(sharedContainer);
  }
}

/** Test-only: forcibly drop the singleton. Not exported in app code. */
export function __resetSharedMapForTests() {
  sharedMap = null;
  sharedInfoWindow = null;
  sharedContainer = null;
  claimCount = 0;
  isInitializing = false;
  pendingRequests.length = 0;
}
