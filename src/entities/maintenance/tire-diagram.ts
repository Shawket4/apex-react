import type { DiagramAxle, DiagramPosition } from 'apex-tire-diagram';
import type { TirePosition } from './schemas';

/** A wheel as the shared diagram draws it, still carrying the office row. */
export type DiagramWheel = DiagramPosition & { row: TirePosition };

export interface TireDiagramData {
  axles: DiagramAxle[];
  positions: DiagramWheel[];
}

const axleKey = (section: string, index: number) => `${section}-${index}`;

/**
 * The office's tire rows (GET /office/vehicles/:id/maintenance → `tires`) as
 * the shared wheel diagram's axles and positions.
 *
 * The office endpoint sends each position with its axle flattened in
 * (`section`, `axle_index`, `is_steering`, `is_lifted`, `axle_id`), so the
 * axles are rebuilt from the positions: one per (section, index), under the
 * garage's axle id when it is sent. A lifted axle is drawn raised. Nothing
 * here is ever "pending": that is the garage's own not-yet-sent state.
 */
export function toTireDiagram(tires: TirePosition[]): TireDiagramData {
  const axles = new Map<string, DiagramAxle & { dual: boolean }>();
  const positions = tires.map<DiagramWheel>((row) => {
    let axleId: string | null = null;
    if (
      !row.is_spare &&
      (row.section === 'tractor' || row.section === 'trailer') &&
      row.axle_index !== null
    ) {
      const key = axleKey(row.section, row.axle_index);
      const axle = axles.get(key) ?? {
        id: row.axle_id ?? key,
        section: row.section,
        section_index: row.axle_index,
        axle_type: 'single',
        is_steering: false,
        is_lifted: false,
        dual: false,
      };
      axle.is_steering ||= row.is_steering === true;
      axle.is_lifted ||= row.is_lifted;
      axle.dual ||= row.depth === 'inner' || row.depth === 'outer';
      axles.set(key, axle);
      axleId = axle.id;
    }
    return {
      id: row.position_id,
      axle_id: axleId,
      side: row.side,
      depth: row.depth,
      is_spare: row.is_spare === true,
      spare_index: row.spare_index,
      position_code: row.position_code ?? '',
      tire_id: row.tire_id,
      brand: row.brand,
      model: row.model,
      size: row.size,
      pending: false,
      row,
    };
  });
  return {
    axles: [...axles.values()].map(({ dual, ...axle }) => ({
      ...axle,
      axle_type: dual ? 'dual' : 'single',
    })),
    positions,
  };
}
