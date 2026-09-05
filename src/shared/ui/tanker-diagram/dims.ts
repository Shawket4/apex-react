import * as THREE from 'three';

/**
 * Rig dimensions in metres, ported from the maintenance app's tire diagram
 * (apex-maintenance-tauri/src/widgets/TruckDiagram/dims.ts) so the two apps
 * draw the same truck. Parts connect by construction rather than by
 * hand-placed numbers that drift.
 *
 * What is deliberately NOT ported: the barrel here is split into compartments
 * and rendered transparent, so the livery stripes, manhole caps and discharge
 * cabinet are gone. This diagram's subject is what is inside each compartment,
 * and detail on the shell competes with reading through it.
 *
 * The diagram is a side elevation, so only the ZY profile of each part is ever
 * seen. The across-truck numbers (track, dual spacing, cab width) still matter
 * for the lighting and the contact shadow, which is why they stay.
 *
 * Vertical stack-up (ground = 0):
 *   0.00  ground
 *   0.55  wheel centre        (= TIRE_R)
 *   0.84  chassis rail bottom
 *   1.12  chassis rail top    ─┬─ cab sits on the rails
 *   1.15  cab floor           ─┘
 *   1.37  subframe top        ─┬─ tank sits on the subframe
 *   1.37  tank bottom         ─┘
 *   3.47  tank top
 */

// ── wheels ───────────────────────────────────────────────────────────────────
export const TIRE_R = 0.55;
export const TIRE_HW = 0.152;

/**
 * Dual spacing is deliberately exaggerated: at a real 0.32 m centre-to-centre
 * the two tires merge into one dark mass from any outboard view. At 0.48 m the
 * inner shows a clear crescent past the outer. Exaggerating a separation for
 * legibility is what a technical illustration is for.
 */
export const TRACK_SINGLE = 1.02;
export const DUAL_OUTER = 1.1;
export const DUAL_INNER = 0.62;

// ── tractor ──────────────────────────────────────────────────────────────────
export const NOSE_Z = -4.95;
export const CAB_REAR_Z = -2.35;
export const CAB_W = 2.44;
export const CAB_FLOOR = 1.15;
export const CAB_TOP = 3.7;

export const RAIL_X = 0.38;
export const RAIL_Y = 0.98;
export const RAIL_H = 0.28;
export const RAIL_TOP = RAIL_Y + RAIL_H / 2;
export const RAIL_FRONT = -4.82;

// ── trailer tank ─────────────────────────────────────────────────────────────
// The reference tank is NOT a cylinder: it's a rounded-rectangle section —
// flat sides, flat-ish top, very generous corner radii. That section is what a
// fuel tanker uses for a lower centre of gravity. Under-round TANK_RAD and the
// barrel reads as a crate.
export const TANK_W = 2.44;
export const TANK_H = 2.1;
export const TANK_RAD = 0.72;
export const TANK_Y = 2.42;
// Seen from the side, the maintenance app's 9.4 m barrel starting 1.5 m behind
// the drive axles reads as a tank that slid off its trailer. A real semi's
// front dome sits over the fifth wheel, so the barrel starts there and runs
// to a metre past the last axle — about the 12 m a 54,000 L tanker is.
export const TANK_Z = 5.6;
export const TANK_BODY_LEN = 10.9;
export const TANK_CAP = 0.34;
export const TANK_BEVEL = 0.26;

export const TANK_LEN = TANK_BODY_LEN + 2 * TANK_CAP;
export const TANK_FRONT = TANK_Z - TANK_LEN / 2;
export const TANK_BOTTOM = TANK_Y - TANK_H / 2;
export const TANK_TOP = TANK_Y + TANK_H / 2;
export const TANK_HW = TANK_W / 2;

// ── trailer frame ────────────────────────────────────────────────────────────
export const SUB_X = 0.38;
export const SUB_Y = 1.25;
export const SUB_H = 0.24;
export const NECK_BACK = 2.5;
export const REAR_FRAME_Z = TANK_Z + TANK_LEN / 2 + 0.1;

// ── axle longitudinal placement ──────────────────────────────────────────────
export const STEER_Z = -3.6;
export const DRIVE_Z0 = -0.55;
export const DRIVE_SPACING = 1.35;
export const TRAILER_LAST_Z = 10.45;
export const TRAILER_SPACING = 1.31;

export const DRIVE_ZS = [DRIVE_Z0, DRIVE_Z0 + DRIVE_SPACING];
export const TRAILER_ZS = [0, 1, 2].map((i) => TRAILER_LAST_Z - i * TRAILER_SPACING);

