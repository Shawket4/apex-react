import { describe, expect, it } from 'vitest';
import { buildMapLayout, positionLabel } from 'apex-tire-diagram';
import { tirePositionSchema } from './schemas';
import { toTireDiagram } from './tire-diagram';

/** Rows as GET /office/vehicles/:id/maintenance sends them (maint-rust office.rs). */
const row = (over: Record<string, unknown>) =>
  tirePositionSchema.parse({
    position_id: `p-${String(over.position_code)}`,
    is_spare: false,
    spare_index: null,
    side: null,
    depth: null,
    section: null,
    axle_index: null,
    is_steering: null,
    tire_id: null,
    brand: null,
    model: null,
    size: null,
    dot_code: null,
    total_km: null,
    mounted_at: null,
    ...over,
  });

const tractor = (code: string, axle: number, side: string, depth: string, steering = false) =>
  row({
    position_code: code,
    section: 'tractor',
    axle_index: axle,
    side,
    depth,
    is_steering: steering,
  });

const rows = [
  tractor('H1L', 1, 'left', 'single', true),
  tractor('H1R', 1, 'right', 'single', true),
  { ...tractor('H2LO', 2, 'left', 'outer'), tire_id: 't1', brand: 'Pirelli', size: '315/80 R22.5' },
  tractor('H2LI', 2, 'left', 'inner'),
  tractor('H2RI', 2, 'right', 'inner'),
  tractor('H2RO', 2, 'right', 'outer'),
  row({ position_code: 'TR1L', section: 'trailer', axle_index: 1, side: 'left', depth: 'single' }),
  row({ position_code: 'TR1R', section: 'trailer', axle_index: 1, side: 'right', depth: 'single' }),
  row({ position_code: 'SP1', is_spare: true, spare_index: 1, tire_id: 't9' }),
];

describe('toTireDiagram', () => {
  it('rebuilds one axle per section and index, steering and dual included', () => {
    const { axles } = toTireDiagram(rows);
    expect(
      axles.map((a) => [a.section, a.section_index, a.axle_type, a.is_steering, a.is_lifted]),
    ).toEqual([
      ['tractor', 1, 'single', true, false],
      ['tractor', 2, 'dual', false, false],
      ['trailer', 1, 'single', false, false],
    ]);
  });

  it('keeps every position, links it to its axle, and carries the office row', () => {
    const { axles, positions } = toTireDiagram(rows);
    expect(positions).toHaveLength(rows.length);
    const ids = new Set(axles.map((a) => a.id));
    for (const p of positions) {
      if (p.is_spare) expect(p.axle_id).toBeNull();
      else expect(ids.has(p.axle_id ?? '')).toBe(true);
      expect(p.pending).toBe(false);
      expect(p.row.position_id).toBe(p.id);
    }
  });

  it('draws the truck the way the garage does', () => {
    const { axles, positions } = toTireDiagram(rows);
    const map = buildMapLayout(axles, positions);
    expect(map.tractor[1].left.map((p) => p.position_code)).toEqual(['H2LO', 'H2LI']);
    expect(map.trailer[0].right.map((p) => p.position_code)).toEqual(['TR1R']);
    expect(map.spares.map((p) => p.position_code)).toEqual(['SP1']);
    const h2lo = positions.find((p) => p.position_code === 'H2LO')!;
    expect(positionLabel(h2lo, axles, 'en')).toBe('Tractor axle 2, left outer');
    expect(positionLabel(h2lo, axles, 'ar')).toBe('الراس محور ٢ شمال برّه');
  });

  it('draws a lifted axle raised and keeps the garage axle id', () => {
    const lifted = [
      row({
        position_code: 'TR2LO',
        section: 'trailer',
        axle_index: 2,
        side: 'left',
        depth: 'outer',
        axle_id: 'ax-9',
        is_lifted: true,
      }),
      row({
        position_code: 'TR2LI',
        section: 'trailer',
        axle_index: 2,
        side: 'left',
        depth: 'inner',
        axle_id: 'ax-9',
        is_lifted: true,
      }),
      row({
        position_code: 'TR1L',
        section: 'trailer',
        axle_index: 1,
        side: 'left',
        depth: 'single',
      }),
    ];
    const { axles, positions } = toTireDiagram(lifted);
    expect(axles.map((a) => [a.id, a.section_index, a.is_lifted, a.axle_type])).toEqual([
      ['ax-9', 2, true, 'dual'],
      ['trailer-1', 1, false, 'single'],
    ]);
    expect(positions.map((p) => p.axle_id)).toEqual(['ax-9', 'ax-9', 'trailer-1']);
    // An older server sends neither: every axle is on the road.
    expect(tirePositionSchema.parse({ position_id: 'p' }).is_lifted).toBe(false);
  });

  it('puts a position with no axle beside the spares instead of dropping it', () => {
    const { positions, axles } = toTireDiagram([row({ position_code: 'X1', side: 'left' })]);
    expect(positions[0].axle_id).toBeNull();
    expect(buildMapLayout(axles, positions).spares.map((p) => p.position_code)).toEqual(['X1']);
  });
});
