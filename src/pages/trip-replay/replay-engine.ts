import {
  actualStateAt,
  dwellAt,
  ghostStateInLeg,
  isNight,
  kmDrivenAt,
  kmOptimalAt,
  lastDepartedLegIndex,
  optimalStateAt,
  optimalToRealMs,
  realToOptimalMs,
  timedLegIndexAt,
  totalOptimalMs,
  type DwellInterval,
  type ReplayModel,
} from './replay-model';

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type ReplayMode = 'actual' | 'optimal' | 'race';

export const PLAYBACK_SPEEDS = [1, 8, 32, 128] as const;

/** Wall-clock time a compressed dwell takes (the "pulse" pause). */
const DWELL_WALL_MS = 2_000;
/** Max dt per frame — protects against tab-switch time jumps. */
const MAX_FRAME_DT_MS = 250;

export interface MarkerState {
  lat: number;
  lng: number;
  bearing: number;
  visible: boolean;
}

export interface ReplayFrame {
  /** Current instant on the real trip timeline (epoch ms). */
  tMs: number;
  mode: ReplayMode;
  playing: boolean;
  speedX: number;
  ended: boolean;
  truck: (MarkerState & { speed: number; speeding: boolean }) | null;
  ghost: MarkerState | null;
  /** Index into model.timedLegs, -1 during dwell gaps / outside legs. */
  legIndex: number;
  /** Latest departed leg — what the HUD shows during dwell gaps. */
  hudLegIndex: number;
  kmDriven: number;
  kmOptimal: number;
  night: boolean;
  /** Non-null while paused on a compressed dwell (pulse + badge). */
  dwell: DwellInterval | null;
  /** Total trip-time skipped by dwell compression so far. */
  skippedDwellMs: number;
  /** Race mode: current leg has no OSRM geometry, ghost hidden. */
  ghostUnavailable: boolean;
}

export type FrameListener = (frame: ReplayFrame) => void;

/* -------------------------------------------------------------------------- */
/* Engine                                                                      */
/*                                                                             */
/* Owns the rAF loop. Listeners receive an imperative frame every animation   */
/* tick — map markers and the timeline playhead update through refs, and     */
/* the page throttles its own listener to ~4Hz for HUD React state.          */
/* The loop pauses while `document.hidden` and resumes on visibility.        */
/* -------------------------------------------------------------------------- */

export class ReplayEngine {
  private model: ReplayModel;
  private listeners = new Set<FrameListener>();
  private rafId = 0;
  private lastNow = 0;

  private t: number;
  private oMs = 0; // optimal-mode virtual clock
  private dwellHold: { interval: DwellInterval; wallRemaining: number } | null = null;
  private skippedDwellMs = 0;
  private loopLegIndex: number | null = null;

  playing = false;
  mode: ReplayMode = 'actual';
  speedX: number = PLAYBACK_SPEEDS[1];
  skipStops = true;

  /** Fired once whenever a dwell compression begins (map pulse + badge). */
  onDwellEnter: ((d: DwellInterval) => void) | null = null;

  private readonly onVisibility = () => {
    if (document.hidden) {
      this.stopLoop();
    } else if (this.playing) {
      this.startLoop();
    }
  };

