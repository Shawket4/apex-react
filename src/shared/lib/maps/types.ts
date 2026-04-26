import type * as React from 'react';

/**
 * Minimal marker shape used by both Google and Leaflet providers. Renders
 * the same visual SVG pin in both providers so the user can't tell which
 * one is active.
 */
export interface MapMarker {
  /** Stable identity for React keys + diffing during updates. */
  id: string;
  lat: number;
  lng: number;
  /** Hex color of the pin body, e.g. '#16A34A' or '#DC2626'. */
  color: string;
  /** Hover tooltip text shown by both providers natively. */
  title?: string;
  /**
   * Optional rich popup HTML. Both providers inject this verbatim — make
   * sure it's safe (we control all callers, no user input).
   */
  popupHtml?: string;
  /** When true, the marker is draggable (click-to-place flow). */
  draggable?: boolean;
}

/** Drag callback shape — fires on dragend with the new coordinate. */
export type MarkerDragHandler = (id: string, lat: number, lng: number) => void;

/** Click-on-empty-map callback — used by location pickers. */
export type MapClickHandler = (lat: number, lng: number) => void;

export interface MapViewProps {
  /** Markers to render. */
  markers?: MapMarker[];

  /**
   * Decoded polyline as `[lat, lng]` pairs. Pass `[]` (or omit) for no
   * route. The provider draws a multi-line stack (halo + casing + core)
   * for visual depth, matching the trip-statistics aesthetic.
   */
  route?: Array<[number, number]>;

  /**
   * When true, force the route polyline to NOT render even if `route` is
   * non-empty. Used when only one of two endpoints is valid — drawing a
   * line from a real point to (0,0) would mislead the user.
   */
  suppressRoute?: boolean;

  /** Initial centre when there are no markers/route to fit to. */
  centerFallback?: [number, number];

  /** Container height; passes through to the wrapping div. */
  height?: string | number;

  className?: string;

  /** Fired when user clicks an empty area of the map. */
  onMapClick?: MapClickHandler;

  /** Fired when a draggable marker finishes dragging. */
  onMarkerDragEnd?: MarkerDragHandler;

  /**
   * Fired when the active provider changes (Google → Leaflet fallback or
   * vice versa). Useful for showing a small status badge in the UI.
   */
  onProviderChange?: (provider: MapProvider) => void;

  /**
   * Override the SDK-load timeout for Google before falling back to
   * Leaflet. Defaults to 3000ms.
   */
  fallbackTimeoutMs?: number;
}

export type MapProvider = 'google' | 'leaflet';

/**
 * The shape any provider's React component must satisfy. Internal — only
 * `MapView` itself imports this.
 */
export type MapProviderComponent = React.ComponentType<MapViewProps>;
