import { describe, expect, it, vi } from 'vitest';
import { carFormDefaults, carFormSchema, carPayload, type CarFormValues } from './schemas';

vi.mock('@/shared/i18n', () => ({ default: { t: (key: string) => key } }));

const litres = (...values: string[]) => values.map((value) => ({ litres: value }));

const blank: CarFormValues = {
  car_no_plate: ' أ ب ج 1234 ',
  car_type: 'No Trailer',
  driver_id: 0,
  compartments: [],
  chassis_no: '',
  engine_no: '',
  engine_cc: '',
  engine_cylinders: '',
  payload_tons: '',
  color: '',
  trailer_no_plate: '',
  trailer_chassis_no: '',
  trailer_payload_tons: '',
  trailer_color: '',
};

describe('carFormSchema', () => {
  it('asks for the plate and nothing else', () => {
    expect(carFormSchema.safeParse(blank).success).toBe(true);
    expect(carFormSchema.safeParse({ ...blank, car_no_plate: '   ' }).success).toBe(false);
  });

  it('refuses an amount that is not a number, negative, or a fraction of a cc or a cylinder', () => {
    expect(carFormSchema.safeParse({ ...blank, payload_tons: 'heavy' }).success).toBe(false);
    expect(carFormSchema.safeParse({ ...blank, payload_tons: '-1' }).success).toBe(false);
    expect(carFormSchema.safeParse({ ...blank, payload_tons: '32.5' }).success).toBe(true);
    expect(carFormSchema.safeParse({ ...blank, engine_cc: '12.5' }).success).toBe(false);
    expect(carFormSchema.safeParse({ ...blank, engine_cc: '12800' }).success).toBe(true);
    expect(carFormSchema.safeParse({ ...blank, engine_cylinders: '6.5' }).success).toBe(false);
    expect(carFormSchema.safeParse({ ...blank, engine_cylinders: '6' }).success).toBe(true);
  });
});

describe('carPayload', () => {
  it('trims text and reads empty amounts as zero', () => {
    const payload = carPayload({
      ...blank,
      chassis_no: ' WDB123 ',
      engine_cc: '12800',
      engine_cylinders: '6',
    });
    expect(payload.car_no_plate).toBe('أ ب ج 1234');
    expect(payload.chassis_no).toBe('WDB123');
    expect(payload.engine_cc).toBe(12800);
    expect(payload.engine_cylinders).toBe(6);
    expect(payload.payload_tons).toBe(0);
  });

  it('drops empty compartments and totals the rest', () => {
    const payload = carPayload({ ...blank, compartments: litres('7000', '', '8000', '0') });
    expect(payload.compartments).toEqual([7000, 8000]);
    expect(payload.tank_capacity).toBe(15000);
  });

  it('leaves the capacity alone when no compartments are given', () => {
    const payload = carPayload({ ...blank, compartments: litres('', '') });
    expect(payload.compartments).toEqual([]);
    expect('tank_capacity' in payload).toBe(false);
  });

  it('sends the trailer only for a vehicle that pulls one', () => {
    const trailer = { trailer_no_plate: ' ق ط 99 ', trailer_payload_tons: '30' };
    const truck = carPayload({ ...blank, ...trailer, car_type: 'Truck' });
    expect('trailer_no_plate' in truck).toBe(false);
    const articulated = carPayload({ ...blank, ...trailer, car_type: 'Trailer' });
    expect(articulated.trailer_no_plate).toBe('ق ط 99');
    expect(articulated.trailer_payload_tons).toBe(30);
    expect(articulated.trailer_color).toBe('');
  });
});

describe('carFormDefaults', () => {
  it('opens a new car with empty tank sections and no driver', () => {
    const values = carFormDefaults();
    expect(values.compartments).toEqual(litres('', '', '', ''));
    expect(values.driver_id).toBe(0);
    expect(values.car_type).toBe('No Trailer');
  });

  it('shows what is recorded, and nothing where nothing is', () => {
    const values = carFormDefaults({
      ID: 7,
      car_no_plate: 'ABC 123',
      car_type: 'Trailer',
      driver_id: 3,
      json_compartments: [7000, 8000],
      engine_cc: 12800,
      engine_cylinders: 6,
      payload_tons: 0,
      trailer_no_plate: null,
    });
    expect(values.compartments).toEqual(litres('7000', '8000'));
    expect(values.engine_cc).toBe('12800');
    expect(values.engine_cylinders).toBe('6');
    expect(values.payload_tons).toBe('');
    expect(values.trailer_no_plate).toBe('');
    expect(carFormSchema.safeParse(values).success).toBe(true);
  });
});
