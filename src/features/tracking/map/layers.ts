/**
 * deck.gl layer builders. Everything heavy on the map is GPU-rendered, but
 * wears the app's ORIGINAL marker artwork: stops, ignition events and route
 * endpoints render the shared marker SVGs as icon sprites, so the rebuilt
 * page looks like the old one while a month of data stays a handful of GPU
 * layers. The animated replay tail is a TripsLayer driven by a time uniform.
 */

import { IconLayer, PathLayer } from '@deck.gl/layers';
import { PathStyleExtension } from '@deck.gl/extensions';
import { TripsLayer } from '@deck.gl/geo-layers';
import type { Layer } from '@deck.gl/core';
import { buildMarkerSvg, markerSize } from '@/shared/lib/maps/marker-svg';
import type { MarkerKind } from '@/shared/lib/maps/types';
import type { SensorEvent, Stop, TripPin } from '../schemas';
import type { DayTrail, LegSegment, LegWindow, ReplayTrack } from '../use-history';

export interface HistoryLayerInput {
  trails: DayTrail[];
  track: ReplayTrack | null;
  stops: Stop[];
  sensors: SensorEvent[];
  /** Audit-matched place visits — terminals, drop-offs, garages. */
  pins: TripPin[];
  /** Audit legs with sliced segments. */
  legs: LegSegment[];
  showPins: boolean;
  showLegs: boolean;
  /** `parentTripId:seq` of the activated leg, if any. */
  activeLegId: string | null;
  /** When a leg is MANUALLY activated, the map shows ONLY this window —
   *  the leg's complete geometry (fetched beyond the range when cut), its
   *  own stops/events/pins, endpoints, and the optimal. */
  isolated: { seg: LegSegment; window: LegWindow } | null;
  /** Cairo day under the replay cursor — its trail draws full-strength. */
  cursorDay: string | null;
  showStops: boolean;
  showIgnitions: boolean;
}

const TRAIL_BLUE: [number, number, number] = [59, 130, 246];
const STOP_COLOR = '#f59e0b';
const IGNITION_ON_COLOR = '#16a34a';
const IGNITION_OFF_COLOR = '#6b7280';
/** Audit pin palette by visit kind. */
const PIN_COLORS: Record<string, string> = {
  terminal: '#1f3a5f',
  dropoff: '#d97706',
  garage: '#6b7280',
};
/** Leg palette, cycled by seq. Garage legs draw dashed instead. */
const LEG_PALETTE: [number, number, number][] = [
  [59, 130, 246],
  [139, 92, 246],
  [5, 150, 105],
  [217, 119, 6],
  [220, 38, 38],
  [8, 145, 178],
];
export const legId = (l: LegSegment) => `${l.leg.parentTripId}:${l.leg.seq}`;
export function legColor(seg: LegSegment): [number, number, number] {
  return LEG_PALETTE[Math.abs(seg.leg.seq) % LEG_PALETTE.length];
}

/** Pins standing on ~the same spot (back-to-back visits) merge into ONE
 *  marker whose tooltip lists every visit. Data stays untouched. */
export interface PinCluster {
  lat: number;
  lng: number;
  kind: string;
  visits: TripPin[];
}
export function clusterPins(pins: TripPin[]): PinCluster[] {
  const byPos = new Map<string, PinCluster>();
  for (const pin of pins) {
    const key = `${pin.lat.toFixed(4)},${pin.lng.toFixed(4)}`; // ~11 m
    const existing = byPos.get(key);
    if (existing) existing.visits.push(pin);
    else byPos.set(key, { lat: pin.lat, lng: pin.lng, kind: pin.kind, visits: [pin] });
  }
  return [...byPos.values()];
}

/** Replay tail length in seconds of track time. */
const TAIL_SECS = 45 * 60;

/** The original marker SVGs as deck icon descriptors (cached — the data URL
 *  doubles as the atlas key). */
const iconCache = new Map<string, { url: string; width: number; height: number; anchorY: number }>();
function icon(kind: MarkerKind, color: string) {
  const key = `${kind}:${color}`;
  let entry = iconCache.get(key);
  if (!entry) {
    const size = markerSize(kind);
    entry = {
      url: buildMarkerSvg(color, `trk-${kind}`, kind),
      width: size.width,
      height: size.height,
      anchorY: size.anchorY,
    };
    iconCache.set(key, entry);
  }
  return entry;
}

