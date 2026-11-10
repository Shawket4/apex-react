import * as React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Container, Gauge, Truck, User, type LucideIcon } from 'lucide-react';
import { carTypeName } from '@/entities/car/labels';
import { TRAILER_CAR_TYPE, carCompartments, type Car } from '@/entities/car/schemas';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { DocumentsSummary } from '@/widgets/documents/documents-summary';

interface SectionProps {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}

function Section({ icon: Icon, title, children }: SectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

interface FactProps {
  label: string;
  /** Nothing recorded shows as a dash, not as an empty row. */
  value?: React.ReactNode;
  /** Plates and serial numbers read the same way in either language. */
  code?: boolean;
}

function Fact({ label, value, code }: FactProps) {
  const present = value !== undefined && value !== null && value !== '';
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium">
        {!present ? (
          <span className="opacity-40">—</span>
        ) : code ? (
          <span dir="auto">{value}</span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

const FACTS = 'grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3';

function measured(value: number | null | undefined, unit: string): string | undefined {
  return value ? `${value.toLocaleString()} ${unit}` : undefined;
}

interface CarOverviewTabProps {
  car: Car;
  /** Opens the car's documents. */
  onOpenDocuments: () => void;
}

/** What is recorded about a car: the vehicle, its trailer, its tank, who drives it and its papers. */
export function CarOverviewTab({ car, onOpenDocuments }: CarOverviewTabProps) {
  const { t } = useTranslation();
  const ton = t('cars.units.ton');
  const litre = t('cars.units.litre');
  const compartments = carCompartments(car);
  const driverName: string | undefined = car.driver?.name || undefined;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Section icon={Truck} title={t('cars.sections.vehicleInfo')}>
        <dl className={FACTS}>
          <Fact label={t('cars.fields.plateNumber')} value={car.car_no_plate} code />
          <Fact label={t('cars.fields.carType')} value={carTypeName(t, car.car_type)} />
          <Fact label={t('cars.fields.color')} value={car.color} />
          <Fact label={t('cars.fields.chassisNumber')} value={car.chassis_no} code />
          <Fact label={t('cars.fields.engineNumber')} value={car.engine_no} code />
          <Fact label={t('cars.fields.engineSize')} value={measured(car.engine_cc, t('cars.units.cc'))} />
          <Fact label={t('cars.fields.cylinders')} value={car.engine_cylinders || undefined} />
          <Fact label={t('cars.fields.payload')} value={measured(car.payload_tons, ton)} />
        </dl>
      </Section>

      {car.car_type === TRAILER_CAR_TYPE ? (
        <Section icon={Container} title={t('cars.sections.trailer')}>
          <dl className={FACTS}>
            <Fact label={t('cars.fields.trailerPlateNumber')} value={car.trailer_no_plate} code />
            <Fact label={t('cars.fields.color')} value={car.trailer_color} />
            <Fact label={t('cars.fields.chassisNumber')} value={car.trailer_chassis_no} code />
            <Fact label={t('cars.fields.payload')} value={measured(car.trailer_payload_tons, ton)} />
          </dl>
        </Section>
      ) : null}

      <Section icon={Gauge} title={t('cars.sections.compartments')}>
        <dl className={FACTS}>
          <Fact label={t('cars.fields.capacity')} value={measured(car.tank_capacity, litre)} />
          {compartments.map((litres, index) => (
            <Fact
              // A tank layout is a fixed, ordered list: the position is the identity.
              key={index}
              label={t('cars.sections.compartmentIndex', { index: index + 1 })}
              value={measured(litres, litre)}
            />
          ))}
        </dl>
      </Section>

      <Section icon={User} title={t('cars.sections.driverAssignment')}>
        {car.driver_id ? (
          <Link
            to={`/drivers/${car.driver_id}`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {driverName ?? t('common.unknown')}
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">{t('cars.noDriver')}</p>
        )}
      </Section>

      <DocumentsSummary
        className="lg:col-span-2"
        ownerKind="car"
        ownerId={car.ID}
        carType={car.car_type}
        onOpen={onOpenDocuments}
      />
    </div>
  );
}
