import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, MapPin, Plus, RotateCcw, Trash2 } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Chip, ChipGroup } from '@/shared/ui/chip-group';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { dropColor, gasColor } from '@/shared/ui/tanker-diagram/palette';
import { cn } from '@/shared/lib/cn';
import { formatNumber } from '@/shared/lib/format';
import type { MappingDetail } from '@/entities/mapping/schemas';

import { DropOffPickerModal } from './drop-off-picker-modal';

// three.js is the bulk of this route's chunk and only a truck with a
// registered layout needs it, so it arrives on its own.
const TankerDiagram = React.lazy(() =>
  import('@/shared/ui/tanker-diagram').then((m) => ({ default: m.TankerDiagram })),
);

/* -------------------------------------------------------------------------- */
/* Compartment planner                                                        */
/*                                                                            */
/* The volume half of the trip form, replacing four free-text litre boxes.    */
/* The truck's compartments are fixed and the drops divide them up, so the    */
/* control is an assignment, not a measurement: tap a drop, tap the           */
/* compartments it took. The arithmetic that used to be the user's problem —  */
/* making four typed numbers add up to the tank capacity exactly — stops      */
/* existing, because whole compartments always do.                            */
/*                                                                            */
/* The diagram is the whole form. Tap a compartment and its popover IS the    */
/* container form: pick one of the containers already started or start a new */
/* one, then its receipt number, drop-off and product, right there. The next */
/* compartment you tap offers the same containers, so a receipt that takes   */
/* three compartments is three taps and one form. A drag along the barrel   */
/* does the same without the taps. Container cards under the picture and a  */
/* row of "assign to" chips above it were the first version; they showed     */
/* every assignment a second time and made the form twice as long as the    */
/* picture that already said it.                                             */
/*                                                                            */
/* The form always starts with one blank container, but a blank is not a     */
/* choice anyone makes, so blanks never appear as chips: tapping an empty    */
/* compartment drops it straight into a fresh container's form, and "New     */
/* container" reuses a blank before adding another. The drop-off picker is  */
/* rendered here rather than in the trip form so the popover can step aside */
/* while the picker is up and come back to the same compartment after.      */
/* -------------------------------------------------------------------------- */

/** One compartment's planned state, indexed alongside the car's layout. */
export interface CompartmentSlot {
  /** Which drop took it, `null` while unassigned. */
  dropIndex: number | null;
  /** Product loaded. `''` until chosen. */
  gasType: string;
  /** Litres taken. Equals the car's registered figure unless overridden. */
  volume: number;
}

export const GAS_TYPE_VALUES = ['80', '92', '95', 'diesel'] as const;
export type GasTypeValue = (typeof GAS_TYPE_VALUES)[number];

/** Build a fresh plan for a car's layout, everything unassigned. */
export function emptyPlan(layout: number[]): CompartmentSlot[] {
  return layout.map((volume) => ({ dropIndex: null, gasType: '', volume }));
}

export interface PlannerContainer {
  receipt: string;
  dropOff: string;
  fee: number;
  distance: number;
  /** Rendered validation for this container, if any. */
  issue: {
    severity: 'error' | 'warning';
    title: string;
    description: string;
    /** "Save anyway" acknowledgement, for a serialization mismatch. */
    override?: { checked: boolean; label: string; onToggle: () => void };
  } | null;
}

export interface CompartmentPlannerProps {
  /** The car's registered compartment volumes, in order. */
  layout: number[];
  slots: CompartmentSlot[];
  plate?: string;
  containers: ReadonlyArray<PlannerContainer>;
  maxContainers: number;
  /** Which container a drag from an empty compartment extends. */
  activeDrop: number;
  onAssign: (compartmentIndex: number, dropIndex: number | null) => void;
  onGasChange: (compartmentIndex: number, gasType: string) => void;
  onVolumeChange: (compartmentIndex: number, volume: number) => void;
  /** Starts a container and returns its index. */
  onAddContainer: () => number;
  onRemoveContainer: (dropIndex: number) => void;
  onReceiptChange: (dropIndex: number, receipt: string) => void;
  onReceiptBlur: (dropIndex: number) => void;
  /** Route context for the drop-off picker; the picker is disabled until both are set. */
  company: string;
  terminal: string;
  onDropOffPicked: (dropIndex: number, dropOff: string, mapping?: MappingDetail) => void;
  onClear: () => void;
  /** Permission >= 4. Reveals the per-compartment volume field. */
  canOverride: boolean;
  /** Assigned compartments still without a product. */
  missingProducts: number;
}

