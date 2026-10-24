import type { HistoryLayerInput } from './layers';
import type { LiveStatus, Vehicle } from '../schemas';

export interface LiveMarkerDatum {
  vehicle: Vehicle;
  live: LiveStatus | null;
  selected: boolean;
  hidden: boolean;
}

/**
 * The tracking map, driven imperatively so replay frames never touch React:
 *
 *   setHistory(input)   — rebuild the static GPU layers (data changed)
 *   setCursor(ms)       — one uniform update + one DOM move per frame
 *   setLive(vehicles)   — reconcile the plate-chip markers
 *   fitTo / flyTo       — camera
 */
export interface TrackingMapHandle {
  setHistory(input: HistoryLayerInput | null): void;
  /** Camera follows the replay marker while playing. */
  setFollow(on: boolean): void;
  /** Basemap: streets or satellite hybrid. */
  setMapType(type: 'roadmap' | 'hybrid'): void;
  setCursor(ms: number | null): void;
  setLive(data: LiveMarkerDatum[]): void;
  fitTo(coords: [number, number][]): void;
  flyTo(lng: number, lat: number, zoom?: number): void;
}

export interface TrackingMapProps {
  onSelect: (vehicleId: string) => void;
  /** The user grabbed the map — the page usually turns follow off. */
  onUserPan?: () => void;
  /** A leg segment was tapped on the map. */
  onActivateLeg?: (legId: string) => void;
  onMapReady?: () => void;
  className?: string;
}

/** Where the map opens before there is anything to fit to: Cairo. */
export const FALLBACK_CENTER = { lat: 30.0444, lng: 31.2357 };