/** The fifth wheel rides just ahead of the drive group's centre. */
export const FIFTH_Z =
  DRIVE_ZS.reduce((a, b) => a + b, 0) / DRIVE_ZS.length - 0.2;
export const RAIL_BACK = Math.max(FIFTH_Z + 0.75, Math.max(...DRIVE_ZS) + 0.95);

// ── fixed part colours ───────────────────────────────────────────────────────
export const CHASSIS = '#252b34';
export const DARK = '#2b313b';
export const GLASS = '#2a3446';
export const OUT = '#0f172a';
export const RUBBER = '#23272e';
export const RIM_C = '#dfe5ec';
export const BODY_WHITE = '#f2f4f7';

/**
 * The cab, as its side silhouette extruded across the cab width.
 *
 * A RoundedBox can't be anything but a crate. The reference Actros gets its
 * character from the side profile — raked screen, domed roof, chin under the
 * bumper — so model that profile and extrude it, letting the bevel round every
 * edge at once. Profile coords are (world z, world y), drawn CAB_BEVEL short
 * of the real silhouette because the bevel grows the outline outward.
 */
const CAB_BEVEL = 0.08;
const CAB_PROFILE: Array<[number, number]> = [
  [NOSE_Z + 0.08, CAB_FLOOR + 0.08],
  [NOSE_Z + 0.02, CAB_FLOOR + 0.7],
  [NOSE_Z + 0.08, 3.02],
  [NOSE_Z + 0.24, 3.46],
  [NOSE_Z + 0.62, CAB_TOP - 0.08],
  [CAB_REAR_Z - 0.5, CAB_TOP - 0.08],
  [CAB_REAR_Z - 0.08, CAB_TOP - 0.42],
  [CAB_REAR_Z - 0.08, CAB_FLOOR + 0.08],
];

export const cabGeo = (() => {
  const s = new THREE.Shape();
  s.moveTo(CAB_PROFILE[0][0], CAB_PROFILE[0][1]);
  for (const [z, y] of CAB_PROFILE.slice(1)) s.lineTo(z, y);
  s.closePath();

  const g = new THREE.ExtrudeGeometry(s, {
    depth: CAB_W - 2 * CAB_BEVEL,
    bevelEnabled: true,
    bevelThickness: CAB_BEVEL,
    bevelSize: CAB_BEVEL,
    bevelSegments: 4,
    curveSegments: 8,
  });
  // Shape XY holds (z, y); rotating −90° about Y maps the extrusion axis onto X
  // and the profile onto world ZY, so the geometry lands already positioned.
  g.rotateY(-Math.PI / 2);
  g.computeBoundingBox();
  const b = g.boundingBox!;
  g.translate(-(b.min.x + b.max.x) / 2, 0, 0);
  g.computeVertexNormals();
  return g;
})();

/** Rounded-rectangle profile, centred on the origin in XY. */
export function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = w / 2 - r;
  const y = h / 2 - r;
  s.absarc(x, y, r, 0, Math.PI / 2, false);
  s.absarc(-x, y, r, Math.PI / 2, Math.PI, false);
  s.absarc(-x, -y, r, Math.PI, Math.PI * 1.5, false);
  s.absarc(x, -y, r, Math.PI * 1.5, Math.PI * 2, false);
  return s;
}

/**
 * One compartment of the barrel: the tank's rounded-rect section extruded to
 * the compartment's own length.
 *
 * Only the two ends of the whole tank are domed; an internal bulkhead is flat,
 * because that is what it is, and because a domed face between two compartments
 * reads as a gap in the tank. Note three's `bevelSize` grows the section
 * OUTWARD from the profile passed in, so a domed end is built from a profile
 * shrunk by the bevel — otherwise the midsection comes out 2*bevel too big.
 */
export function compartmentGeo(length: number, domeFront: boolean, domeBack: boolean) {
  const domed = domeFront || domeBack;
  const g = new THREE.ExtrudeGeometry(
    domed
      ? roundedRect(TANK_W - 2 * TANK_BEVEL, TANK_H - 2 * TANK_BEVEL, TANK_RAD - TANK_BEVEL)
      : roundedRect(TANK_W, TANK_H, TANK_RAD),
    {
      depth: length,
      bevelEnabled: domed,
      bevelThickness: TANK_CAP,
      bevelSize: TANK_BEVEL,
      bevelSegments: 6,
      curveSegments: 18,
    },
  );
  g.center();
  g.computeVertexNormals();
  return g;
}

/**
 * Rounded rectangle with a radius per corner, so one path can be domed at one
 * end and square at the other. Corners run top-right, top-left, bottom-left,
 * bottom-right; a zero radius is a plain corner.
 */