export function CompartmentPlanner({
  layout,
  slots,
  plate,
  containers,
  maxContainers,
  activeDrop,
  onAssign,
  onGasChange,
  onVolumeChange,
  onAddContainer,
  onRemoveContainer,
  onReceiptChange,
  onReceiptBlur,
  company,
  terminal,
  onDropOffPicked,
  onClear,
  canOverride,
  missingProducts,
}: CompartmentPlannerProps) {
  const { t } = useTranslation();

  const assignedCount = slots.filter((s) => s.dropIndex !== null).length;
  const unassigned = slots.length - assignedCount;

  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
  const [picking, setPicking] = React.useState<number | null>(null);
  const canPickDropOff = Boolean(company.trim() && terminal.trim());

  const isBlank = React.useCallback(
    (d: number) =>
      !containers[d]?.receipt.trim() &&
      !containers[d]?.dropOff.trim() &&
      !slots.some((s) => s.dropIndex === d),
    [containers, slots],
  );
  const firstBlank = containers.findIndex((_, d) => isBlank(d));
  const canAdd = firstBlank >= 0 || containers.length < maxContainers;

  /** A container nobody has filled yet: a blank if there is one, else new. */
  const freshContainer = React.useCallback(
    () => (firstBlank >= 0 ? firstBlank : onAddContainer()),
    [firstBlank, onAddContainer],
  );

  // Opening an unassigned compartment starts a container for it, so the form
  // the user asked for is already there when the popover lands. Closing
  // sweeps up any blank the switch to another container left behind — the
  // trip form ignores blanks, but a phantom chip would still confuse.
  const handleOpenChange = (index: number | null) => {
    setOpenIndex(index);
    if (index !== null && slots[index]?.dropIndex === null && canAdd) {
      onAssign(index, freshContainer());
    }
    if (index === null && containers.length > 1) {
      const blank = containers.findIndex((_, d) => isBlank(d));
      if (blank >= 0) onRemoveContainer(blank);
    }
  };

  // What still stands between the plan and a save, per container, in the
  // words of the popover that fixes it. Tapping one opens that popover.
  const containerIssues = containers.flatMap((c, d) => {
    if (isBlank(d)) return [];
    const first = slots.findIndex((s) => s.dropIndex === d);
    const problems = [
      first < 0 ? t('trips.form.compartments.noCompartments') : null,
      c.receipt.trim().length < 4 ? t('trips.form.compartments.needsReceipt') : null,
      !c.dropOff.trim() ? t('trips.form.compartments.needsDropOff') : null,
    ].filter((m): m is string => m !== null);
    return problems.length === 0 ? [] : [{ d, first, problems }];
  });

  const diagramCompartments = React.useMemo(
    () =>
      slots.map((slot, index) => ({
        volume: slot.volume,
        nominal: layout[index] ?? slot.volume,
        gasType: slot.gasType,
        dropIndex: slot.dropIndex,
      })),
    [slots, layout],
  );

  const dropLabels = React.useMemo(
    () => Array.from({ length: containers.length }, (_, i) => String(i + 1)),
    [containers.length],
  );

  const drops = React.useMemo(
    () =>
      containers.map((c) => ({
        receipt: c.receipt || undefined,
        dropOff: c.dropOff || undefined,
      })),
    [containers],
  );

  // A drag from an empty compartment needs a container to extend. The
  // focused one if it has nothing yet, else the first with nothing, else a
  // new one — the drag is how a fresh receipt is started without a tap.
  const resolveDragDrop = React.useCallback(
    (index: number) => {
      const own = slots[index]?.dropIndex;
      if (own != null) return own;
      const taken = new Set(slots.map((s) => s.dropIndex));
      if (!taken.has(activeDrop) && activeDrop < containers.length) return activeDrop;
      for (let d = 0; d < containers.length; d++) if (!taken.has(d)) return d;
      return canAdd ? freshContainer() : null;
    },
    [slots, activeDrop, containers.length, canAdd, freshContainer],
  );

  const renderPopover = (index: number) => {
    const slot = slots[index];
    if (!slot) return null;
    const assigned = slot.dropIndex !== null;
    const container = slot.dropIndex !== null ? containers[slot.dropIndex] : undefined;
    const d = slot.dropIndex ?? -1;
    const hasMapping = container ? container.fee > 0 || container.distance > 0 : false;

    return (
      <div className="space-y-3" style={{ direction: 'ltr' }}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-semibold">
            {t('trips.form.compartments.nth', { n: index + 1 })}
          </span>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {formatNumber(layout[index] ?? slot.volume, 0)} L
          </span>
        </div>

        {/* Which container. Existing ones first, then a new one. */}
        <ChipGroup edgeBleed={false} className="gap-1">
          {containers.map((c, drop) => isBlank(drop) && slot.dropIndex !== drop ? null : (
            <Chip
              key={drop}
              type="button"
              active={slot.dropIndex === drop}
              aria-pressed={slot.dropIndex === drop}
              onClick={() => onAssign(index, drop)}
              className="h-8 min-w-0 max-w-[140px] px-2.5 text-[11px]"
            >
              <span
                className="me-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full align-middle"
                style={{ backgroundColor: dropColor(drop) }}
                aria-hidden
              />
              <span className="truncate">
                {c.receipt || t('trips.form.containerN', { n: drop + 1 })}
              </span>
            </Chip>
          ))}
          {canAdd && !(slot.dropIndex !== null && isBlank(slot.dropIndex)) && (
            <Chip
              type="button"
              onClick={() => onAssign(index, freshContainer())}
              className="h-8 min-w-0 px-2.5 text-[11px]"
            >
              <Plus className="me-1 h-3 w-3" />
              {t('trips.form.compartments.newContainer')}
            </Chip>
          )}
          {assigned && (
            <Chip
              type="button"
              onClick={() => onAssign(index, null)}
              className="h-8 min-w-0 px-2.5 text-[11px]"
            >
              {t('trips.form.compartments.release')}
            </Chip>
          )}
        </ChipGroup>

        {container && (
          <div
            className="space-y-2.5 rounded-md border p-2.5"
            style={{ borderColor: dropColor(d) }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: dropColor(d) }}
                  aria-hidden
                />
                {t('trips.form.containerN', { n: d + 1 })}
              </span>
              {containers.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveContainer(d)}
                  className="h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label={t('common.remove')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {container.issue && (
              <div
                className={cn(
                  'space-y-1.5 rounded-md border border-dashed px-2 py-1.5 text-[11px]',
                  container.issue.severity === 'error'
                    ? 'border-destructive/40 bg-destructive/10 text-destructive'
                    : 'border-warning/40 bg-warning/10 text-warning',
                )}
              >
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  <div>
                    <div className="font-medium">{container.issue.title}</div>
                    <div className="text-muted-foreground" dir="auto">
                      {container.issue.description}
                    </div>
                  </div>
                </div>
                {container.issue.override && (
                  <label className="flex cursor-pointer items-center gap-2 ps-4 font-medium text-foreground">
                    <Checkbox
                      checked={container.issue.override.checked}
                      onCheckedChange={container.issue.override.onToggle}
                      aria-label={container.issue.override.label}
                    />
                    {container.issue.override.label}
                  </label>
                )}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor={`receipt-${d}`} className="text-[11px]">
                {t('trips.fields.receiptNo')}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`receipt-${d}`}
                value={container.receipt}
                onChange={(e) => onReceiptChange(d, e.target.value)}
                onBlur={() => onReceiptBlur(d)}
                placeholder="WT-12345"
                className={cn(
                  'h-8 tabular-nums',
                  container.issue?.severity === 'error' &&
                    'border-destructive focus-visible:ring-destructive',
                )}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">
                {t('trips.fields.dropOffPoint')}
                <span className="text-destructive">*</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canPickDropOff}
                onClick={() => {
                  // The picker is a dialog and popovers float above dialogs,
                  // so this one steps aside and comes back when it closes.
                  setPicking(d);
                  setOpenIndex(null);
                }}
                className="h-8 w-full justify-start gap-1.5 px-2 font-normal disabled:opacity-40"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className={cn('truncate', !container.dropOff && 'text-muted-foreground')}>
                  {container.dropOff ||
                    (canPickDropOff
                      ? t('trips.form.placeholder.selectDropOff')
                      : t('trips.form.placeholder.selectCompanyFirst'))}
                </span>
              </Button>
              {hasMapping && (
                <p className="text-[10px] tabular-nums text-muted-foreground">
                  {formatNumber(container.distance, 0)} km · {formatNumber(container.fee, 0)}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                {t('trips.form.gasType.heading')}
              </span>
              <ChipGroup edgeBleed={false} className="gap-1">
                {GAS_TYPE_VALUES.map((gas) => (
                  <Chip
                    key={gas}
                    type="button"
                    active={slot.gasType === gas}
                    aria-pressed={slot.gasType === gas}
                    onClick={() => onGasChange(index, slot.gasType === gas ? '' : gas)}
                    className="h-7 min-w-0 px-2 text-[11px]"
                  >
                    <span
                      className="me-1 inline-block h-2 w-2 rounded-full align-middle"
                      style={{ backgroundColor: gasColor(gas) }}
                      aria-hidden
                    />
                    {t(`trips.form.gasType.options.${gas}`)}
                  </Chip>
                ))}
              </ChipGroup>
            </div>

            {canOverride && (
              <div className="flex items-center gap-2">
                <Label htmlFor={`compartment-volume-${index}`} className="text-[11px] text-muted-foreground">
                  {t('trips.form.compartments.overrideVolume')}
                </Label>
                <Input
                  id={`compartment-volume-${index}`}
                  type="number"
                  min={0}
                  step={100}
                  value={slot.volume || ''}
                  onChange={(e) => onVolumeChange(index, Number(e.target.value) || 0)}
                  className="h-8 w-28 tabular-nums"
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={assignedCount === 0}
        >
          <RotateCcw />
          {t('trips.form.compartments.clear')}
        </Button>
      </div>

      <div className="rounded-lg border bg-muted/30 px-2 py-3 sm:px-4">
        <React.Suspense fallback={<div className="aspect-[16/10] w-full animate-pulse rounded-md bg-muted/40 sm:aspect-[16/6]" />}>
        <TankerDiagram
          compartments={diagramCompartments}
          activeDrop={activeDrop}
          dropLabels={dropLabels}
          plate={plate}
          onAssign={onAssign}
          renderPopover={renderPopover}
          resolveDragDrop={resolveDragDrop}
          drops={drops}
          openIndex={openIndex}
          onOpenIndexChange={handleOpenChange}
          emptyLabel={t('trips.form.compartments.empty')}
          aria-label={t('trips.form.compartments.diagramLabel', {
            plate: plate ?? '',
          })}
        />
        </React.Suspense>
      </div>

      {unassigned > 0 && (
        <p className="text-[12px] text-muted-foreground">
          {t('trips.form.compartments.unassignedCount', { count: unassigned })}
        </p>
      )}
      {missingProducts > 0 && (
        <button
          type="button"
          onClick={() => {
            const first = slots.findIndex((s) => s.dropIndex !== null && !s.gasType);
            if (first >= 0) handleOpenChange(first);
          }}
          className="block text-[12px] text-warning underline-offset-2 hover:underline"
        >
          {t('trips.form.compartments.missingProducts', { count: missingProducts })}
        </button>
      )}
      {containerIssues.length > 0 && (
        <ul className="space-y-1 text-[12px]">
          {containerIssues.map(({ d, first, problems }) => (
            <li key={d} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <button
                type="button"
                onClick={() => (first >= 0 ? handleOpenChange(first) : onRemoveContainer(d))}
                className="inline-flex items-center gap-1.5 font-medium text-foreground underline-offset-2 hover:underline"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: dropColor(d) }}
                  aria-hidden
                />
                {containers[d]?.receipt.trim() || t('trips.form.containerN', { n: d + 1 })}
              </button>
              <span className="text-warning">{problems.join(' · ')}</span>
              {first < 0 && (
                <span className="text-muted-foreground">({t('common.remove')})</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <DropOffPickerModal
        open={picking !== null}
        onOpenChange={(open) => {
          if (open) return;
          const drop = picking;
          setPicking(null);
          // Back to the compartment whose form sent us here.
          const index = drop === null ? -1 : slots.findIndex((s) => s.dropIndex === drop);
          if (index >= 0) setOpenIndex(index);
        }}
        company={company}
        terminal={terminal}
        value={picking !== null ? (containers[picking]?.dropOff ?? '') : ''}
        onSelect={(dropOff, mapping) => {
          if (picking !== null) onDropOffPicked(picking, dropOff, mapping);
        }}
      />
    </div>
  );
}
