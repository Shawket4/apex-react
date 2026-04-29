import type * as React from 'react';

/**
 * Visual style of a marker. Both providers render the same SVG so the
 * user can't tell which provider is active.
 */
export type MarkerKind =
  | 'pin'
  | 'vehicle'
  | 'stop'
  | 'ignition-on'
  | 'ignition-off'
  | 'route-start'
  | 'route-end'
  | 'invisible';

export interface MapMarker {
  /** Stable identity for React keys + diffing during live updates. */
  id: string;
  lat: number;
  lng: number;
  /** Hex color of the pin body, e.g. '#16A34A' or '#DC2626'. */
  color: string;
  /** Visual style. Defaults to `'pin'` (classic teardrop). */
  kind?: MarkerKind;
  /** Heading in degrees from north (0–360). Only used by `'vehicle'` kind. */
  heading?: number;
  /**
   * Whether this marker contributes to auto-fit bounds. Defaults to true.
   * Set false for ephemeral markers (e.g. a moving playback marker) so
   * the camera doesn't refit every frame.
   *
   * Only honored when `liveUpdates` is true on the parent MapView.
   */
  affectsBounds?: boolean;
  /** Hover tooltip text. Both providers render this natively. */
  title?: string;
  /**
   * Optional rich popup HTML. Both providers inject this verbatim — it is
   * the caller's responsibility to escape any user-provided content.
   */
  popupHtml?: string;
  /** When true, the marker is draggable (click-to-place flow). */
  draggable?: boolean;
}

export type MarkerDragHandler = (id: string, lat: number, lng: number) => void;
export type MapClickHandler = (lat: number, lng: number) => void;

export interface MapViewProps {
  markers?: MapMarker[];
  /**
   * Decoded polyline as `[lat, lng]` pairs. Pass `[]` (or omit) for no
   * route. Providers draw a multi-line stack (halo + casing + core) for
   * visual depth.
   */
  route?: Array<[number, number]>;
  /**
   * When true, the route polyline is NOT rendered even if `route` is
   * non-empty. Used when only one of two endpoints is valid.
   */
  suppressRoute?: boolean;
  /** Initial centre when there are no markers/route to fit to. */
  centerFallback?: [number, number];
  /** Container height; passes through to the wrapping div. */
  height?: string | number;
  /** Vertical offset for map controls (e.g. to avoid bottom panels). */
  bottomOffset?: number;
  className?: string;
  /** Fired when user clicks an empty area of the map. */
  onMapClick?: MapClickHandler;
  /** Fired when a marker is clicked. */
  onMarkerClick?: (id: string) => void;
  /** Fired when a marker is double-clicked. */
  onMarkerDoubleClick?: (id: string) => void;
  /** Fired when a draggable marker finishes dragging. */
  onMarkerDragEnd?: MarkerDragHandler;
  /** Fired when the active provider changes (Google → Leaflet fallback). */
  onProviderChange?: (provider: MapProvider) => void;
  /** Fired when a snap-to-time button is clicked in a popup. */
  onSnapTimestamp?: (ts: number) => void;
  /** Override the SDK-load timeout for Google. Defaults to 3000ms. */
  fallbackTimeoutMs?: number;
  /**
   * Opt-in: switch the providers into "live mode". When true:
   *   - Marker sync becomes id-diffed (existing markers update position
   *     in place rather than being torn down and re-added on every props
   *     change). Popups stay open across updates.
   *   - Auto-fit only triggers when the FINGERPRINT of bounds-affecting
   *     markers + route changes (i.e. when the SET of markers changes),
   *     not when positions update.
   *
   * Required for animated/live-tracking maps. Off by default to preserve
   * behavior for forms and one-shot displays.
   */
  liveUpdates?: boolean;
}

export type MapProvider = 'google' | 'leaflet';
export type MapProviderComponent = React.ComponentType<MapViewProps>;