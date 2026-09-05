import * as React from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, Outlines } from '@react-three/drei';

import { cn } from '@/shared/lib/cn';
import { Popover, PopoverAnchor, PopoverContent } from '@/shared/ui/popover';
import { useThemeTokens } from '@/shared/lib/theme-tokens';
import { DIESEL_HEX, GAS_TOKENS, dropColor, gasCode, gasColor } from './palette';
import {
  BODY_WHITE,
  CAB_FLOOR,
  CAB_REAR_Z,
  CAB_TOP,
  CAB_W,
  CHASSIS,
  DARK,
  DRIVE_ZS,
  DUAL_INNER,
  DUAL_OUTER,
  FIFTH_Z,
  GLASS,
  NECK_BACK,
  NOSE_Z,
  OUT,
  REAR_FRAME_Z,
  RAIL_BACK,
  RAIL_FRONT,
  RAIL_H,
  RAIL_TOP,
  RAIL_X,
  RAIL_Y,
  RIM_C,
  RUBBER,
  STEER_Z,
  SUB_H,
  SUB_X,
  SUB_Y,
  TANK_BODY_LEN,
  TANK_H,
  TANK_CAP,
  TANK_HW,
  TANK_TOP,
  TANK_Y,
  TANK_Z,
  TIRE_R,
  TRACK_SINGLE,
  TRAILER_ZS,
  capGeo,
  cabGeo,
  fillGeo,
  frameGeo,
  rimGeo,
  tireGeo,
} from './dims';

/* -------------------------------------------------------------------------- */
/* Tanker diagram                                                             */
/*                                                                            */
/* The truck the trip is being recorded against, with its barrel split into    */
/* the compartments the car is actually registered with. It exists because a   */
/* tanker does not hold an arbitrary number of litres: it holds 27,000 +       */
/* 27,000, or 15,000 + 12,000 + 12,000 + 15,000, and a drop takes whole        */
/* compartments. Typing a volume into a box cannot express that; pointing at   */
/* the compartment you loaded can.                                            */
/*                                                                            */
/* The rig is the maintenance app's dims.ts geometry, so the two apps draw one */
/* truck rather than two. What differs is the barrel and the lighting: there  */
/* the barrel is an opaque white shell under a studio environment with AO and */
/* contact shadows, because the wheels are the subject; here it is a flat,    */
/* see-through set of plates under two plain lights, because the subject is   */
/* what is inside it — and because this canvas mounts on every fresh trip     */
/* form. The environment bake, shadow map and AO pass cost a second of first  */
/* paint for a picture that is flat by design, so they are gone, and the      */
/* frame loop only runs when something changed.                               */
/*                                                                            */
/* It is a flat side elevation, not the maintenance app's 3/4 view. Seen from  */
/* the corner a 16 m rig foreshortens the far compartments into a sliver and   */
/* their labels pile on top of each other; seen from the side every           */
/* compartment gets its full share of the width, which is the one thing the   */
/* proportional layout is trying to say.                                      */
/*                                                                            */
/* Labels are real DOM through drei's <Html>, not geometry: codes, volumes and */
/* drop numbers stay translatable, theme-tokened, and — the part a canvas      */
/* otherwise loses — keyboard-focusable. The buttons are the accessible        */
/* control; the meshes behind them are a second, pointer-only way in.          */
/*                                                                            */
/* A receipt is several compartments, never the other way round, so the       */
/* gestures are about receipts. Tap a compartment: a popover, whose content   */
/* the caller renders — in the trip form it is the container form itself.    */
/* Press and drag across the barrel: every compartment the pointer crosses   */
/* joins the receipt the drag started on; from an empty compartment the      */
/* caller says which (it may create one). Hit-testing for the drag is done   */
/* from the pointer's x alone, because a touch that starts on a label is     */
/* captured by that label and the canvas never hears about it.               */
/* -------------------------------------------------------------------------- */

