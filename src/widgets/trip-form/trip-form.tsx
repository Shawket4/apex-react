import * as React from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ImageIcon,
  Loader2,
  MapPin,
  Plus,
  Save,
  SplitSquareHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { SearchableSelect } from '@/shared/ui/searchable-select';
import { DatePicker } from '@/shared/ui/date-picker';
import { Skeleton } from '@/shared/ui/skeleton';
import { MultiSelect } from '@/shared/ui/multi-select';

import { useCars } from '@/entities/car/queries';
import { useDrivers } from '@/entities/driver/queries';
import {
  UNREGISTERED_DRIVER_ID,
  UNREGISTERED_DRIVER_NAME,
} from '@/entities/driver/schemas';
import {
  useCompanies,
  useTerminals,
} from '@/entities/mapping/queries';
import {
  useCreateMultiContainerTrip,
  useUpdateMultiContainerTrip,
  useParentContainers,
} from '@/entities/trip/queries';
import { tripApi } from '@/entities/trip/api';
import type {
  ContainerInput,
  DuplicateDetectionResponse,
  MultiContainerTripInput,
} from '@/entities/trip/schemas';
import type { ApproveBatchNavState } from '@/entities/receipt-batch/schemas';
import type { MappingDetail } from '@/entities/mapping/schemas';
import { extractErrorMessage } from '@/shared/api/errors';
import { today, formatNumber, formatCurrency } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';

import {
  DropOffPickerModal,
  DROP_OFF_UNREGISTERED,
} from './drop-off-picker-modal';
import { DuplicateComparisonDialog } from './duplicate-comparison-dialog';

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

interface TripFormProps {
  /** Set when editing — undefined for create mode. */
  parentId?: number;
}

