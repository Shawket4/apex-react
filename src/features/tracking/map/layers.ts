/**
 * deck.gl layer builders. Everything heavy on the map is GPU-rendered, but
 * wears the app's ORIGINAL marker artwork: stops, ignition events and route
 * endpoints render the shared marker SVGs as icon sprites, so the rebuilt
 * page looks like the old one while a month of data stays a handful of GPU
 * layers. The animated replay tail is a TripsLayer driven by a time uniform.
 */

import { IconLayer, PathLayer } from '@deck.gl/layers';
import { TripsLayer } from '@deck.gl/geo-layers';
import type { Layer } from '@deck.gl/core';
import { buildMarkerSvg, markerSize } from '@/shared/lib/maps/marker-svg';
import type { MarkerKind } from '@/shared/lib/maps/types';
import type { SensorEvent, Stop } from '../schemas';
import type { DayTrail, ReplayTrack } from '../use-history';

export interface HistoryLayerInput {
  trails: DayTrail[];
  track: ReplayTrack | null;
  stops: Stop[];
  sensors: SensorEvent[];
  /** Cairo day under the replay cursor — its trail draws full-strength. */
  cursorDay: string | null;
  showStops: boolean;
  showIgnitions: boolean;
}

const TRAIL_BLUE: [number, number, number] = [59, 130, 246];
const STOP_COLOR = '#f59e0b';
const IGNITION_ON_COLOR = '#16a34a';
const IGNITION_OFF_COLOR = '#6b7280';

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
