import { importLibrary } from '@googlemaps/js-api-loader';

/**
 * Singleton Map Pool
 * 
 * Google Maps charges per "Map Load" (new google.maps.Map). By reusing a 
 * single instance and moving its container element between parent nodes, 
 * we can reduce billing to a single load per session.
 */

let sharedMap: google.maps.Map | null = null;
let sharedInfoWindow: google.maps.InfoWindow | null = null;
let sharedContainer: HTMLDivElement | null = null;
let isInitializing = false;
const pendingRequests: Array<(res: { map: google.maps.Map; infoWindow: google.maps.InfoWindow }) => void> = [];

export async function getSharedMap(parent: HTMLElement, options: google.maps.MapOptions): Promise<{ map: google.maps.Map; infoWindow: google.maps.InfoWindow }> {
  if (sharedMap && sharedInfoWindow && sharedContainer) {
    sharedMap.setOptions(options);
    parent.appendChild(sharedContainer);
    return { map: sharedMap, infoWindow: sharedInfoWindow };
  }

  if (isInitializing) {
    return new Promise((resolve) => pendingRequests.push(resolve));
  }

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

    const result = { map: sharedMap, infoWindow: sharedInfoWindow };
    while (pendingRequests.length > 0) {
      pendingRequests.shift()!(result);
    }
    return result;
  } finally {
    isInitializing = false;
  }
}

/**
 * Detach the shared map container from its current parent.
 */
export function releaseSharedMap(map: google.maps.Map) {
  if (map === sharedMap && sharedContainer && sharedContainer.parentElement) {
    sharedContainer.parentElement.removeChild(sharedContainer);
  }
}
