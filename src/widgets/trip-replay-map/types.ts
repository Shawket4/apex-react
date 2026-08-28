import type { MarkerKind } from '@/shared/lib/maps/types';

/* -------------------------------------------------------------------------- */
/* Static scene + imperative adapter contract                                  */
/*                                                                             */
/* The replay animates at frame rate, so the moving markers are driven        */
/* IMPERATIVELY through this adapter — no React state per frame. Static       */
/* layers (leg polylines, OSRM dashes, event pins) are built exactly once     */
/* per scene. Both providers (Google, Leaflet) implement the same interface;  */
/* the widget picks one and the page never knows which.                       */
/* -------------------------------------------------------------------------- */

export interface ReplayScenePolyline {
  id: string;
  path: Array<[number, number]>;
  color: string;
  weight: number;
  opacity: number;
  dashed?: boolean;
}

export interface ReplayScenePin {
  id: string;
  lat: number;
  lng: number;
  color: string;
  kind: MarkerKind;
  title?: string;
}

export interface ReplayScene {
  polylines: ReplayScenePolyline[];
  pins: ReplayScenePin[];
  /** Every coordinate that participates in the initial fit. */
  bounds: Array<[number, number]>;
}

export type DynMarkerId = 'truck' | 'ghost';

export interface ReplayMapAdapter {
  setScene(scene: ReplayScene): void;
  /** Move (and show) a dynamic marker. Cheap — called every frame. */
  moveMarker(id: DynMarkerId, lat: number, lng: number): void;
  /** Swap marker color (e.g. speeding). Icon is rebuilt only on change. */
  setMarkerColor(id: DynMarkerId, color: string): void;
  setMarkerVisible(id: DynMarkerId, visible: boolean): void;
  /** Eased follow-cam pan. Internally throttled; safe to call every frame. */
  follow(lat: number, lng: number): void;
  fitPoints(points: Array<[number, number]>): void;
  /** Expanding-ring pulse animation at a location (dwell/event emphasis). */
  pulse(lat: number, lng: number, color?: string): void;
  onPinClick(handler: ((pinId: string) => void) | null): void;
  /** Basemap: streets or satellite hybrid. */
  setMapType(type: 'roadmap' | 'hybrid'): void;
  destroy(): void;
}

export const TRUCK_MARKER_OPACITY = 1;
export const GHOST_MARKER_OPACITY = 0.55;
export const FOLLOW_THROTTLE_MS = 180;
export const PULSE_DURATION_MS = 1_400;
export const PULSE_MAX_RADIUS_M = 90;
