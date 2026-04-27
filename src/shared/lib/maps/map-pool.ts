import { importLibrary } from '@googlemaps/js-api-loader';

let sharedMap: google.maps.Map | null = null;
let sharedInfoWindow: google.maps.InfoWindow | null = null;
let sharedContainer: HTMLDivElement | null = null;
let isInitializing = false;
let claimCount = 0; // Reference count for pool consumers
const pendingRequests: Array<(res: { map: google.maps.Map; infoWindow: google.maps.InfoWindow }) => void> = [];

export async function getSharedMap(parent: HTMLElement, options: google.maps.MapOptions): Promise<{ map: google.maps.Map; infoWindow: google.maps.InfoWindow }> {
  if (sharedMap && sharedInfoWindow && sharedContainer) {
    sharedMap.setOptions(options);
    if (sharedContainer.parentElement !== parent) {
      parent.appendChild(sharedContainer);
    }
    claimCount++;
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
    claimCount++;

    const result = { map: sharedMap, infoWindow: sharedInfoWindow };
    while (pendingRequests.length > 0) {
      pendingRequests.shift()!(result);
    }
    return result;
  } finally {
    isInitializing = false;
  }
}

export function releaseSharedMap(map: google.maps.Map) {
  claimCount = Math.max(0, claimCount - 1);
  if (claimCount === 0 && map === sharedMap && sharedContainer && sharedContainer.parentElement) {
    sharedContainer.parentElement.removeChild(sharedContainer);
  }
}