export function buildStaticLayers(input: HistoryLayerInput): Layer[] {
  const layers: Layer[] = [];

  /* ── Isolation: one leg, its data, nothing else — the replay's focus. ── */
  if (input.isolated) {
    const { seg, window } = input.isolated;
    const [r, g, b] = legColor(seg);
    const path = window.path.length > 1 ? window.path : seg.path;
    if (path.length > 1) {
      layers.push(
        new PathLayer<{ path: [number, number][] }>({
          id: 'legs',
          data: [{ path }],
          getPath: (d) => d.path,
          getColor: [r, g, b, 240],
          getWidth: 5,
          widthUnits: 'pixels',
          widthMinPixels: 3,
          capRounded: true,
          jointRounded: true,
          pickable: true,
        }),
      );
      layers.push(
        new IconLayer<{ pos: [number, number]; kind: 'route-start' | 'route-end' }>({
          id: 'endpoints',
          data: [
            { pos: path[0], kind: 'route-start' as const },
            { pos: path[path.length - 1], kind: 'route-end' as const },
          ],
          getPosition: (d) => d.pos,
          getIcon: (d) => icon(d.kind, d.kind === 'route-start' ? '#16a34a' : '#dc2626'),
          getSize: (d) => markerSize(d.kind).height,
          sizeUnits: 'pixels',
          pickable: true,
        }),
      );
    }
    if (input.showStops && window.stops.length > 0) {
      layers.push(
        new IconLayer<Stop>({
          id: 'stops',
          data: window.stops,
          getPosition: (d) => [d.lng, d.lat],
          getIcon: () => icon('stop', STOP_COLOR),
          getSize: markerSize('stop').height,
          sizeUnits: 'pixels',
          pickable: true,
        }),
      );
    }
    if (input.showIgnitions && window.sensors.length > 0) {
      layers.push(
        new IconLayer<SensorEvent>({
          id: 'sensors',
          data: window.sensors,
          getPosition: (d) => [d.lng, d.lat],
          getIcon: (d) =>
            /on/i.test(d.typeName)
              ? icon('ignition-on', IGNITION_ON_COLOR)
              : icon('ignition-off', IGNITION_OFF_COLOR),
          getSize: markerSize('ignition-on').height,
          sizeUnits: 'pixels',
          pickable: true,
        }),
      );
    }
    if (input.showPins && window.pins.length > 0) {
      layers.push(
        new IconLayer<PinCluster>({
          id: 'trip-pins',
          data: clusterPins(window.pins),
          getPosition: (d) => [d.lng, d.lat],
          getIcon: (d) => icon('pin', PIN_COLORS[d.kind] ?? PIN_COLORS.dropoff),
          getSize: markerSize('pin').height,
          sizeUnits: 'pixels',
          pickable: true,
        }),
      );
    }
    return layers;
  }

  if (input.trails.length > 0) {
    const multiDay = input.trails.length > 1;
    layers.push(
      new PathLayer<DayTrail>({
        id: 'trails',
        data: input.trails,
        getPath: (d) => d.path,
        getColor: (d) =>
          !multiDay || d.day === input.cursorDay
            ? [...TRAIL_BLUE, 235]
            : [...TRAIL_BLUE, 70],
        getWidth: (d) => (!multiDay || d.day === input.cursorDay ? 4 : 3),
        widthUnits: 'pixels',
        widthMinPixels: 2,
        capRounded: true,
        jointRounded: true,
        updateTriggers: { getColor: input.cursorDay, getWidth: input.cursorDay },
      }),
    );

    /* Route endpoints — the classic start/end pins on the whole range. */
    const first = input.trails[0].path[0];
    const lastTrail = input.trails[input.trails.length - 1].path;
    const last = lastTrail[lastTrail.length - 1];
    if (first && last) {
      layers.push(
        new IconLayer<{ pos: [number, number]; kind: 'route-start' | 'route-end' }>({
          id: 'endpoints',
          data: [
            { pos: first, kind: 'route-start' as const },
            { pos: last, kind: 'route-end' as const },
          ],
          getPosition: (d) => d.pos,
          getIcon: (d) => icon(d.kind, d.kind === 'route-start' ? '#16a34a' : '#dc2626'),
          getSize: (d) => markerSize(d.kind).height,
          sizeUnits: 'pixels',
          pickable: true,
        }),
      );
    }
  }

  if (input.showStops && input.stops.length > 0) {
    layers.push(
      new IconLayer<Stop>({
        id: 'stops',
        data: input.stops,
        getPosition: (d) => [d.lng, d.lat],
        getIcon: () => icon('stop', STOP_COLOR),
        getSize: markerSize('stop').height,
        sizeUnits: 'pixels',
        pickable: true,
      }),
    );
  }

  if (input.showIgnitions && input.sensors.length > 0) {
    layers.push(
      new IconLayer<SensorEvent>({
        id: 'sensors',
        data: input.sensors,
        getPosition: (d) => [d.lng, d.lat],
        getIcon: (d) =>
          /on/i.test(d.typeName)
            ? icon('ignition-on', IGNITION_ON_COLOR)
            : icon('ignition-off', IGNITION_OFF_COLOR),
        getSize: markerSize('ignition-on').height,
        sizeUnits: 'pixels',
        pickable: true,
      }),
    );
  }

  if (input.showLegs && input.legs.length > 0) {
    const solid = input.legs.filter((l) => l.leg.legType !== 'garage' && l.path.length > 1);
    const dashed = input.legs.filter((l) => l.leg.legType === 'garage' && l.path.length > 1);
    const paint = (d: LegSegment): [number, number, number, number] => {
      const [r, g, b] = legColor(d);
      const dim = input.activeLegId !== null && legId(d) !== input.activeLegId;
      return [r, g, b, dim ? 70 : 240];
    };
    const width = (d: LegSegment) =>
      input.activeLegId !== null && legId(d) === input.activeLegId ? 6 : 4.5;
    if (solid.length > 0) {
      layers.push(
        new PathLayer<LegSegment>({
          id: 'legs',
          data: solid,
          getPath: (d) => d.path,
          getColor: paint,
          getWidth: width,
          widthUnits: 'pixels',
          widthMinPixels: 3,
          capRounded: true,
          jointRounded: true,
          pickable: true,
          updateTriggers: { getColor: input.activeLegId, getWidth: input.activeLegId },
        }),
      );
    }
    if (dashed.length > 0) {
      layers.push(
        new PathLayer<LegSegment>({
          id: 'legs-garage',
          data: dashed,
          getPath: (d: LegSegment) => d.path,
          getColor: paint,
          getWidth: width,
          widthUnits: 'pixels',
          widthMinPixels: 3,
          capRounded: true,
          jointRounded: true,
          pickable: true,
          getDashArray: [8, 6],
          dashJustified: true,
          extensions: [new PathStyleExtension({ dash: true })],
          updateTriggers: { getColor: input.activeLegId, getWidth: input.activeLegId },
        } as never),
      );
    }

  }

  if (input.showPins && input.pins.length > 0) {
    layers.push(
      new IconLayer<PinCluster>({
        id: 'trip-pins',
        data: clusterPins(input.pins),
        getPosition: (d) => [d.lng, d.lat],
        getIcon: (d) => icon('pin', PIN_COLORS[d.kind] ?? PIN_COLORS.dropoff),
        getSize: markerSize('pin').height,
        sizeUnits: 'pixels',
        pickable: true,
      }),
    );
  }

  return layers;
}


/**
 * The animated tail behind the replay marker. Timestamps go to the GPU as
 * f32, so they are rebased to seconds-from-start — epoch milliseconds would
 * lose precision and judder.
 */
export function buildTailLayer(track: ReplayTrack, cursorMs: number): Layer {
  const t0 = track.startMs;
  return new TripsLayer<{ path: [number, number][]; ts: number[] }>({
    id: 'replay-tail',
    data: [
      {
        path: track.path,
        ts: Array.from(track.timesMs, (t) => (t - t0) / 1000),
      },
    ],
    getPath: (d) => d.path,
    getTimestamps: (d) => d.ts,
    currentTime: (cursorMs - t0) / 1000,
    trailLength: TAIL_SECS,
    getColor: [29, 78, 216],
    getWidth: 5,
    widthUnits: 'pixels',
    widthMinPixels: 3,
    capRounded: true,
    jointRounded: true,
    fadeTrail: true,
  });
}
