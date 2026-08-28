/**
 * deck.gl layer builders. Everything heavy on the map is GPU-rendered:
 * per-day trails (PathLayer), stops and ignition events (ScatterplotLayer),
 * and the animated replay tail (TripsLayer, driven by a time uniform — the
 * per-frame cost of scrubbing is one uniform update, not a re-render).
 */

import { PathLayer, ScatterplotLayer } from '@deck.gl/layers';
import { TripsLayer } from '@deck.gl/geo-layers';
import type { Layer } from '@deck.gl/core';
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
const STOP_AMBER: [number, number, number] = [245, 158, 11];
const SENSOR_GREY: [number, number, number] = [107, 114, 128];

/** Replay tail length in seconds of track time. */
const TAIL_SECS = 45 * 60;

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
  }

  if (input.showStops && input.stops.length > 0) {
    layers.push(
      new ScatterplotLayer<Stop>({
        id: 'stops',
        data: input.stops,
        getPosition: (d) => [d.lng, d.lat],
        getFillColor: [255, 255, 255, 255],
        getLineColor: [...STOP_AMBER, 255],
        stroked: true,
        getLineWidth: 3,
        lineWidthUnits: 'pixels',
        getRadius: 5,
        radiusUnits: 'pixels',
        radiusMinPixels: 4,
        pickable: true,
      }),
    );
  }

  if (input.showIgnitions && input.sensors.length > 0) {
    layers.push(
      new ScatterplotLayer<SensorEvent>({
        id: 'sensors',
        data: input.sensors,
        getPosition: (d) => [d.lng, d.lat],
        getFillColor: [...SENSOR_GREY, 220],
        getRadius: 3.5,
        radiusUnits: 'pixels',
        radiusMinPixels: 3,
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