interface ContainerForm extends ContainerInput {
  /** Cached fee/distance for fee-preview banner — not sent to backend */
  _fee?: number;
  _distance?: number;
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                   */
/* -------------------------------------------------------------------------- */

const emptyContainer = (): ContainerForm => ({
  drop_off_point: '',
  tank_capacity: 0,
  gas_type: '',
  receipt_no: '',
});

const MAX_CONTAINERS = 4;
const CAPACITY_TOLERANCE = 0; // Exact match required
const RECEIPT_MIN_LENGTH = 4;

/**
 * Allowed gas types. Stored as comma-separated values in `gas_type` (e.g.
 * "80,92"). Display labels are localized via `trips.form.gasType.options.*`.
 */
const GAS_TYPE_VALUES = ['80', '92', '95', 'diesel'] as const;
type GasTypeValue = (typeof GAS_TYPE_VALUES)[number];

/**
 * Parse the backend's comma-separated `gas_type` string into an array of
 * known values. Tolerant of whitespace and casing for the "diesel" string.
 * Unknown values are dropped on parse — the backend may have older free-form
 * strings we don't recognise.
 */
function parseGasTypes(raw: string | undefined): GasTypeValue[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .map((s): GasTypeValue | null => {
      if (s === '80' || s === '92' || s === '95') return s;
      if (s === 'diesel') return 'diesel';
      return null;
    })
    .filter((v): v is GasTypeValue => v !== null);
}

/** Serialize the multi-selected gas types back to the comma-separated form. */
function serializeGasTypes(values: GasTypeValue[]): string {
  // Preserve canonical order ("80,92,95,diesel") regardless of click order
  return GAS_TYPE_VALUES.filter((v) => values.includes(v)).join(',');
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export function TripForm({ parentId }: TripFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = parentId != null;

  // Receipt-batch state from /receipt-batches → navigate(...)
  const batchNavState = location.state as Partial<ApproveBatchNavState> | null;

  /* ---- Form state ------------------------------------------------------- */

  const [carId, setCarId] = React.useState<number | null>(null);
  const [driverId, setDriverId] = React.useState<number | null>(
    batchNavState?.driverId ?? null,
  );
  const [date, setDate] = React.useState<string>(today());
  const [searchParams] = useSearchParams();
  const paramCompany = searchParams.get('company');
  const paramTerminal = searchParams.get('terminal');

  const [company, setCompany] = React.useState<string>(paramCompany ?? '');
  const [terminal, setTerminal] = React.useState<string>(paramTerminal ?? '');

  React.useEffect(() => {
    if (paramCompany) setCompany(paramCompany);
    if (paramTerminal) setTerminal(paramTerminal);
  }, [paramCompany, paramTerminal]);

  const [containers, setContainers] = React.useState<ContainerForm[]>([
    emptyContainer(),
  ]);
  const [pickingContainerIdx, setPickingContainerIdx] =
    React.useState<number | null>(null);

  // Track which receipt fields have been touched so we don't show min-length
  // errors before the user has had a chance to type.
  const [receiptTouched, setReceiptTouched] = React.useState<Set<number>>(
    new Set(),
  );

  // Duplicate detection state
  const [pendingDuplicate, setPendingDuplicate] =
    React.useState<DuplicateDetectionResponse | null>(null);

  // Dismissable receipt-batch banner
  const [showBatchBanner, setShowBatchBanner] = React.useState(
    !!batchNavState?.receiptBatchId,
  );

  /* ---- Data ------------------------------------------------------------- */

  const { data: cars = [], isLoading: loadingCars } = useCars();
  const { data: drivers = [], isLoading: loadingDrivers } = useDrivers();
  const { data: companiesResp, isLoading: loadingCompanies } = useCompanies();
  const { data: terminalsResp } = useTerminals(company, { enabled: !!company });
  const { data: parentData, isLoading: loadingParent } = useParentContainers(
    parentId ?? null,
    { enabled: isEdit },
  );

  const companyList = companiesResp?.data ?? [];
  const terminalList = terminalsResp?.data ?? [];

  /* ---- Derived: selected car / driver ---------------------------------- */

  const selectedCar = React.useMemo(
    () => cars.find((c) => c.ID === carId) ?? null,
    [cars, carId],
  );
  const selectedDriver = React.useMemo(() => {
    if (driverId === UNREGISTERED_DRIVER_ID) {
      return { ID: UNREGISTERED_DRIVER_ID, name: UNREGISTERED_DRIVER_NAME };
    }
    return drivers.find((d) => d.ID === driverId) ?? null;
  }, [drivers, driverId]);

  /* ---- Hydrate from parent data when editing --------------------------- */

  const hydratedRef = React.useRef(false);
  React.useEffect(() => {
    if (!isEdit || !parentData || hydratedRef.current) return;
    hydratedRef.current = true;

    const parent = parentData.parent_trip;
    const fetchedContainers = parentData.containers;

    setCarId(parent.car_id ?? null);
    setDriverId(parent.driver_id ?? null);
    setDate(parent.date ?? today());
    setCompany(parent.company ?? '');
    setTerminal(parent.terminal ?? '');
    setContainers(
      fetchedContainers.map((c) => ({
        id: c.ID,
        receipt_no: c.receipt_no ?? '',
        tank_capacity: c.tank_capacity ?? 0,
        gas_type: c.gas_type ?? '',
        drop_off_point: c.drop_off_point ?? '',
        _fee: c.fee ?? 0,
        _distance: c.mileage || c.distance || 0,
      })),
    );
    // Mark all hydrated receipts as touched so existing receipts that happen
    // to be shorter than 4 chars aren't silently flagged on first render.
    setReceiptTouched(
      new Set(fetchedContainers.map((_, i) => i)),
    );
  }, [isEdit, parentData]);

  /* ---- Auto-fill driver from car (only on create / car change) --------- */

  React.useEffect(() => {
    if (batchNavState?.driverId) return;
    if (isEdit && !hydratedRef.current) return;
    if (!selectedCar?.driver_id) return;
    setDriverId(selectedCar.driver_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCar?.ID]);

  /* ---- Reset terminal/dropoffs when company changes -------------------- */

  const lastCompanyRef = React.useRef(company);
  React.useEffect(() => {
    if (lastCompanyRef.current === company) return;
    if (lastCompanyRef.current !== '' && terminal !== paramTerminal) {
      setTerminal('');
      setContainers((cs) =>
        cs.map((c) => ({ ...c, drop_off_point: '', _fee: 0, _distance: 0 })),
      );
    }
    lastCompanyRef.current = company;
  }, [company, terminal, paramTerminal]);

  const lastTerminalRef = React.useRef(terminal);
  React.useEffect(() => {
    if (lastTerminalRef.current === terminal) return;
    if (lastTerminalRef.current !== '') {
      setContainers((cs) =>
        cs.map((c) => ({ ...c, drop_off_point: '', _fee: 0, _distance: 0 })),
      );
    }
    lastTerminalRef.current = terminal;
  }, [terminal]);

  /* ---- Capacity validator ---------------------------------------------- */

  const carCapacity = selectedCar?.tank_capacity ?? 0;
  const totalContainerCapacity = containers.reduce(
    (sum, c) => sum + (c.tank_capacity || 0),
    0,
  );
  const capacityDelta = totalContainerCapacity - carCapacity;
  const capacityValid =
    carCapacity === 0 || Math.abs(capacityDelta) <= CAPACITY_TOLERANCE;

  /* -------------------------------------------------------------------------- */
  /* Receipt validators — min-length (hard) + in-form duplicates (soft warn)   */
  /* -------------------------------------------------------------------------- */

  // Per-container length error (only enforced once submission proceeds — see
  // `tooShort` for the immediate display rule). Set when receipt is non-empty
  // but under min length.
  const receiptLengthErrors = React.useMemo(() => {
    const errs = new Map<number, boolean>();
    containers.forEach((c, idx) => {
      const v = c.receipt_no.trim();
      if (v.length > 0 && v.length < RECEIPT_MIN_LENGTH) {
        errs.set(idx, true);
      }
    });
    return errs;
  }, [containers]);

  /**
   * Identify in-form duplicate receipts.
   *
   * Two containers in the same submission with the same trimmed receipt
   * number are flagged as duplicates of each other. The map's value is the
   * list of OTHER container indices sharing the same receipt — used to
   * compose the warning text "also used in container 2, 3" inline.
   *
   * Empty receipt numbers are not considered. Comparison is case-sensitive
   * since receipt numbers are typically alphanumeric tags whose case carries
   * meaning ("WT-1234" ≠ "wt-1234").
   */
  const inFormDuplicates = React.useMemo(() => {
    const byReceipt = new Map<string, number[]>();
    containers.forEach((c, idx) => {
      const v = c.receipt_no.trim();
      if (v.length === 0) return;
      const list = byReceipt.get(v) ?? [];
      list.push(idx);
      byReceipt.set(v, list);
    });
    const dupes = new Map<number, number[]>();
    for (const [, indices] of byReceipt) {
      if (indices.length < 2) continue;
      for (const idx of indices) {
        dupes.set(
          idx,
          indices.filter((i) => i !== idx),
        );
      }
    }
    return dupes;
  }, [containers]);

  /* ---- Mutations ------------------------------------------------------- */

  const createMutation = useCreateMultiContainerTrip();
  const updateMutation = useUpdateMultiContainerTrip();
  const isPending = createMutation.isPending || updateMutation.isPending;

  /* ---- Container handlers --------------------------------------------- */

  const updateContainer = (
    idx: number,
    patch: Partial<ContainerForm>,
  ) => {
    setContainers((cs) => cs.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const addContainer = () => {
    if (containers.length >= MAX_CONTAINERS) return;
    setContainers((cs) => [...cs, emptyContainer()]);
  };

  const removeContainer = (idx: number) => {
    if (containers.length <= 1) return;
    setContainers((cs) => cs.filter((_, i) => i !== idx));
    // Clean up touched-state when removing — re-index remaining entries
    setReceiptTouched((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => {
        if (i < idx) next.add(i);
        else if (i > idx) next.add(i - 1);
      });
      return next;
    });
  };

  const splitEvenly = () => {
    if (carCapacity <= 0 || containers.length === 0) return;
    const each = Math.round((carCapacity / containers.length) * 100) / 100;
    setContainers((cs) => cs.map((c) => ({ ...c, tank_capacity: each })));
  };

  const handleDropOffPicked = (
    idx: number,
    dropOff: string,
    mapping?: MappingDetail,
  ) => {
    const fee = mapping ? Number(mapping.fee) : 0;
    const distance = mapping ? Number(mapping.distance) : 0;
    updateContainer(idx, {
      drop_off_point:
        dropOff === DROP_OFF_UNREGISTERED ? UNREGISTERED_DRIVER_NAME : dropOff,
      _fee: fee,
      _distance: distance,
    });
  };

  const markReceiptTouched = (idx: number) => {
    setReceiptTouched((prev) => {
      if (prev.has(idx)) return prev;
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  };

  /* ---- Validation ------------------------------------------------------ */

  /**
   * Submit gating. All hard constraints must pass:
   *   - All required fields filled
   *   - Every receipt number meets the min-length rule
   *   - Container capacities sum to vehicle tank capacity
   *
   * In-form duplicate receipts are NOT a hard constraint — they're a soft
   * warning, since users sometimes legitimately need to enter the same
   * receipt across containers (e.g. a single bulk receipt covering two
   * deliveries).
   */
  const isValid = React.useMemo(() => {
    if (!selectedCar) return false;
    if (!driverId) return false;
    if (!company || !terminal) return false;
    if (!date) return false;
    if (containers.length === 0 || containers.length > MAX_CONTAINERS) return false;
    return containers.every(
      (c) =>
        c.receipt_no.trim().length >= RECEIPT_MIN_LENGTH &&
        !!c.drop_off_point &&
        c.tank_capacity > 0,
    );
  }, [selectedCar, driverId, company, terminal, date, containers]);

  /* ---- Submit ---------------------------------------------------------- */

  const buildPayload = (
    overrides: Partial<MultiContainerTripInput> = {},
  ): MultiContainerTripInput => {
    if (!selectedCar) throw new Error('No car selected');
    const driverName =
      selectedDriver?.name ??
      (driverId === UNREGISTERED_DRIVER_ID ? UNREGISTERED_DRIVER_NAME : '');
    return {
      parent_trip: {
        car_id: selectedCar.ID,
        driver_id: driverId ?? 0,
        car_no_plate: selectedCar.car_no_plate,
        driver_name: driverName,
        transporter: 'Apex',
        company,
        terminal,
        date,
      },
      containers: containers.map((c) => ({
        ...(c.id ? { id: c.id } : {}),
        receipt_no: c.receipt_no.trim(),
        drop_off_point: c.drop_off_point,
        tank_capacity: c.tank_capacity,
        gas_type: c.gas_type ?? '',
      })),
      update_containers: isEdit ? true : undefined,
      receipt_batch_id: batchNavState?.receiptBatchId,
      set_as_current_trip: batchNavState?.setAsCurrentTrip,
      ...overrides,
    };
  };

  const submit = async (force = false) => {
    if (!isValid) {
      toast.error(t('trips.form.validation.fillRequired'));
      return;
    }
    if (!capacityValid) {
      toast.error(
        t('trips.form.validation.capacityMismatch', {
          delta: formatNumber(capacityDelta, 1),
        }),
      );
      return;
    }

    try {
      const payload = buildPayload(
        force
          ? isEdit
            ? { force_update: true }
            : { force_create: true }
          : {},
      );

      if (isEdit && parentId != null) {
        await updateMutation.mutateAsync({ parentId, input: payload });
        toast.success(t('trips.form.updateSuccess'));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t('trips.form.createSuccess'));
      }

      setPendingDuplicate(null);
      navigate('/trips');
    } catch (err) {
      const dup = tripApi.parseDuplicateError(err);
      if (dup) {
        if (isEdit) {
          await submit(true);
          return;
        }
        setPendingDuplicate(dup);
        return;
      }
      toast.error(
        extractErrorMessage(
          err,
          isEdit ? t('trips.form.updateFailed') : t('trips.form.createFailed'),
        ),
      );
    }
  };

  /* ---- Loading state for edit hydration ------------------------------- */

  if (isEdit && loadingParent) {
    return <FormSkeleton />;
  }

  /* ---- Render --------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Receipt-batch banner */}
      {showBatchBanner && batchNavState?.receiptBatchId && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning">
              <ImageIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 text-sm">
              <p className="font-medium">{t('trips.form.batchBanner.title')}</p>
              <p className="text-xs text-muted-foreground">
                {t('trips.form.batchBanner.description', {
                  driver: batchNavState.driverName ?? '—',
                })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowBatchBanner(false)}
              aria-label={t('common.close')}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Trip-level fields */}
      <Card>
        <CardContent className="space-y-4 p-4 md:p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t('trips.form.section.tripDetails')}
          </h3>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Vehicle */}
            <div className="space-y-1">
              <Label htmlFor="trip-car">
                {t('trips.fields.vehicle')}
                <span className="text-destructive">*</span>
              </Label>
              {loadingCars ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <SearchableSelect
                  id="trip-car"
                  options={cars.map((c) => ({
                    value: c.ID,
                    label: c.car_no_plate,
                    description: [
                      c.car_type,
                      c.tank_capacity ? `${c.tank_capacity}L` : null,
                    ]
                      .filter(Boolean)
                      .join(' · '),
                  }))}
                  value={carId}
                  onChange={(v) => setCarId(Number(v))}
                  placeholder={t('trips.form.placeholder.selectCar')}
                />
              )}
            </div>

            {/* Driver */}
            <div className="space-y-1">
              <Label htmlFor="trip-driver">
                {t('trips.fields.driver')}
                <span className="text-destructive">*</span>
              </Label>
              {loadingDrivers ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <SearchableSelect
                  id="trip-driver"
                  options={[
                    {
                      value: UNREGISTERED_DRIVER_ID,
                      label: UNREGISTERED_DRIVER_NAME,
                      description: t('trips.form.driverUnregistered'),
                    },
                    ...drivers.map((d) => ({
                      value: d.ID,
                      label: d.name,
                      description: d.mobile_number ?? undefined,
                    })),
                  ]}
                  value={driverId}
                  onChange={(v) => setDriverId(Number(v))}
                  placeholder={t('trips.form.placeholder.selectDriver')}
                />
              )}
            </div>

            {/* Date */}
            <div className="space-y-1">
              <Label htmlFor="trip-date">
                {t('trips.fields.date')}
                <span className="text-destructive">*</span>
              </Label>
              <DatePicker
                id="trip-date"
                value={date}
                onChange={setDate}
                max={today()}
              />
            </div>

            {/* Company */}
            <div className="space-y-1">
              <Label htmlFor="trip-company">
                {t('trips.fields.company')}
                <span className="text-destructive">*</span>
              </Label>
              {loadingCompanies ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <SearchableSelect
                  id="trip-company"
                  options={companyList.map((c) => ({ value: c, label: c }))}
                  value={company}
                  onChange={setCompany}
                  placeholder={t('trips.form.placeholder.selectCompany')}
                />
              )}
            </div>

