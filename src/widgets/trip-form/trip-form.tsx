import * as React from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from '@/shared/ui/toast';
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
import { Checkbox } from '@/shared/ui/checkbox';
import { SearchableSelect } from '@/shared/ui/searchable-select';
import { DatePicker } from '@/shared/ui/date-picker';
import { Skeleton } from '@/shared/ui/skeleton';
import { MultiSelect } from '@/shared/ui/multi-select';
import { gasColor } from '@/shared/ui/tanker-diagram';

import { useCars } from '@/entities/car/queries';
import { useDrivers } from '@/entities/driver/queries';
import {
  UNREGISTERED_DRIVER_ID,
  UNREGISTERED_DRIVER_NAME,
} from '@/entities/driver/schemas';
import { useCompanies } from '@/entities/mapping/queries';
import { useTerminals } from '@/entities/location/queries';
import type { Terminal } from '@/entities/location/schemas';
import { TerminalSelect } from '@/widgets/terminal-select';
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
  TripCompartment,
} from '@/entities/trip/schemas';
import type { ApproveBatchNavState } from '@/entities/receipt-batch/schemas';
import type { MappingDetail } from '@/entities/mapping/schemas';
import { extractErrorMessage } from '@/shared/api/errors';
import { today, formatNumber, formatCurrency } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { normalize } from '@/shared/lib/normalize';
import { useAuthStore } from '@/shared/auth/store';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';