/** One compartment as the diagram needs to draw it. */
export interface TankerCompartment {
  /** Volume this drop is actually taking. Equals `nominal` unless overridden. */
  volume: number;
  /** The volume registered against the car. */
  nominal: number;
  /** Product loaded, `''` when not chosen yet. */
  gasType: string;
  /** Which drop claimed it, or `null` while unassigned. */
  dropIndex: number | null;
}

export interface TankerDiagramProps {
  compartments: TankerCompartment[];
  /** The drop a click assigns to. `null` disables assignment. */
  activeDrop?: number | null;
  /** Short labels for the drops, indexed by drop. Falls back to "1", "2", … */
  dropLabels?: string[];
  plate?: string;
  readOnly?: boolean;
  onSelect?: (compartmentIndex: number) => void;
  /** Localized word for a compartment no drop has claimed. */
  emptyLabel?: string;
  className?: string;
  'aria-label'?: string;
  /**
   * Turns on the receipt flow: tap for the popover, drag to extend a receipt.
   * Without it a tap is `onSelect`, the plain toggle.
   */
  onAssign?: (compartmentIndex: number, dropIndex: number | null) => void;
  /** The popover's content for a compartment. Required for the flow. */
  renderPopover?: (compartmentIndex: number, close: () => void) => React.ReactNode;
  /**
   * Which drop a drag starting on this compartment extends. Defaults to the
   * compartment's own drop, else `activeDrop`. The caller may create one
   * here and return its index; `null` means no drag.
   */
  resolveDragDrop?: (compartmentIndex: number) => number | null;
  /** What is known about each drop, for the label's detail line. */
  drops?: ReadonlyArray<{ receipt?: string; dropOff?: string }>;
  /** Controlled popover: which compartment's is open. */
  openIndex?: number | null;
  onOpenIndexChange?: (compartmentIndex: number | null) => void;
}

export { gasCode, gasColor, dropColor } from './palette';

const TOKENS = ['money', 'primary', 'success', 'muted-foreground', 'foreground'] as const;

/* -- Framing ---------------------------------------------------------------- */
/* Orthographic, looking straight at the near side so the nose points right.
   Nothing is solved per layout: the rig is a fixed size, so the frame is the
   rig's length plus a margin, and the zoom is whatever maps that onto the
   canvas width. The vertical placement follows from the aspect ratio the CSS
   gives the canvas — the ground sits a fixed distance above the bottom edge
   and the headroom above the tank is whatever is left, which is where the
   labels live. */
const FRAME_FRONT = NOSE_Z - 0.55;
const FRAME_BACK = REAR_FRAME_Z + 0.55;
const FRAME_W = FRAME_BACK - FRAME_FRONT;
const FRAME_Z = (FRAME_FRONT + FRAME_BACK) / 2;
// Room under the wheels for the contact shadow and the plate.
const GROUND_MARGIN = 0.6;
const CAMERA_X = 40;