            {/* Terminal */}
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="trip-terminal">
                {t('trips.fields.terminal')}
                <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect
                id="trip-terminal"
                options={terminalList.map((tname) => ({ value: tname, label: tname }))}
                value={terminal}
                onChange={setTerminal}
                disabled={!company}
                placeholder={
                  company
                    ? t('trips.form.placeholder.selectTerminal')
                    : t('trips.form.placeholder.selectCompanyFirst')
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Containers */}
      <Card>
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t('trips.form.section.containers', {
                count: containers.length,
                max: MAX_CONTAINERS,
              })}
            </h3>
            <div className="flex items-center gap-2">
              {carCapacity > 0 && containers.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={splitEvenly}
                  className="gap-1.5"
                >
                  <SplitSquareHorizontal className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {t('trips.form.splitEvenly')}
                  </span>
                </Button>
              )}
              {containers.length < MAX_CONTAINERS && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addContainer}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {t('trips.form.addContainer')}
                  </span>
                </Button>
              )}
            </div>
          </div>

          {carCapacity > 0 && (
            <CapacityBanner
              carCapacity={carCapacity}
              total={totalContainerCapacity}
              delta={capacityDelta}
              valid={capacityValid}
            />
          )}

          {/* Container forms */}
          <div className="space-y-3">
            {containers.map((container, idx) => (
              <ContainerCard
                key={container.id ?? `new-${idx}`}
                idx={idx}
                container={container}
                canRemove={containers.length > 1}
                terminalChosen={!!terminal}
                receiptTooShort={
                  receiptTouched.has(idx) && !!receiptLengthErrors.get(idx)
                }
                duplicateWith={inFormDuplicates.get(idx) ?? null}
                onChange={(patch) => updateContainer(idx, patch)}
                onRemove={() => removeContainer(idx)}
                onPickDropOff={() => setPickingContainerIdx(idx)}
                onReceiptBlur={() => markReceiptTouched(idx)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Submit footer */}
      <div className="sticky bottom-4 flex flex-col-reverse gap-2 rounded-lg border bg-card p-3 shadow-md sm:flex-row sm:items-center sm:justify-end">
        <Button
          variant="outline"
          onClick={() => navigate('/trips')}
          disabled={isPending}
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={() => void submit(false)}
          disabled={!isValid || !capacityValid || isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isEdit ? t('trips.form.save') : t('trips.form.create')}
        </Button>
      </div>

      {/* Drop-off picker */}
      <DropOffPickerModal
        open={pickingContainerIdx !== null}
        onOpenChange={(open) => !open && setPickingContainerIdx(null)}
        company={company}
        terminal={terminal}
        value={
          pickingContainerIdx != null
            ? containers[pickingContainerIdx]?.drop_off_point ?? ''
            : ''
        }
        onSelect={(dropOff, mapping) => {
          if (pickingContainerIdx != null) {
            handleDropOffPicked(pickingContainerIdx, dropOff, mapping);
          }
        }}
        excludedDropOffs={containers
          .filter((_, i) => i !== pickingContainerIdx)
          .map((c) => c.drop_off_point)
          .filter(Boolean)}
      />

      {/* Duplicate detection */}
      <DuplicateComparisonDialog
        duplicate={pendingDuplicate}
        onOpenChange={(open) => !open && setPendingDuplicate(null)}
        onForceProceed={() => void submit(true)}
        forceLabel={
          isEdit
            ? t('trips.form.duplicate.forceUpdate')
            : t('trips.form.duplicate.forceCreate')
        }
        loading={isPending}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Capacity banner                                                             */
/* -------------------------------------------------------------------------- */

interface CapacityBannerProps {
  carCapacity: number;
  total: number;
  delta: number;
  valid: boolean;
}

function CapacityBanner({
  carCapacity,
  total,
  delta,
  valid,
}: CapacityBannerProps) {
  const { t } = useTranslation();

  if (total === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        {t('trips.form.capacity.hint', {
          capacity: formatNumber(carCapacity, 0),
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-md border px-3 py-2 text-xs',
        valid
          ? 'border-success/30 bg-success/5 text-success'
          : 'border-warning/30 bg-warning/5 text-warning',
      )}
    >
      {valid ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <div className="flex-1 space-y-0.5">
        <div className="font-medium">
          {valid
            ? t('trips.form.capacity.match')
            : t('trips.form.capacity.mismatch')}
        </div>
        <div className="text-foreground/80">
          <span className="tabular-nums">
            {formatNumber(total, 1)} L
          </span>{' '}
          / {formatNumber(carCapacity, 0)} L
          {!valid && (
            <span className="ms-2 tabular-nums">
              ({delta > 0 ? '+' : ''}
              {formatNumber(delta, 1)} L)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Container card                                                              */
/* -------------------------------------------------------------------------- */

interface ContainerCardProps {
  idx: number;
  container: ContainerForm;
  canRemove: boolean;
  terminalChosen: boolean;
  receiptTooShort: boolean;
  /** Other container indices (1-based when displayed) sharing this receipt */
  duplicateWith: number[] | null;
  onChange: (patch: Partial<ContainerForm>) => void;
  onRemove: () => void;
  onPickDropOff: () => void;
  onReceiptBlur: () => void;
}

function ContainerCard({
  idx,
  container,
  canRemove,
  terminalChosen,
  receiptTooShort,
  duplicateWith,
  onChange,
  onRemove,
  onPickDropOff,
  onReceiptBlur,
}: ContainerCardProps) {
  const { t } = useTranslation();
  const fee = container._fee ?? 0;
  const distance = container._distance ?? 0;
  const hasMapping = fee > 0 || distance > 0;

  // Parse + serialize gas types between the comma-separated string the
  // backend wants and the array our MultiSelect uses
  const gasValues = React.useMemo(
    () => parseGasTypes(container.gas_type),
    [container.gas_type],
  );

  const gasOptions = React.useMemo(
    () =>
      GAS_TYPE_VALUES.map((v) => ({
        value: v,
        label: t(`trips.form.gasType.options.${v}`),
      })),
    [t],
  );

  return (
    <div
      className={cn(
        'rounded-lg border bg-muted/20 p-3 md:p-4',
        receiptTooShort && 'border-destructive/40',
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
            {idx + 1}
          </div>
          <span className="text-sm font-medium">
            {t('trips.form.containerN', { n: idx + 1 })}
          </span>
        </div>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label={t('common.remove')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* In-form duplicate warning — soft (doesn't block submit) */}
      {duplicateWith && duplicateWith.length > 0 && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="flex-1">
            <div className="font-medium">
              {t('trips.form.validation.duplicateInForm.title')}
            </div>
            <div className="text-foreground/80">
              {t('trips.form.validation.duplicateInForm.description', {
                receipt: container.receipt_no.trim(),
                others: duplicateWith.map((i) => i + 1).join(', '),
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {/* Receipt no */}
        <div className="space-y-1">
          <Label htmlFor={`receipt-${idx}`} className="text-xs">
            {t('trips.fields.receiptNo')}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`receipt-${idx}`}
            value={container.receipt_no}
            onChange={(e) => onChange({ receipt_no: e.target.value })}
            onBlur={onReceiptBlur}
            placeholder="WT-12345"
            className={cn(
              'tabular-nums',
              receiptTooShort && 'border-destructive focus-visible:ring-destructive',
            )}
            aria-invalid={receiptTooShort || undefined}
            aria-describedby={
              receiptTooShort ? `receipt-${idx}-error` : undefined
            }
          />
          {receiptTooShort && (
            <p
              id={`receipt-${idx}-error`}
              className="text-[11px] font-medium text-destructive"
            >
              {t('trips.form.validation.receiptTooShort', {
                min: RECEIPT_MIN_LENGTH,
              })}
            </p>
          )}
        </div>

        {/* Tank capacity */}
        <div className="space-y-1">
          <Label htmlFor={`capacity-${idx}`} className="text-xs">
            {t('trips.fields.tankCapacity')}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`capacity-${idx}`}
            type="number"
            min={0}
            step={0.1}
            value={container.tank_capacity || ''}
            onChange={(e) =>
              onChange({ tank_capacity: Number(e.target.value) || 0 })
            }
            placeholder="0"
            className="tabular-nums"
          />
        </div>

        {/* Gas type — multi-select */}
        <div className="space-y-1">
          <Label htmlFor={`gas-${idx}`} className="text-xs">
            {t('trips.fields.gasType')}
          </Label>
          <MultiSelect
            id={`gas-${idx}`}
            options={gasOptions}
            value={gasValues}
            onChange={(next) =>
              onChange({ gas_type: serializeGasTypes(next as GasTypeValue[]) })
            }
            placeholder={t('trips.form.gasType.placeholder')}
            heading={t('trips.form.gasType.heading')}
            triggerHeight="md"
          />
        </div>

        {/* Drop-off picker */}
        <div className="space-y-1 md:col-span-2 lg:col-span-1">
          <Label className="text-xs">
            {t('trips.fields.dropOffPoint')}
            <span className="text-destructive">*</span>
          </Label>
          <Button
            type="button"
            variant="outline"
            onClick={onPickDropOff}
            disabled={!terminalChosen}
            className={cn(
              'w-full justify-start gap-2 font-normal',
              !container.drop_off_point && 'text-muted-foreground',
            )}
          >
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">
              {container.drop_off_point ||
                (terminalChosen
                  ? t('trips.form.placeholder.selectDropOff')
                  : t('trips.form.placeholder.selectTerminalFirst'))}
            </span>
          </Button>
        </div>
      </div>

      {/* Fee/distance preview */}
      {hasMapping && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-card px-3 py-2 text-xs">
          <span className="font-medium uppercase tracking-wider text-muted-foreground">
            {t('trips.form.routeMapping')}:
          </span>
          {distance > 0 && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              {formatNumber(distance, 1)} km
            </span>
          )}
          {fee > 0 && (
            <span className="inline-flex items-center gap-1 tabular-nums text-success">
              {formatCurrency(fee)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Loading skeleton                                                            */
/* -------------------------------------------------------------------------- */

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-4 md:p-6">
          <Skeleton className="h-3 w-32" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full md:col-span-2" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-4 md:p-6">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}