  constructor(model: ReplayModel) {
    this.model = model;
    this.t = model.startMs;
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  destroy() {
    this.stopLoop();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.listeners.clear();
  }

  subscribe(fn: FrameListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  get currentMs(): number {
    return this.t;
  }

  /* ---- Controls ------------------------------------------------------- */

  play() {
    if (this.playing) return;
    if (this.mode === 'optimal') {
      if (this.oMs >= totalOptimalMs(this.model)) this.seek(this.model.startMs);
    } else if (this.t >= this.model.endMs) {
      this.seek(this.model.startMs);
    }
    this.playing = true;
    this.startLoop();
    this.emit();
  }

  pause() {
    this.playing = false;
    this.stopLoop();
    this.emit();
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  seek(ms: number) {
    this.t = Math.min(this.model.endMs, Math.max(this.model.startMs, ms));
    this.oMs = realToOptimalMs(this.model, this.t);
    this.dwellHold = null;
    this.loopLegIndex = null;
    this.emit();
  }

  seekLeg(index: number) {
    const leg = this.model.timedLegs[index];
    if (!leg) return;
    this.seek(leg.departMs!);
  }

  /** Loop a single leg until the next seek/mode change. */
  loopLeg(index: number) {
    const leg = this.model.timedLegs[index];
    if (!leg) return;
    this.seek(leg.departMs!);
    this.loopLegIndex = index;
    if (!this.playing) this.play();
  }

  setMode(mode: ReplayMode) {
    if (this.mode === mode) return;
    this.mode = mode;
    // Keep continuity: re-derive the optimal clock from the real instant.
    this.oMs = realToOptimalMs(this.model, this.t);
    this.dwellHold = null;
    this.emit();
  }

  setSpeed(speedX: number) {
    this.speedX = speedX;
    this.emit();
  }

  stepSpeed(direction: 1 | -1) {
    const i = PLAYBACK_SPEEDS.indexOf(this.speedX as (typeof PLAYBACK_SPEEDS)[number]);
    const next =
      PLAYBACK_SPEEDS[
        Math.min(PLAYBACK_SPEEDS.length - 1, Math.max(0, (i < 0 ? 1 : i) + direction))
      ];
    this.setSpeed(next);
  }

  setSkipStops(on: boolean) {
    this.skipStops = on;
    if (!on) this.dwellHold = null;
    this.emit();
  }

  seekNextLeg() {
    const i = lastDepartedLegIndex(this.model, this.t);
    this.seekLeg(Math.min(this.model.timedLegs.length - 1, i + 1));
  }

  seekPrevLeg() {
    const i = lastDepartedLegIndex(this.model, this.t);
    const leg = this.model.timedLegs[i];
    // Within the first seconds of a leg, "previous" means the leg before.
    if (leg && this.t - leg.departMs! < 3_000) this.seekLeg(Math.max(0, i - 1));
    else this.seekLeg(Math.max(0, i));
  }

  /** Re-emit the current frame (e.g. after hover-preview ends). */
  emitCurrent() {
    this.emit();
  }

  /* ---- Loop ----------------------------------------------------------- */

  private startLoop() {
    if (this.rafId) return;
    this.lastNow = performance.now();
    const tick = (now: number) => {
      this.rafId = requestAnimationFrame(tick);
      const dt = Math.min(MAX_FRAME_DT_MS, now - this.lastNow);
      this.lastNow = now;
      this.advance(dt);
      this.emit();
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private advance(dtWallMs: number) {
    const model = this.model;

    if (this.mode === 'optimal') {
      this.oMs += dtWallMs * this.speedX;
      const total = totalOptimalMs(model);
      if (this.oMs >= total) {
        this.oMs = total;
        this.playing = false;
        this.stopLoop();
      }
      this.t = optimalToRealMs(model, this.oMs);
      return;
    }

    // Actual / Race — real timeline, with optional dwell compression.
    if (this.dwellHold) {
      this.dwellHold.wallRemaining -= dtWallMs;
      if (this.dwellHold.wallRemaining <= 0) {
        const d = this.dwellHold.interval;
        this.skippedDwellMs += d.endMs - Math.max(d.startMs, this.t);
        this.t = d.endMs;
        this.dwellHold = null;
      }
      return; // marker holds at the stop while the pulse plays
    }

    const prevT = this.t;
    this.t += dtWallMs * this.speedX;

    if (this.skipStops) {
      const d = dwellAt(model, this.t);
      // Enter compression only when we crossed into the interval this frame
      // and there is meaningful time left to skip.
      if (d && prevT < d.endMs && d.endMs - this.t > this.speedX * DWELL_WALL_MS) {
        this.t = Math.max(d.startMs, prevT);
        this.dwellHold = { interval: d, wallRemaining: DWELL_WALL_MS };
        this.onDwellEnter?.(d);
      }
    }

    // Leg looping.
    if (this.loopLegIndex != null) {
      const leg = model.timedLegs[this.loopLegIndex];
      if (leg && this.t > leg.arriveMs!) {
        this.t = leg.departMs!;
        this.dwellHold = null;
      }
    }

    if (this.t >= model.endMs) {
      this.t = model.endMs;
      this.playing = false;
      this.stopLoop();
    }
    this.oMs = realToOptimalMs(model, this.t);
  }

  /* ---- Frame ---------------------------------------------------------- */

  frame(): ReplayFrame {
    const model = this.model;
    const t = this.t;
    const legIndex = timedLegIndexAt(model, t);
    const hudLegIndex = legIndex >= 0 ? legIndex : lastDepartedLegIndex(model, t);

    let truck: ReplayFrame['truck'] = null;
    let ghost: ReplayFrame['ghost'] = null;
    let ghostUnavailable = false;
    let kmDriven = 0;
    let kmOptimal = 0;

    if (this.mode === 'optimal') {
      const s = optimalStateAt(model, this.oMs);
      if (s) {
        truck = {
          lat: s.lat,
          lng: s.lng,
          bearing: s.bearing,
          visible: true,
          speed: 0,
          speeding: false,
        };
        kmOptimal = s.km;
        kmDriven = s.km;
      }
    } else {
      const s = actualStateAt(model, t);
      if (s) {
        truck = { ...s, visible: true };
      }
      kmDriven = kmDrivenAt(model, t);
      kmOptimal = kmOptimalAt(model, t);

      if (this.mode === 'race') {
        const raceLeg = model.timedLegs[hudLegIndex] ?? null;
        if (raceLeg && t >= raceLeg.departMs!) {
          const g = ghostStateInLeg(raceLeg, t);
          if (g) {
            ghost = { lat: g.lat, lng: g.lng, bearing: g.bearing, visible: true };
          } else {
            ghostUnavailable = true;
          }
        }
      }
    }

    return {
      tMs: t,
      mode: this.mode,
      playing: this.playing,
      speedX: this.speedX,
      ended: t >= model.endMs,
      truck,
      ghost,
      legIndex,
      hudLegIndex,
      kmDriven,
      kmOptimal,
      night: isNight(model, t),
      dwell: this.dwellHold?.interval ?? null,
      skippedDwellMs: this.skippedDwellMs,
      ghostUnavailable,
    };
  }

  private emit() {
    const frame = this.frame();
    for (const fn of this.listeners) fn(frame);
  }
}