function Framing() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  React.useEffect(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    const zoom = size.width / FRAME_W;
    const visibleH = size.height / zoom;
    camera.zoom = zoom;
    camera.position.set(CAMERA_X, visibleH / 2 - GROUND_MARGIN, FRAME_Z);
    camera.lookAt(0, camera.position.y, FRAME_Z);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

/* -- Labels ----------------------------------------------------------------- */
/* Labels are DOM, so they are sized in pixels while the tank is sized in
   metres, and the ratio between the two swings 3× between a phone and a
   desktop. A label sits inside its compartment when the compartment is wide
   enough in pixels to hold it, which is every realistic layout on a desktop.
   When it is not — a 12,000 L compartment on a phone is under 50 px — the
   label lifts above the tank on a leader, alternating two rows so that
   neighbours, the only labels that can ever be closer than a label's width,
   never share one. Placing them in scene units cannot do this: a stagger that
   separates two rows at 940 px stacks them at 380 px. */
const INSIDE_MIN_PX = 68;
const LEADER_PX = 6;
const ROW_PX = 46;

/* -- Fixed parts ----------------------------------------------------------- */

function Part({
  geometry = 'box',
  args,
  position,
  color = BODY_WHITE,
  outline = true,
}: {
  geometry?: 'box' | 'cyl';
  args: number[];
  position?: [number, number, number];
  color?: string;
  outline?: boolean;
}) {
  return (
    <mesh position={position}>
      {geometry === 'box' ? (
        <boxGeometry args={args as [number, number, number]} />
      ) : (
        <cylinderGeometry args={args as [number, number, number, number]} />
      )}
      <meshStandardMaterial color={color} roughness={0.6} metalness={0.05} />
      {outline && <Outlines thickness={0.004} color={OUT} screenspace />}
    </mesh>
  );
}

function Wheel({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, TIRE_R, z]} rotation={[0, 0, Math.PI / 2]}>
      <mesh geometry={tireGeo}>
        <meshStandardMaterial
          color={RUBBER}
          roughness={0.92}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={rimGeo}>
        <meshStandardMaterial color={RIM_C} roughness={0.26} metalness={0.72} />
      </mesh>
      <mesh geometry={capGeo}>
        <meshStandardMaterial color="#c8d1db" roughness={0.3} metalness={0.6} />
      </mesh>
    </group>
  );
}

/** The rig minus the barrel: everything that is the same on all 20 trucks. */
function Rig() {
  const railLen = RAIL_BACK - RAIL_FRONT;
  const railZ = (RAIL_BACK + RAIL_FRONT) / 2;
  const subFront = Math.min(Math.min(...TRAILER_ZS) - 1.3, NECK_BACK);
  const subLen = REAR_FRAME_Z - subFront;
  const subZ = (REAR_FRAME_Z + subFront) / 2;

  return (
    <group>
      {/* tractor */}
      {[-RAIL_X, RAIL_X].map((x) => (
        <Part
          key={x}
          args={[0.14, RAIL_H, railLen]}
          position={[x, RAIL_Y, railZ]}
          color={CHASSIS}
        />
      ))}
      <mesh geometry={cabGeo}>
        <meshPhysicalMaterial
          color={BODY_WHITE}
          roughness={0.34}
          metalness={0.05}
          clearcoat={0.55}
          clearcoatRoughness={0.28}
        />
        <Outlines thickness={0.004} color={OUT} screenspace />
      </mesh>
      {/* Side glass and door: the only cab detail a side elevation can see.
          The windscreen and grille face the camera edge-on and are left out. */}
      <Part
        args={[0.04, 0.78, 1.15]}
        position={[CAB_W / 2, CAB_TOP - 0.72, NOSE_Z + 1.35]}
        color={GLASS}
        outline={false}
      />
      <Part
        args={[0.03, CAB_TOP - 0.42 - (CAB_FLOOR + 0.08) - 0.12, 0.02]}
        position={[CAB_W / 2 + 0.01, (CAB_TOP - 0.42 + CAB_FLOOR + 0.08) / 2 - 0.06, CAB_REAR_Z - 0.06]}
        color={OUT}
        outline={false}
      />
      <Part
        args={[0.03, 0.42, 0.38]}
        position={[0, 1.35, NOSE_Z + 0.16]}
        color={DARK}
      />
      <Part
        geometry="cyl"
        args={[0.56, 0.56, 0.12, 28]}
        position={[0, RAIL_TOP + 0.06, FIFTH_Z]}
        color={CHASSIS}
      />

      {/* trailer frame */}
      <Part
        args={[
          1.5,
          SUB_Y + SUB_H / 2 - (RAIL_TOP + 0.12),
          NECK_BACK - (FIFTH_Z - 0.5),
        ]}
        position={[
          0,
          (SUB_Y + SUB_H / 2 + RAIL_TOP + 0.12) / 2,
          (NECK_BACK + FIFTH_Z - 0.5) / 2,
        ]}
        color={CHASSIS}
      />
      {[-SUB_X, SUB_X].map((x) => (
        <Part key={x} args={[0.13, SUB_H, subLen]} position={[x, SUB_Y, subZ]} color={CHASSIS} />
      ))}
      <Part args={[2.14, 0.26, 0.08]} position={[0, 1.0, REAR_FRAME_Z]} color={CHASSIS} />
      {[-0.78, 0.78].map((x) => (
        <Part
          key={x}
          args={[0.12, SUB_Y - SUB_H / 2 - 0.18, 0.12]}
          position={[x, (SUB_Y - SUB_H / 2 + 0.18) / 2, 2.15]}
          color={CHASSIS}
        />
      ))}

      {/* axles and wheels */}
      {[STEER_Z, ...DRIVE_ZS, ...TRAILER_ZS].map((z) => (
        <mesh key={z} position={[0, TIRE_R, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.095, 0.095, 2.62, 16]} />
          <meshStandardMaterial color={CHASSIS} roughness={0.6} />
        </mesh>
      ))}
      {[-TRACK_SINGLE, TRACK_SINGLE].map((x) => (
        <Wheel key={x} x={x} z={STEER_Z} />
      ))}
      {[...DRIVE_ZS, ...TRAILER_ZS].map((z) =>
        [-DUAL_OUTER, -DUAL_INNER, DUAL_INNER, DUAL_OUTER].map((x) => (
          <Wheel key={`${z}:${x}`} x={x} z={z} />
        )),
      )}
    </group>
  );
}