function cornerRect(w: number, h: number, radii: [number, number, number, number]) {
  const s = new THREE.Shape();
  const x = w / 2;
  const y = h / 2;
  const [tr, tl, bl, br] = radii;
  s.moveTo(x - tr, y);
  if (tl > 0) s.lineTo(-x + tl, y), s.absarc(-x + tl, y - tl, tl, Math.PI / 2, Math.PI, false);
  else s.lineTo(-x, y);
  if (bl > 0) s.lineTo(-x, -y + bl), s.absarc(-x + bl, -y + bl, bl, Math.PI, Math.PI * 1.5, false);
  else s.lineTo(-x, -y);
  if (br > 0) s.lineTo(x - br, -y), s.absarc(x - br, -y + br, br, Math.PI * 1.5, Math.PI * 2, false);
  else s.lineTo(x, -y);
  if (tr > 0) s.lineTo(x, y - tr), s.absarc(x - tr, y - tr, tr, 0, Math.PI / 2, false);
  else s.lineTo(x, y);
  s.closePath();
  return s;
}

/**
 * The compartment's edge as seen from the side: a flat ring lying on the near
 * wall, drawn in the ZY plane.
 *
 * drei's screen-space Outlines were the first attempt and they streak across
 * the flat-ended compartments — an unbevelled extrusion has hard-shaded
 * triangles, and the expanded back-face copy cracks between them into
 * horizontal stripes. A real ring has no such seams and doubles as the
 * bulkhead line between neighbours: two abutting rings make one clean cut.
 * Every ring is the same width and colour — a heavier or recoloured ring on
 * one compartment made it look taller than the rest. The hole is the
 * compartment's own silhouette, so a domed end gets a rounded corner and an
 * internal bulkhead a square one.
 */
export const FRAME_RING = 0.07;

/**
 * The compartment's side silhouette, as shape-space (z, y) with the dome
 * allowance folded in. A domed end adds TANK_CAP, and compartmentGeo centres
 * its result, so a compartment domed at one end only sits half a cap off its
 * nominal centre; the offset returned here follows it.
 */
function silhouette(length: number, domeFront: boolean, domeBack: boolean, grow = 0) {
  const back = domeBack ? TANK_CAP : 0;
  const front = domeFront ? TANK_CAP : 0;
  // In shape space +X is world +Z (towards the rear), so the "right" corners
  // belong to the back end.
  const shape = cornerRect(length + front + back + 2 * grow, TANK_H + 2 * grow, [
    back + grow,
    front + grow,
    front + grow,
    back + grow,
  ]);
  return { shape, offsetZ: (back - front) / 2 };
}

/** Extrude a ZY-plane shape as a thin plate whose face is at x = 0. */
function plate(shape: THREE.Shape, offsetZ: number) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false });
  // Shape XY holds (z, y); rotating −90° about Y maps shape X onto world Z
  // and the extrusion onto −X, so the plate lands in the ZY plane as drawn.
  g.rotateY(-Math.PI / 2);
  g.translate(0, 0, offsetZ);
  return g;
}

export function frameGeo(length: number, domeFront: boolean, domeBack: boolean, width = FRAME_RING) {
  const outer = silhouette(length, domeFront, domeBack, width);
  outer.shape.holes.push(silhouette(length, domeFront, domeBack).shape);
  return plate(outer.shape, outer.offsetZ);
}

/**
 * The load, as a flat plate on the near wall rather than a solid inside the
 * barrel. Clipping the solid to a fill level cut along the curved dome wall,
 * so a 95% load had a sloping top at the ends; a plate cut by the same plane
 * has a top that is a straight line across the whole compartment. Seen
 * square-on the two are otherwise identical.
 */
export function fillGeo(length: number, domeFront: boolean, domeBack: boolean) {
  const { shape, offsetZ } = silhouette(length, domeFront, domeBack);
  return plate(shape, offsetZ);
}

/** Tire cross-section, revolved. Ported as-is so the wheels match. */
const TIRE_PROFILE: Array<[number, number]> = [
  [0.3, -0.165],
  [0.44, -0.166],
  [0.53, -0.152],
  [0.55, -0.06],
  [0.55, 0.06],
  [0.53, 0.152],
  [0.44, 0.166],
  [0.3, 0.165],
];
export const tireGeo = new THREE.LatheGeometry(
  TIRE_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)),
  48,
);
export const rimGeo = new THREE.CylinderGeometry(0.295, 0.295, 0.33, 32);
export const capGeo = new THREE.CylinderGeometry(0.185, 0.185, 0.37, 24);