import {
  DropOffPickerModal,
  DROP_OFF_UNREGISTERED,
} from './drop-off-picker-modal';
import { DuplicateComparisonDialog } from './duplicate-comparison-dialog';
import {
  CompartmentPlanner,
  emptyPlan,
  type CompartmentSlot,
} from './compartment-planner';

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
  const initialDriverNameRef = React.useRef<string | null>(null);
  const previousCarIdRef = React.useRef<number | null>(null);
  const [date, setDate] = React.useState<string>(today());
  const [searchParams] = useSearchParams();
  const paramCompany = searchParams.get('company');
  const paramTerminal = searchParams.get('terminal');

  const [company, setCompany] = React.useState<string>(paramCompany ?? '');
  // Terminals are picked-by-id entities now. `terminal` keeps the canonical
  // name (legacy payload field + drop-off mapping cascade); `terminalId` is
  // the id the backend actually stores.
  const [terminal, setTerminal] = React.useState<string>(paramTerminal ?? '');
  const [terminalId, setTerminalId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (paramCompany) setCompany(paramCompany);
    if (paramTerminal) setTerminal(paramTerminal);
  }, [paramCompany, paramTerminal]);

  const [containers, setContainers] = React.useState<ContainerForm[]>([
    emptyContainer(),
  ]);
  const [pickingContainerIdx, setPickingContainerIdx] =
    React.useState<number | null>(null);

  // The compartment plan: one slot per compartment the car is registered
  // with, saying which drop took it and what was in it. Empty for cars with
  // no registered layout — those keep the old typed-volume form.
  const [slots, setSlots] = React.useState<CompartmentSlot[]>([]);
  const [activeDrop, setActiveDrop] = React.useState(0);
  /** Stored plan waiting for the car's layout to load, on edit. */
  const hydratedPlanRef = React.useRef<
    ({ dropIndex: number } & TripCompartment)[] | null
  >(null);
  const planCarIdRef = React.useRef<number | null>(null);
  /**
   * Containers of a trip saved before compartment planning existed, waiting
   * to be fitted onto the car's layout once it loads. Such a trip has typed
   * litres and no compartments; opening it for edit must not present an
   * empty truck, so each container is laid onto the next run of compartments
   * whose registered volumes sum to exactly its litres. A container that
   * fits no such run is left unassigned and listed under the diagram — the
   * user resolves it, the form never guesses.
   */
  const legacyFitRef = React.useRef<Array<{ capacity: number; gasType: string }> | null>(null);

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
  const { data: terminalEntities = [] } = useTerminals(company, { enabled: !!company });
  const { data: parentData, isLoading: loadingParent } = useParentContainers(
    parentId ?? null,
    { enabled: isEdit },
  );

  const companyList = companiesResp?.data ?? [];

  const selectedTerminal = React.useMemo<Terminal | null>(
    () => terminalEntities.find((term) => term.ID === terminalId) ?? null,
    [terminalEntities, terminalId],
  );

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

  /**
   * The car's registered compartment layout. The API normalizes this into
   * `compartments`; `json_compartments` is the raw column, kept as a fallback
   * for any caller still reading an older response.
   */
  const carCompartments = React.useMemo<number[]>(() => {
    const raw = selectedCar?.compartments ?? selectedCar?.json_compartments;
    if (!Array.isArray(raw)) return [];
    return raw.filter((n): n is number => typeof n === 'number' && n > 0);
  }, [selectedCar]);

  /** Whether this truck is planned by compartment or by typed volume. */
  const compartmentMode = carCompartments.length > 0;

  /* ---- Hydrate from parent data when editing --------------------------- */

  const hydratedRef = React.useRef(false);
  React.useEffect(() => {
    if (!isEdit || !parentData || hydratedRef.current) return;
    hydratedRef.current = true;

    const parent = parentData.parent_trip;
    const fetchedContainers = parentData.containers;

    setCarId(parent.car_id ?? null);
    setDriverId(parent.driver_id ?? null);
    initialDriverNameRef.current = parent.driver_name || null;
    previousCarIdRef.current = parent.car_id ?? null;
    setDate(parent.date ?? today());
    setCompany(parent.company ?? '');
    setTerminal(parent.terminal ?? '');
    // Legacy parents without terminal_id resolve by name once the company's
    // terminal list loads (handled inside TerminalSelect).
    setTerminalId(parent.terminal_id ?? null);
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
    // Park the stored plan until the car's layout is available — the cars
    // query may not have resolved yet.
    const storedPlan = fetchedContainers.flatMap((c, dropIndex) =>
      (c.compartments ?? []).map((compartment) => ({ ...compartment, dropIndex })),
    );
    hydratedPlanRef.current = storedPlan.length > 0 ? storedPlan : null;
    legacyFitRef.current =
      storedPlan.length > 0
        ? null
        : fetchedContainers.map((c) => {
            const gases = parseGasTypes(c.gas_type);
            return { capacity: c.tank_capacity ?? 0, gasType: gases.length === 1 ? gases[0] : '' };
          });
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
    
    // Only auto-fill if the car was actually changed or if we are creating a new trip
    if (carId === previousCarIdRef.current) return;
    previousCarIdRef.current = carId;

    if (!selectedCar?.driver_id) return;
    setDriverId(selectedCar.driver_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carId, selectedCar?.driver_id, isEdit, hydratedRef.current]);

  /* ---- Reset terminal/dropoffs when company changes -------------------- */

  const lastCompanyRef = React.useRef(company);
  React.useEffect(() => {
    if (lastCompanyRef.current === company) return;
    if (lastCompanyRef.current !== '' && terminal !== paramTerminal) {
      setTerminal('');
      setTerminalId(null);
      setContainers((cs) =>
        cs.map((c) => ({ ...c, drop_off_point: '', _fee: 0, _distance: 0 })),
      );
    }
    lastCompanyRef.current = company;
  }, [company, terminal, paramTerminal]);

  const lastTerminalRef = React.useRef(terminal);
  React.useEffect(() => {
    if (lastTerminalRef.current === terminal) return;
    // Legacy free-text names auto-resolve to the canonical terminal name
    // (casing/diacritics may differ) — that's the same terminal, so keep the
    // containers' drop-offs.
    const sameTerminal = normalize(lastTerminalRef.current) === normalize(terminal);
    if (lastTerminalRef.current !== '' && !sameTerminal) {
      setContainers((cs) =>
        cs.map((c) => ({ ...c, drop_off_point: '', _fee: 0, _distance: 0 })),
      );
    }
    lastTerminalRef.current = terminal;
  }, [terminal]);

  /* ---- Compartment plan ------------------------------------------------ */

  // Rebuild the plan when the truck changes, and apply a stored plan the
  // moment the layout it refers to is known.
  React.useEffect(() => {
    if (!compartmentMode) {
      planCarIdRef.current = carId;
      setSlots((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    const pending = hydratedPlanRef.current;
    const legacy = legacyFitRef.current;
    if (planCarIdRef.current === carId && !pending && !legacy) return;
    planCarIdRef.current = carId;

    const next = emptyPlan(carCompartments);
    if (legacy) {
      let cursor = 0;
      for (let drop = 0; drop < legacy.length && cursor < next.length; drop++) {
        const { capacity, gasType } = legacy[drop];
        let sum = 0;
        let end = cursor;
        while (end < next.length && sum < capacity) sum += carCompartments[end++];
        // Only an exact run counts; after the first miss the rest is guesswork.
        if (sum !== capacity || capacity <= 0) break;
        for (let i = cursor; i < end; i++) next[i] = { dropIndex: drop, gasType, volume: carCompartments[i] };
        cursor = end;
      }
      legacyFitRef.current = null;
    }
    if (pending) {
      pending.forEach((compartment) => {
        if (compartment.index < 0 || compartment.index >= next.length) return;
        next[compartment.index] = {
          dropIndex: compartment.dropIndex,
          gasType: compartment.gas_type ?? '',
          volume: compartment.volume || carCompartments[compartment.index],
        };
      });
      hydratedPlanRef.current = null;
    }
    setSlots(next);
    setActiveDrop(0);
  }, [compartmentMode, carCompartments, carId]);

  /** The compartments each drop took, in payload shape. */
  const containerPlans = React.useMemo<TripCompartment[][]>(
    () =>
      containers.map((_, dropIndex) =>
        slots.flatMap((slot, index) =>
          slot.dropIndex === dropIndex
            ? [{ index, volume: slot.volume, gas_type: slot.gasType }]
            : [],
        ),
      ),
    [containers, slots],
  );

  // tank_capacity and gas_type stop being typed and start being read off the
  // plan. The backend derives them the same way and rejects a payload where
  // the two disagree, so they must be computed, never edited, in this mode.
  const derivedCapacities = React.useMemo(
    () => containerPlans.map((plan) => plan.reduce((sum, c) => sum + c.volume, 0)),
    [containerPlans],
  );
  const derivedGasTypes = React.useMemo(
    () =>
      containerPlans.map((plan) =>
        serializeGasTypes(
          Array.from(new Set(plan.map((c) => c.gas_type).filter(Boolean))) as GasTypeValue[],
        ),
      ),
    [containerPlans],
  );

  const derivedKey = `${derivedCapacities.join(',')}|${derivedGasTypes.join(',')}`;
  React.useEffect(() => {
    if (!compartmentMode) return;
    setContainers((cs) => {
      let changed = false;
      const next = cs.map((c, i) => {
        const capacity = derivedCapacities[i] ?? 0;
        const gasType = derivedGasTypes[i] ?? '';
        if (c.tank_capacity === capacity && c.gas_type === gasType) return c;
        changed = true;
        return { ...c, tank_capacity: capacity, gas_type: gasType };
      });
      return changed ? next : cs;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compartmentMode, derivedKey]);

  const unassignedCompartments = compartmentMode
    ? slots.filter((slot) => slot.dropIndex === null).length
    : 0;
  const overriddenVolumes = compartmentMode
    ? slots.filter((slot, i) => slot.volume !== (carCompartments[i] ?? slot.volume)).length
    : 0;
  const missingProducts = compartmentMode
    ? slots.filter((slot) => slot.dropIndex !== null && !slot.gasType).length
    : 0;

  /* ---- Capacity validator ---------------------------------------------- */

  const carCapacity = selectedCar?.tank_capacity ?? 0;
  const totalContainerCapacity = containers.reduce(
    (sum, c) => sum + (c.tank_capacity || 0),
    0,
  );
  const capacityDelta = totalContainerCapacity - carCapacity;
  // With a plan, "valid" means every compartment is spoken for, carries a
  // product, and none was re-measured — not that four typed numbers happen
  // to add up. Below permission 4 this is the whole gate: the trip is either
  // exactly the truck as registered, or it does not save.
  const capacityValid = compartmentMode
    ? unassignedCompartments === 0 && overriddenVolumes === 0 && missingProducts === 0
    : carCapacity === 0 || Math.abs(capacityDelta) <= CAPACITY_TOLERANCE;

  // Level-4 admins may save a trip whose container capacities don't sum to
  // the truck's registered capacity — after confirming a warning dialog.
  // The backend enforces the same rule, so this is UX, not the security gate.
  const permission = useAuthStore((s) => s.user?.permission ?? 0);
  const canOverrideCapacity = permission >= 4;
  const capacityBlocked = !capacityValid && !canOverrideCapacity;

  const [capacityConfirmOpen, setCapacityConfirmOpen] = React.useState(false);
  // Ref (not state) so submit() sees the acceptance synchronously when
  // re-invoked from the dialog's onConfirm.
  const capacityAcceptedRef = React.useRef(false);
  React.useEffect(() => {
    capacityAcceptedRef.current = false;
  }, [capacityDelta, selectedCar?.ID, unassignedCompartments, overriddenVolumes]);

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

  /* -------------------------------------------------------------------------- */
  /* Receipt serialization — per-(terminal,company) regex, soft-blocking        */
  /* -------------------------------------------------------------------------- */

  /**
   * The selected terminal's active receipt pattern (already company-resolved
   * by `GET /api/terminals?company=X`). Compiled client-side; a pattern that
   * doesn't compile is treated as "no pattern" rather than blocking entry.
   */
  const receiptPattern = React.useMemo(() => {
    const rp = selectedTerminal?.receipt_pattern;
    if (!rp || !rp.active || !rp.pattern) return null;
    try {
      // Compile once to validate; `.test` below uses fresh instances so a
      // global flag can't leak `lastIndex` state between containers.
      void new RegExp(rp.pattern);
      return { pattern: rp.pattern, hint: rp.description || rp.pattern };
    } catch {
      return null;
    }
  }, [selectedTerminal]);

  /** Container indices whose non-empty receipt fails the terminal's pattern. */
  const receiptPatternMismatches = React.useMemo(() => {
    const mismatches = new Set<number>();
    if (!receiptPattern) return mismatches;
    containers.forEach((c, idx) => {
      const v = c.receipt_no.trim();
      if (v.length === 0) return;
      if (!new RegExp(receiptPattern.pattern).test(v)) mismatches.add(idx);
    });
    return mismatches;
  }, [containers, receiptPattern]);

  // "Save anyway (override)" acknowledgements, per container. Reset when the
  // terminal changes — a mismatch against one terminal says nothing about
  // another's serialization.
  const [overriddenReceipts, setOverriddenReceipts] = React.useState<Set<number>>(
    () => new Set(),
  );
  React.useEffect(() => {
    setOverriddenReceipts(new Set());
  }, [terminalId]);

  const toggleReceiptOverride = (idx: number) => {
    setOverriddenReceipts((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  /** True while any mismatching receipt hasn't been explicitly overridden. */
  const receiptPatternBlocked = React.useMemo(
    () => [...receiptPatternMismatches].some((idx) => !overriddenReceipts.has(idx)),
    [receiptPatternMismatches, overriddenReceipts],
  );

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

  /** Returns the new container's index, so the planner can assign to it. */
  const addContainer = () => {
    if (containers.length >= MAX_CONTAINERS) return containers.length - 1;
    setContainers((cs) => [...cs, emptyContainer()]);
    return containers.length;
  };

  const removeContainer = (idx: number) => {
    if (containers.length <= 1) return;
    setContainers((cs) => cs.filter((_, i) => i !== idx));
    // The plan is keyed by drop index too: release this drop's compartments
    // and pull the later drops down to match the new numbering.
    setSlots((prev) =>
      prev.map((slot) => {
        if (slot.dropIndex === null) return slot;
        if (slot.dropIndex === idx) return { ...slot, dropIndex: null };
        if (slot.dropIndex > idx) return { ...slot, dropIndex: slot.dropIndex - 1 };
        return slot;
      }),
    );
    setActiveDrop((current) => {
      if (current === idx) return Math.max(0, idx - 1);
      return current > idx ? current - 1 : current;
    });
    // Clean up index-keyed state when removing — re-index remaining entries
    const reindex = (prev: Set<number>) => {
      const next = new Set<number>();
      prev.forEach((i) => {
        if (i < idx) next.add(i);
        else if (i > idx) next.add(i - 1);
      });
      return next;
    };
    setReceiptTouched(reindex);
    setOverriddenReceipts(reindex);
  };

  const splitEvenly = () => {
    if (carCapacity <= 0 || containers.length === 0) return;
    const each = Math.round((carCapacity / containers.length) * 100) / 100;
    setContainers((cs) => cs.map((c) => ({ ...c, tank_capacity: each })));
  };

  /* ---- Compartment plan handlers --------------------------------------- */

  const assignCompartment = (index: number, dropIndex: number | null) => {
    setSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, dropIndex } : slot)),
    );
  };

  const setCompartmentGas = (index: number, gasType: string) => {
    setSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, gasType } : slot)),
    );
  };

  const setCompartmentVolume = (index: number, volume: number) => {
    setSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, volume } : slot)),
    );
  };

  const clearPlan = () => {
    setSlots((prev) => prev.map((slot) => ({ ...slot, dropIndex: null })));
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
  // A container nobody touched — no receipt, no drop-off, no compartments —
  // is scaffolding, not a drop. The plan starts with one and the diagram
  // makes more as you go, so they are ignored rather than demanded.
  const isBlankContainer = React.useCallback(
    (c: ContainerForm, idx: number) =>
      compartmentMode &&
      !c.receipt_no.trim() &&
      !c.drop_off_point &&
      (containerPlans[idx] ?? []).length === 0,
    [compartmentMode, containerPlans],
  );
  const liveContainers = React.useMemo(
    () => containers.filter((c, idx) => !isBlankContainer(c, idx)),
    [containers, isBlankContainer],
  );

  const isValid = React.useMemo(() => {
    if (!selectedCar) return false;
    if (!driverId) return false;
    if (!company || !terminal || terminalId == null) return false;
    if (!date) return false;
    if (liveContainers.length === 0 || liveContainers.length > MAX_CONTAINERS) return false;
    return liveContainers.every(
      (c) =>
        c.receipt_no.trim().length >= RECEIPT_MIN_LENGTH &&
        !!c.drop_off_point &&
        c.tank_capacity > 0,
    );
  }, [selectedCar, driverId, company, terminal, terminalId, date, liveContainers]);

  /* ---- Submit ---------------------------------------------------------- */

  const buildPayload = (
    overrides: Partial<MultiContainerTripInput> = {},
  ): MultiContainerTripInput => {
    if (!selectedCar) throw new Error('No car selected');
    const driverName =
      selectedDriver?.name ??
      (driverId === (parentData?.parent_trip.driver_id ?? null)
        ? parentData?.parent_trip.driver_name ?? ''
        : driverId === UNREGISTERED_DRIVER_ID
          ? UNREGISTERED_DRIVER_NAME
          : '');
    // receipt_override travels per container: true only for receipts that
    // fail the terminal's serialization AND were explicitly acknowledged
    // (submit is blocked otherwise). Valid receipts always send false.
    const anyOverride = [...receiptPatternMismatches].some((idx) =>
      overriddenReceipts.has(idx),
    );
    return {
      parent_trip: {
        car_id: selectedCar.ID,
        driver_id: driverId ?? 0,
        car_no_plate: selectedCar.car_no_plate,
        driver_name: driverName,
        transporter: 'Apex',
        company,
        // Legacy string keeps the canonical name so nothing else breaks;
        // terminal_id is what the backend stores now.
        terminal,
        ...(terminalId != null ? { terminal_id: terminalId } : {}),
        receipt_override: anyOverride,
        date,
      },
      containers: containers.flatMap((c, idx) => isBlankContainer(c, idx) ? [] : [{
        ...(c.id ? { id: c.id } : {}),
        receipt_no: c.receipt_no.trim(),
        receipt_override: receiptPatternMismatches.has(idx),
        drop_off_point: c.drop_off_point,
        // Derived from the plan when there is one. The backend recomputes both
        // from `compartments` and rejects the payload if they disagree, so
        // these travel as a cross-check, not as the source of truth.
        tank_capacity: compartmentMode
          ? derivedCapacities[idx] ?? 0
          : c.tank_capacity,
        gas_type: compartmentMode ? derivedGasTypes[idx] ?? '' : c.gas_type ?? '',
        ...(compartmentMode ? { compartments: containerPlans[idx] ?? [] } : {}),
        // Propagate parent-level fields so the backend doesn't need to infer
        // them — critical for updates where the user changed company/terminal.
        car_id: selectedCar.ID,
        driver_id: driverId ?? 0,
        car_no_plate: selectedCar.car_no_plate,
        driver_name: driverName,
        transporter: 'Apex',
        company,
        terminal,
        ...(terminalId != null ? { terminal_id: terminalId } : {}),
        date,
      }]),
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
    if (receiptPatternBlocked) {
      toast.error(t('trips.form.receiptPattern.blocked'));
      return;
    }
    if (!capacityValid) {
      if (!canOverrideCapacity) {
        toast.error(
          compartmentMode
            ? t('trips.form.validation.compartmentsUnassigned', {
                count: unassignedCompartments,
              })
            : t('trips.form.validation.capacityMismatch', {
                delta: formatNumber(capacityDelta, 1),
              }),
        );
        return;
      }
      if (!capacityAcceptedRef.current) {
        setCapacityConfirmOpen(true);
        return;
      }
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
    <div className="space-y-3">
      {/* Receipt-batch banner */}
      {showBatchBanner && batchNavState?.receiptBatchId && (
        <Card className="border-warning/40 bg-warning/10">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
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
              <X />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Trip-level fields */}
      <Card>
        <CardContent className="space-y-4 p-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                <Skeleton className="h-9 w-full" />
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
                <Skeleton className="h-9 w-full" />
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
                <Skeleton className="h-9 w-full" />
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

            {/* Terminal — picked-by-id, filtered to the company's allowlist */}
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="trip-terminal">
                {t('trips.fields.terminal')}
                <span className="text-destructive">*</span>
              </Label>
              <TerminalSelect
                id="trip-terminal"
                company={company}
                terminalId={terminalId}
                terminalName={terminal}
                onSelect={(term) => {
                  setTerminalId(term.ID);
                  setTerminal(term.name);
                }}
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
        <CardContent className="space-y-4 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('trips.form.section.containers', {
                count: containers.length,
                max: MAX_CONTAINERS,
              })}
            </h3>
            <div className="flex items-center gap-2">
              {!compartmentMode && carCapacity > 0 && containers.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={splitEvenly}
                  className="gap-1.5"
                >
                  <SplitSquareHorizontal />
                  <span className="hidden sm:inline">
                    {t('trips.form.splitEvenly')}
                  </span>
                </Button>
              )}
              {!compartmentMode && containers.length < MAX_CONTAINERS && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addContainer}
                  className="gap-1.5"
                >
                  <Plus />
                  <span className="hidden sm:inline">
                    {t('trips.form.addContainer')}
                  </span>
                </Button>
              )}
            </div>
          </div>

          {compartmentMode && (
            <CompartmentPlanner
              layout={carCompartments}
              slots={slots}
              plate={selectedCar?.car_no_plate}
              containers={containers.map((c, idx) => {
                const mismatch =
                  receiptPatternMismatches.has(idx) && receiptPattern
                    ? {
                        severity: 'warning' as const,
                        title: t('trips.form.receiptPattern.mismatchTitle'),
                        description: t('trips.form.receiptPattern.mismatch', {
                          terminal: selectedTerminal?.name ?? terminal,
                          hint: receiptPattern.hint,
                        }),
                        override: {
                          checked: overriddenReceipts.has(idx),
                          label: t('trips.form.receiptPattern.override'),
                          onToggle: () => toggleReceiptOverride(idx),
                        },
                      }
                    : null;
                const dup = inFormDuplicates.get(idx);
                const duplicate =
                  dup && dup.length > 0
                    ? {
                        severity: 'warning' as const,
                        title: t('trips.form.validation.duplicateInForm.title'),
                        description: t('trips.form.validation.duplicateInForm.description', {
                          receipt: c.receipt_no.trim(),
                          others: dup.map((i) => i + 1).join(', '),
                        }),
                      }
                    : null;
                const tooShort =
                  receiptTouched.has(idx) && receiptLengthErrors.get(idx)
                    ? {
                        severity: 'error' as const,
                        title: t('trips.fields.receiptNo'),
                        description: t('trips.form.validation.receiptTooShort', {
                          min: RECEIPT_MIN_LENGTH,
                        }),
                      }
                    : null;
                return {
                  receipt: c.receipt_no,
                  dropOff: c.drop_off_point,
                  fee: c._fee ?? 0,
                  distance: c._distance ?? 0,
                  issue: tooShort ?? mismatch ?? duplicate,
                };
              })}
              maxContainers={MAX_CONTAINERS}
              activeDrop={Math.min(activeDrop, containers.length - 1)}
              onAssign={assignCompartment}
              onGasChange={setCompartmentGas}
              onVolumeChange={setCompartmentVolume}
              onAddContainer={addContainer}
              onRemoveContainer={removeContainer}
              onReceiptChange={(idx, receipt_no) => updateContainer(idx, { receipt_no })}
              onReceiptBlur={markReceiptTouched}
              company={company}
              terminal={terminal}
              onDropOffPicked={handleDropOffPicked}
              onClear={clearPlan}
              canOverride={canOverrideCapacity}
              missingProducts={missingProducts}
            />
          )}

          {carCapacity > 0 && (
            <CapacityBanner
              carCapacity={carCapacity}
              total={totalContainerCapacity}
              delta={capacityDelta}
              valid={capacityValid}
              adminOverride={canOverrideCapacity}
              unassignedCompartments={compartmentMode ? unassignedCompartments : null}
              overriddenVolumes={overriddenVolumes}
              missingProducts={missingProducts}
            />
          )}

          {/* Container forms. With a compartment layout they live inside the
              diagram's popovers instead. */}
          {!compartmentMode && (
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
                patternMismatch={
                  receiptPatternMismatches.has(idx) && receiptPattern
                    ? {
                        terminalName: selectedTerminal?.name ?? terminal,
                        hint: receiptPattern.hint,
                      }
                    : null
                }
                compartmentSummary={
                  compartmentMode
                    ? {
                        compartments: containerPlans[idx] ?? [],
                        volume: derivedCapacities[idx] ?? 0,
                        active: Math.min(activeDrop, containers.length - 1) === idx,
                        onFocusDrop: () => setActiveDrop(idx),
                      }
                    : null
                }
                overridden={overriddenReceipts.has(idx)}
                onToggleOverride={() => toggleReceiptOverride(idx)}
                onChange={(patch) => updateContainer(idx, patch)}
                onRemove={() => removeContainer(idx)}
                onPickDropOff={() => setPickingContainerIdx(idx)}
                onReceiptBlur={() => markReceiptTouched(idx)}
              />
            ))}
          </div>
          )}
        </CardContent>
      </Card>

      {/* Submit footer */}
      <div className="sticky bottom-4 flex flex-col-reverse gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          variant="outline"
          onClick={() => navigate('/trips')}
          disabled={isPending}
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={() => void submit(false)}
          disabled={!isValid || capacityBlocked || receiptPatternBlocked || isPending}
        >
          {isPending ? (
            <Loader2 className="animate-spin motion-reduce:animate-none" />
          ) : (
            <Save />
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

      {/* Capacity-mismatch admin override */}
      <ConfirmDialog
        open={capacityConfirmOpen}
        onOpenChange={setCapacityConfirmOpen}
        variant="default"
        lottieSrc="/animations/warning.lottie"
        title={t('trips.form.capacity.overrideTitle')}
        description={
          compartmentMode
            ? t('trips.form.capacity.overrideCompartmentBody', {
                unassigned: unassignedCompartments,
                overridden: overriddenVolumes,
              })
            : t('trips.form.capacity.overrideBody', {
                total: formatNumber(totalContainerCapacity, 1),
                capacity: formatNumber(carCapacity, 0),
                delta: formatNumber(capacityDelta, 1),
              })
        }
        confirmLabel={t('trips.form.capacity.overrideConfirm')}
        loading={isPending}
        onConfirm={() => {
          capacityAcceptedRef.current = true;
          setCapacityConfirmOpen(false);
          void submit(false);
        }}
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
  adminOverride: boolean;
  /** Null when the truck has no registered compartment layout. */
  unassignedCompartments: number | null;
  overriddenVolumes: number;
  missingProducts: number;
}

function CapacityBanner({
  carCapacity,
  total,
  delta,
  valid,
  adminOverride,
  unassignedCompartments,
  overriddenVolumes,
  missingProducts,
}: CapacityBannerProps) {
  const { t } = useTranslation();

  // With a plan, the number that matters is how many compartments are still
  // unspoken for — a litre delta is arithmetic the user no longer does.
  if (unassignedCompartments !== null) {
    const clean =
      unassignedCompartments === 0 && overriddenVolumes === 0 && missingProducts === 0;
    return (
      <div
        className={cn(
          'flex items-start gap-2 rounded-lg border border-dashed px-3 py-2.5 text-[12.5px]',
          clean
            ? 'border-success/40 bg-success/10 text-success'
            : 'border-warning/40 bg-warning/10 text-warning',
        )}
      >
        {clean ? (
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        ) : (
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        )}
        <div className="flex-1 space-y-0.5">
          <div className="font-medium">
            {clean
              ? t('trips.form.compartments.allAssigned')
              : unassignedCompartments > 0
                ? t('trips.form.compartments.unassignedCount', {
                    count: unassignedCompartments,
                  })
                : missingProducts > 0
                  ? t('trips.form.compartments.missingProducts', { count: missingProducts })
                  : t('trips.form.compartments.volumeOverridden', {
                      count: overriddenVolumes,
                    })}
          </div>
          <div className="text-muted-foreground">
            <span className="font-mono tabular-nums">
              {formatNumber(total, 0)} L
            </span>{' '}
            / {formatNumber(carCapacity, 0)} L
            {!clean && !adminOverride && (
              <span className="ms-2">{t('trips.form.compartments.blocked')}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        {t('trips.form.capacity.hint', {
          capacity: formatNumber(carCapacity, 0),
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border border-dashed px-3 py-2.5 text-[12.5px]',
        valid
          ? 'border-success/40 bg-success/10 text-success'
          : 'border-warning/40 bg-warning/10 text-warning',
      )}
    >
      {valid ? (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      )}
      <div className="flex-1 space-y-0.5">
        <div className="font-medium">
          {valid
            ? t('trips.form.capacity.match')
            : adminOverride
              ? t('trips.form.capacity.overrideWarning')
              : t('trips.form.capacity.mismatch')}
        </div>
        <div className="text-muted-foreground">
          <span className="font-mono tabular-nums">
            {formatNumber(total, 1)} L
          </span>{' '}
          / {formatNumber(carCapacity, 0)} L
          {!valid && (
            <span className="ms-2 font-mono tabular-nums">
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
  /** Set when the receipt fails the selected terminal's serialization. */
  patternMismatch: { terminalName: string; hint: string } | null;
  /**
   * The compartments this drop took, when the truck has a registered layout.
   * Null keeps the older typed-volume fields.
   */
  compartmentSummary: {
    compartments: TripCompartment[];
    volume: number;
    active: boolean;
    onFocusDrop: () => void;
  } | null;
  /** "Save anyway (override)" acknowledged for this container. */
  overridden: boolean;
  onToggleOverride: () => void;
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
  patternMismatch,
  compartmentSummary,
  overridden,
  onToggleOverride,
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
        'rounded-lg border bg-muted/40 p-3',
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
            <Trash2 />
          </Button>
        )}
      </div>

      {/* Receipt-serialization warning — amber, submit requires the override
          checkbox to be ticked (sets receipt_override=true in the payload) */}
      {patternMismatch && (
        <div className="mb-3 space-y-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]">
          <div className="flex items-start gap-2 text-warning">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div className="flex-1">
              <div className="font-medium">
                {t('trips.form.receiptPattern.mismatchTitle')}
              </div>
              <div className="text-muted-foreground" dir="auto">
                {t('trips.form.receiptPattern.mismatch', {
                  terminal: patternMismatch.terminalName,
                  hint: patternMismatch.hint,
                })}
              </div>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 ps-5 font-medium text-foreground">
            <Checkbox
              checked={overridden}
              onCheckedChange={() => onToggleOverride()}
              aria-label={t('trips.form.receiptPattern.override')}
            />
            {t('trips.form.receiptPattern.override')}
          </label>
        </div>
      )}

      {/* In-form duplicate warning — soft (doesn't block submit) */}
      {duplicateWith && duplicateWith.length > 0 && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px] text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="flex-1">
            <div className="font-medium">
              {t('trips.form.validation.duplicateInForm.title')}
            </div>
            <div className="text-muted-foreground">
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

        {/* Load. Read-only once the truck has a compartment layout: the
            figures come off the plan, and letting them be typed here would
            just be a second, contradictory answer. */}
        {compartmentSummary ? (
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">{t('trips.fields.tankCapacity')}</Label>
            <button
              type="button"
              onClick={compartmentSummary.onFocusDrop}
              className={cn(
                'flex h-10 w-full items-center gap-2 rounded-md border bg-card px-3 text-start transition-colors',
                compartmentSummary.active
                  ? 'border-primary/50 ring-1 ring-primary/30'
                  : 'hover:bg-muted/60',
              )}
            >
              <span className="font-mono text-sm font-semibold tabular-nums">
                {formatNumber(compartmentSummary.volume, 0)} L
              </span>
              {compartmentSummary.compartments.length > 0 ? (
                <span className="flex flex-wrap items-center gap-1">
                  {compartmentSummary.compartments.map((compartment) => (
                    <span
                      key={compartment.index}
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]"
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: gasColor(compartment.gas_type) }}
                        aria-hidden
                      />
                      {t('trips.form.compartments.nth', {
                        n: compartment.index + 1,
                      })}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {t('trips.form.compartments.noneAssigned')}
                </span>
              )}
            </button>
          </div>
        ) : (
          <>
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
          </>
        )}

        {/* Drop-off picker */}
        <div className="space-y-1 md:col-span-2 lg:col-span-1">
          <Label htmlFor={`dropoff-${idx}`} className="text-xs">
            {t('trips.fields.dropOffPoint')}
            <span className="text-destructive">*</span>
          </Label>
          <Button
            id={`dropoff-${idx}`}
            type="button"
            variant="outline"
            onClick={onPickDropOff}
            disabled={!terminalChosen}
            className={cn(
              'w-full justify-start gap-2 font-normal',
              !container.drop_off_point && 'text-muted-foreground',
            )}
          >
            <MapPin />
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
            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              {formatNumber(distance, 1)} km
            </span>
          )}
          {fee > 0 && (
            <span className="inline-flex items-center gap-1 font-mono tabular-nums text-money">
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
    <div className="space-y-3">
      <Card>
        <CardContent className="space-y-4 p-3">
          <Skeleton className="h-3 w-32" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full md:col-span-2" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}