/** The load inside one compartment, cut down to the volume it is carrying. */
function Fill({
  geometry,
  z,
  color,
  ratio,
}: {
  geometry: THREE.BufferGeometry;
  z: number;
  color: string;
  ratio: number;
}) {
  // A clipping plane keeps everything below the fill line; the plate's own
  // outline supplies the rounded bottom, so nothing has to be re-shaped, and
  // a plate cut by a horizontal plane has a dead-straight top.
  const planes = React.useMemo(() => {
    if (ratio >= 1) return [];
    const level = TANK_Y - TANK_H / 2 + TANK_H * Math.max(ratio, 0);
    return [new THREE.Plane(new THREE.Vector3(0, -1, 0), level)];
  }, [ratio]);
  return (
    <mesh geometry={geometry} position={[TANK_HW + 0.03, TANK_Y, z]}>
      {/* Unlit: the fill is a swatch of the product token, and lighting it
          turned navy into slate and amber into tan. */}
      <meshBasicMaterial color={color} clippingPlanes={planes} />
    </mesh>
  );
}

/** Compartment edge and bulkheads, flat on the near wall. */
function Frame({
  length,
  z,
  domeFront,
  domeBack,
  color,
}: {
  length: number;
  z: number;
  domeFront: boolean;
  domeBack: boolean;
  color: string;
}) {
  const geometry = React.useMemo(
    () => frameGeo(length, domeFront, domeBack),
    [length, domeFront, domeBack],
  );
  React.useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={[TANK_HW + 0.06, TANK_Y, z]}>
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

interface Cell {
  compartment: TankerCompartment;
  index: number;
  z: number;
  length: number;
  /** Centre and length of the silhouette actually on screen. */
  drawnZ: number;
  drawnLength: number;
}

function Labels({
  cells,
  activeDrop,
  dropLabels,
  emptyLabel,
  interactive,
  flow,
  hovered,
  open,
  onHover,
  onOpenChange,
  onSelect,
  onPressStart,
  renderPopover,
  drops,
}: {
  cells: Cell[];
  activeDrop: number | null;
  dropLabels: string[];
  emptyLabel: string;
  interactive: boolean;
  flow: boolean;
  hovered: number | null;
  open: number | null;
  onHover: (index: number | null) => void;
  onOpenChange: (index: number | null) => void;
  onSelect?: (compartmentIndex: number) => void;
  onPressStart: (index: number) => void;
  renderPopover?: TankerDiagramProps['renderPopover'];
  drops?: TankerDiagramProps['drops'];
}) {
  const width = useThree((state) => state.size.width);
  const pxPerMetre = width / FRAME_W;

  return (
    <>
      {cells.map(({ compartment, index, drawnZ: z, drawnLength: length }) => {
        const assigned = compartment.dropIndex !== null;
        const isActive = assigned && compartment.dropIndex === activeDrop;
        const overridden = compartment.volume !== compartment.nominal;
        const label =
          assigned && compartment.dropIndex !== null
            ? (dropLabels[compartment.dropIndex] ?? String(compartment.dropIndex + 1))
            : null;
        const widthPx = length * pxPerMetre;
        const inside = widthPx >= INSIDE_MIN_PX;
        const leader = LEADER_PX + (index % 2) * ROW_PX;
        // Inside a compartment the label may not cross the bulkhead, so it is
        // capped to the compartment's width and its long lines truncate. The
        // registered figure of an override is the first thing to go.
        const maxWidth = inside ? Math.max(INSIDE_MIN_PX - 12, widthPx - 12) : 140;
        const roomForNominal = !inside || widthPx >= 110;
        // Receipt and drop-off ride on the label when the caller knows them.
        // The line is always reserved once `drops` is given, so an assigned
        // label and an empty one stay the same height.
        const drop = compartment.dropIndex !== null ? drops?.[compartment.dropIndex] : undefined;
        const detail = [drop?.receipt, drop?.dropOff].filter(Boolean).join(' · ');
        const withDetail = drops !== undefined;
        const accent =
          isActive && compartment.dropIndex !== null ? dropColor(compartment.dropIndex) : null;

        const button = (
          <button
            type="button"
            disabled={!interactive}
            onClick={flow ? undefined : () => onSelect?.(index)}
            onPointerDown={flow ? () => onPressStart(index) : undefined}
            onMouseEnter={() => onHover(index)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(index)}
            onBlur={() => onHover(null)}
            aria-pressed={flow ? undefined : interactive ? assigned : undefined}
            aria-expanded={flow ? open === index : undefined}
            aria-label={`Compartment ${index + 1}, ${compartment.nominal.toLocaleString()} litres${
              assigned ? `, drop ${label}` : `, ${emptyLabel.toLowerCase()}`
            }`}
            className={cn(
              'pointer-events-auto flex w-max min-w-[56px] flex-col items-center justify-center gap-0.5',
              withDetail ? 'h-12' : 'h-9',
              'rounded-md border bg-card/95 px-1.5 shadow-sm transition-[transform,box-shadow,background-color] duration-150',
              interactive && 'cursor-pointer hover:bg-card',
              (hovered === index || open === index) && 'scale-105 shadow-md',
              accent ? 'ring-2' : 'border-border',
              !accent && assigned && compartment.gasType === '' && 'border-warning/60',
              !assigned && 'border-dashed',
            )}
            style={{
              maxWidth,
              ...(accent
                ? {
                    borderColor: accent,
                    // Tailwind's ring colour is a CSS var, so the drop colour
                    // goes straight to it.
                    ['--tw-ring-color' as string]: accent + '55',
                  }
                : undefined),
            }}
          >
            <span className="flex items-center gap-1">
              {label !== null && (
                <span
                  className="inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                  style={{ backgroundColor: dropColor(compartment.dropIndex ?? 0) }}
                >
                  {label}
                </span>
              )}
              <span
                className="text-[11px] font-bold leading-none"
                style={{
                  color: assigned ? gasColor(compartment.gasType) : 'hsl(var(--muted-foreground))',
                }}
              >
                {assigned ? (compartment.gasType ? gasCode(compartment.gasType) : '—') : emptyLabel}
              </span>
            </span>
            {/* One line whatever the state, so every label is the same
                height: an override reads "31,500 / 33,000 L". */}
            <span className="max-w-full truncate text-[10px] font-semibold leading-none tabular-nums">
              {overridden ? (
                <>
                  <span className="text-warning">{compartment.volume.toLocaleString()}</span>
                  {roomForNominal && (
                    <>
                      <span className="font-normal text-muted-foreground"> / </span>
                      {compartment.nominal.toLocaleString()}
                    </>
                  )}
                  {' L'}
                </>
              ) : (
                `${compartment.volume.toLocaleString()} L`
              )}
            </span>
            {withDetail && (
              <span
                className="max-w-full truncate text-[9px] leading-none text-muted-foreground"
                title={detail || undefined}
              >
                {detail || '\u00a0'}
              </span>
            )}
          </button>
        );

        const control = flow && renderPopover ? (
          <Popover open={open === index} onOpenChange={(o) => onOpenChange(o ? index : null)}>
            <PopoverAnchor asChild>{button}</PopoverAnchor>
            <PopoverContent
              align="center"
              side="top"
              className="w-72 p-3"
              // The container form opens a drop-off picker dialog from in
              // here; a click inside that dialog is not "outside" this.
              onInteractOutside={(e) => {
                if ((e.target as Element | null)?.closest?.('[role="dialog"]')) e.preventDefault();
              }}
            >
              {renderPopover(index, () => onOpenChange(null))}
            </PopoverContent>
          </Popover>
        ) : (
          button
        );

        return inside ? (
          <Html
            key={index}
            position={[TANK_HW + 0.1, TANK_Y, z]}
            center
            zIndexRange={[10, 0]}
            style={{ pointerEvents: 'none', direction: 'ltr' }}
          >
            {control}
          </Html>
        ) : (
          <Html
            key={index}
            position={[TANK_HW + 0.1, TANK_TOP, z]}
            zIndexRange={[10, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <div
              className="absolute bottom-0 left-0 flex -translate-x-1/2 flex-col items-center"
              style={{ direction: 'ltr' }}
            >
              {control}
              <span
                aria-hidden
                className={cn('w-px', !accent && 'bg-border')}
                style={{ height: leader, backgroundColor: accent ?? undefined }}
              />
            </div>
          </Html>
        );
      })}
    </>
  );
}

export function TankerDiagram({
  compartments,
  activeDrop = null,
  dropLabels,
  plate,
  readOnly = false,
  onSelect,
  emptyLabel = 'Empty',
  className,
  'aria-label': ariaLabel,
  onAssign,
  renderPopover,
  resolveDragDrop,
  drops,
  openIndex,
  onOpenIndexChange,
}: TankerDiagramProps) {
  const tokens = useThemeTokens(TOKENS);
  const flow = !readOnly && typeof onAssign === 'function';
  const interactive =
    flow || (!readOnly && activeDrop !== null && typeof onSelect === 'function');
  const [hovered, setHovered] = React.useState<number | null>(null);
  const [openState, setOpenState] = React.useState<number | null>(null);
  const open = openIndex !== undefined ? openIndex : openState;
  const openRef = React.useRef(open);
  openRef.current = open;
  const setOpen = React.useCallback(
    (next: number | null) => {
      setOpenState(next);
      onOpenIndexChange?.(next);
    },
    [onOpenIndexChange],
  );
  const frameRef = React.useRef<HTMLDivElement>(null);
  const labels = React.useMemo(
    () =>
      dropLabels ??
      Array.from({ length: Math.max(activeDrop ?? -1, 0) + 1 }, (_, i) => String(i + 1)),
    [dropLabels, activeDrop],
  );

  const total = compartments.reduce((sum, c) => sum + (c.nominal || 0), 0);

  // Compartment lengths track nominal capacity, not the loaded volume: the
  // picture is of the truck, and the truck does not change shape when an admin
  // overrides a compartment's litres. The two domed ends belong to the barrel,
  // so only the first and last compartment carry them.
  const cells = React.useMemo(() => {
    const count = compartments.length;
    let cursor = TANK_Z - TANK_BODY_LEN / 2;
    return compartments.map((compartment, index) => {
      const length =
        total > 0
          ? (compartment.nominal / total) * TANK_BODY_LEN
          : TANK_BODY_LEN / Math.max(count, 1);
      const domeFront = index === 0;
      const domeBack = index === count - 1;
      const z = cursor + length / 2;
      cursor += length;
      // A domed end adds TANK_CAP beyond the body, so what is drawn is longer
      // than `length` and its centre sits half a cap off `z`. Labels and
      // hit-testing follow the drawn shape, not the body: centred on the body
      // an end compartment's label leant into its bulkhead.
      const front = domeFront ? TANK_CAP : 0;
      const back = domeBack ? TANK_CAP : 0;
      const drawnZ = z + (back - front) / 2;
      const drawnLength = length + front + back;
      // The compartment as drawn: one silhouette plate serves as the shell,
      // the fill's outline and the pointer target. It used to be a bevelled
      // extrusion, and three.js bevels both ends, so an end compartment's
      // shell ran a full cap into its neighbour. The plate already carries
      // the dome offset, so it is placed at `z`; only DOM labels and the
      // pointer hit-test, which have no geometry, use `drawnZ`.
      const geometry = fillGeo(length, domeFront, domeBack);
      return { compartment, index, z, length, drawnZ, drawnLength, geometry };
    });
  }, [compartments, total]);

  React.useEffect(() => {
    // ExtrudeGeometry allocates GPU buffers; a layout change would otherwise
    // leak one set per re-plan.
    return () => cells.forEach((cell) => cell.geometry.dispose());
  }, [cells]);

  const gasHex = React.useCallback(
    (gasType: string) => {
      const gas = gasType?.trim().toLowerCase();
      if (gas === 'diesel') return DIESEL_HEX;
      const token = GAS_TOKENS[gas];
      return (token && tokens[token]) || tokens['muted-foreground'] || '#8a8f98';
    },
    [tokens],
  );

  // Which compartment is under a screen x. The frame is a fixed slice of
  // world Z mapped onto the canvas width, nose to the right, so this is one
  // subtraction — no raycast, and it works for a touch the canvas never sees.
  const cellAt = React.useCallback(
    (clientX: number) => {
      const rect = frameRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return null;
      const z = FRAME_BACK - ((clientX - rect.left) / rect.width) * FRAME_W;
      const hit = cells.find(
        ({ drawnZ, drawnLength }) => Math.abs(z - drawnZ) <= drawnLength / 2,
      );
      return hit ? hit.index : null;
    },
    [cells],
  );

  const cellsRef = React.useRef(cells);
  cellsRef.current = cells;
  const compartmentsRef = React.useRef(compartments);
  compartmentsRef.current = compartments;

  const startPress = React.useCallback(
    (index: number) => {
      if (!flow || !onAssign) return;
      const drop = resolveDragDrop
        ? resolveDragDrop(index)
        : (compartmentsRef.current[index]?.dropIndex ?? activeDrop);
      let moved = false;
      let last = index;
      const onMove = (ev: PointerEvent) => {
        const under = cellAt(ev.clientX);
        if (under === null || under === last) return;
        moved = true;
        if (drop !== null) {
          // The compartment the drag started on comes along too: an empty one
          // is the natural place to begin a new receipt's run.
          if (last === index && compartmentsRef.current[index]?.dropIndex !== drop) {
            onAssign(index, drop);
          }
          if (compartmentsRef.current[under]?.dropIndex !== drop) onAssign(under, drop);
        }
        last = under;
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        if (!moved) setOpen(openRef.current === index ? null : index);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [flow, onAssign, activeDrop, cellAt, resolveDragDrop, setOpen],
  );

  if (compartments.length === 0) return null;

  return (
    <div
      className={cn('w-full', className)}
      role="group"
      aria-label={
        ariaLabel ?? (plate ? `Compartment layout for ${plate}` : 'Compartment layout')
      }
    >
      {/* Taller on a phone: that is where labels lift above the tank in two
          rows of fixed pixel height, and the canvas has to hold both. pan-y:
          a horizontal drag is ours, a vertical one is still the page
          scrolling. */}
      <div
        ref={frameRef}
        className="relative aspect-[16/10] w-full sm:aspect-[16/6]"
        style={{ touchAction: 'pan-y' }}
      >
        <Canvas
          orthographic
          frameloop="demand"
          dpr={[1, 2]}
          camera={{ position: [CAMERA_X, 2, FRAME_Z], near: 0.1, far: 200 }}
          gl={{ antialias: true, alpha: true, localClippingEnabled: true }}
          fallback={
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {plate}
            </div>
          }
        >
          <ambientLight intensity={0.55} />
          <directionalLight position={[16, 14, -4]} intensity={1.3} />
          <directionalLight position={[-10, 7, 10]} intensity={0.4} />

          <Framing />

          <group>
            <Rig />

            {cells.map(({ compartment, index, z, length, geometry }) => {
              const assigned = compartment.dropIndex !== null;
              const ratio =
                compartment.nominal > 0 ? compartment.volume / compartment.nominal : 1;
              return (
                <React.Fragment key={index}>
                  {assigned && (
                    <Fill
                      geometry={geometry}
                      z={z}
                      color={gasHex(compartment.gasType)}
                      ratio={ratio}
                    />
                  )}
                  <mesh
                    geometry={geometry}
                    position={[TANK_HW + 0.01, TANK_Y, z]}
                    onClick={interactive && !flow ? () => onSelect?.(index) : undefined}
                    onPointerDown={flow ? () => startPress(index) : undefined}
                    onPointerOver={
                      interactive
                        ? (e) => {
                            e.stopPropagation();
                            setHovered(index);
                            document.body.style.cursor = 'pointer';
                          }
                        : undefined
                    }
                    onPointerOut={
                      interactive
                        ? () => {
                            setHovered((current) => (current === index ? null : current));
                            document.body.style.cursor = '';
                          }
                        : undefined
                    }
                  >
                    {/* Transparent by design: the load is the subject, so the
                        shell has to be something you look through rather than
                        at. Front faces only — the inside of a domed end seen
                        through the near wall drew a pale band beside every
                        bulkhead. depthWrite off stops one compartment's wall
                        from punching a hole in the next. */}
                    {/* Hover brightens the shell rather than fading the fill:
                        a translucent fill shows its own domed end through
                        itself as a dark band. */}
                    <meshBasicMaterial
                      color={BODY_WHITE}
                      transparent
                      opacity={hovered === index ? 0.32 : 0.1}
                      depthWrite={false}
                    />
                  </mesh>
                  {/* The active drop is shown on the label alone. The rig's
                      fixed navy edge disappears on a dark page, so the frame
                      takes the foreground token, which flips with the theme. */}
                  <Frame
                    length={length}
                    z={z}
                    domeFront={index === 0}
                    domeBack={index === cells.length - 1}
                    color={tokens.foreground ?? OUT}
                  />
                </React.Fragment>
              );
            })}

            <Labels
              cells={cells}
              activeDrop={activeDrop}
              dropLabels={labels}
              emptyLabel={emptyLabel}
              interactive={interactive}
              flow={flow}
              hovered={hovered}
              open={open}
              onHover={setHovered}
              onOpenChange={setOpen}
              onSelect={onSelect}
              onPressStart={startPress}
              renderPopover={renderPopover}
              drops={drops}
            />
          </group>

        </Canvas>

        {plate && (
          <span className="absolute end-2 top-1 text-[11px] font-medium text-muted-foreground">
            {plate}
          </span>
        )}
      </div>
    </div>
  );
}
