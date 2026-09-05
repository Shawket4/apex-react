import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, MapPin, Plus, RotateCcw, Trash2 } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Chip, ChipGroup } from '@/shared/ui/chip-group';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { dropColor, gasColor } from '@/shared/ui/tanker-diagram/palette';
import { cn } from '@/shared/lib/cn';
import { formatNumber } from '@/shared/lib/format';
import type { MappingDetail } from '@/entities/mapping/schemas';

import { DropOffPickerModal } from './drop-off-picker-modal';
import {
  activeContainers,
  assign,
  choicesFor,
  dragTarget,
  freshContainer,
  planIssues,
  pruneBlanks,
  releaseAll,
  reindexAfterRemove,
  reindexAfterRemovals,
  release,
  setGas,
  setVolume,
  type Plan,
  type PlanContainer,
  type PlanSlot,
} from './compartment-plan';

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
/* Every state change goes through compartment-plan.ts, which is pure and    */
/* tested; this file only decides what to show and which function a tap    */
/* calls. A popover offers every real container plus "new"; the blank the  */
/* form starts with is never a choice, and "new" reuses it before adding.  */
/* The drop-off picker is rendered here rather than in the trip form so the */
/* popover can step aside while the picker is up and come back after.       */
/* -------------------------------------------------------------------------- */

export const GAS_TYPE_VALUES = ['80', '92', '95', 'diesel'] as const;
export type GasTypeValue = (typeof GAS_TYPE_VALUES)[number];

/** What the planner needs to know about a container beyond the plan itself. */
export interface PlannerContainer extends PlanContainer {
  fee: number;
  distance: number;
  /** Rendered validation the trip form owns (receipt serialization, duplicates). */
  issue: {
    severity: 'error' | 'warning';
    title: string;
    description: string;
    /** "Save anyway" acknowledgement, for a serialization mismatch. */
    override?: { checked: boolean; label: string; onToggle: () => void };
  } | null;
}

export interface CompartmentPlannerProps<C extends PlannerContainer> {
  /** The car's registered compartment volumes, in order. */
  layout: number[];
  plan: Plan<C>;
  onPlanChange: (next: Plan<C>) => void;
  /** Removal is separate: the form keeps index-keyed state it must reindex. */
  onRemoveContainer: (dropIndex: number) => void;
  blankContainer: () => C;
  maxContainers: number;
  plate?: string;
  onReceiptBlur: (dropIndex: number) => void;
  /** Route context for the drop-off picker; the picker is disabled until both are set. */
  company: string;
  terminal: string;
  onDropOffPicked: (dropIndex: number, dropOff: string, mapping?: MappingDetail) => void;
  /** Permission >= 4. Reveals the per-compartment volume field. */
  canOverride: boolean;
  minReceiptLength: number;
}

export function CompartmentPlanner<C extends PlannerContainer>({
  layout,
  plan,
  onPlanChange,
  onRemoveContainer,
  blankContainer,
  maxContainers,
  plate,
  onReceiptBlur,
  company,
  terminal,
  onDropOffPicked,
  canOverride,
  minReceiptLength,
}: CompartmentPlannerProps<C>) {
  const { t } = useTranslation();
  const { slots, containers } = plan;

  // A drag hands over several changes inside one pointer event, before React
  // re-renders with the first. Each is applied to the latest plan, not to the
  // one this render closed over, or the last write would win.
  const planRef = React.useRef(plan);
  planRef.current = plan;
  const change = React.useCallback(
    (f: (current: Plan<C>) => Plan<C>) => {
      const next = f(planRef.current);
      if (next === planRef.current) return;
      planRef.current = next;
      onPlanChange(next);
    },
    [onPlanChange],
  );

  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
  /** Drop-off picker: which container, and which compartment's popover to come back to. */
  const [picking, setPicking] = React.useState<{ drop: number; from: number } | null>(null);
  const [removing, setRemoving] = React.useState<number | null>(null);
  /** The container the previous tap dealt with — what a drag from an empty compartment extends. */
  const [lastDrop, setLastDrop] = React.useState<number | null>(null);
  const canPickDropOff = Boolean(company.trim() && terminal.trim());

  const issues = React.useMemo(
    () => planIssues(plan, layout, minReceiptLength),
    [plan, layout, minReceiptLength],
  );

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
    () => containers.map((_, d) => String(d + 1)),
    [containers],
  );
  const drops = React.useMemo(
    () =>
      containers.map((c) => ({
        receipt: c.receipt_no || undefined,
        dropOff: c.drop_off_point || undefined,
      })),
    [containers],
  );

  const choose = (index: number, drop: number) => {
    change((current) => assign(current, index, drop));
    setLastDrop(drop);
  };

  const chooseNew = (index: number) => {
    const made = freshContainer(planRef.current, blankContainer, maxContainers);
    if (made.drop === null) return;
    change(() => assign(made.plan, index, made.drop!));
    setLastDrop(made.drop);
  };

  // Leaving a popover sweeps up any blank a switch of container left behind.
  // The form ignores blanks, but a stale one would be reused with a
  // misleading number. Removals go through the form's own channel, one by
  // one, because it keeps index-keyed state of its own to shift; `lastDrop`
  // is such an index here. Not while a dialog holds an index of its own —
  // it would delete or fill the wrong container.
  const prune = () => {
    if (removing !== null || picking !== null) return;
    const { removed } = pruneBlanks(planRef.current);
    if (removed.length === 0) return;
    removed.forEach((d) => onRemoveContainer(d));
    setLastDrop((d) => reindexAfterRemovals(d, removed));
  };

  const handleOpenChange = (index: number | null) => {
    setOpenIndex(index);
    prune();
    if (index !== null) {
      const own = slots[index]?.dropIndex ?? null;
      if (own !== null) setLastDrop(own);
    }
  };

  const removeNow = (drop: number) => {
    setRemoving(null);
    setOpenIndex(null);
    setLastDrop((d) => reindexAfterRemove(d, drop));
    onRemoveContainer(drop);
  };

  const resolveDragDrop = React.useCallback(
    (index: number) => {
      const made = dragTarget(planRef.current, index, lastDrop, blankContainer, maxContainers);
      change(() => made.plan);
      if (made.drop !== null) setLastDrop(made.drop);
      return made.drop;
    },
    [lastDrop, blankContainer, maxContainers, change],
  );

  const patchContainer = (d: number, patch: Partial<C>) =>
    change((current) => ({
      ...current,
      containers: current.containers.map((c, i) => (i === d ? { ...c, ...patch } : c)),
    }));

  const containerChip = (d: number, index: number, active: boolean) => (
    <Chip
      key={d}
      type="button"
      active={active}
      aria-pressed={active}
      onClick={() => choose(index, d)}
      className="h-8 min-w-0 max-w-[160px] px-2.5 text-[11px]"
    >
      <span
        className="me-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full align-middle"
        style={{ backgroundColor: dropColor(d) }}
        aria-hidden
      />
      <span className="truncate">
        {containers[d]?.receipt_no.trim() || t('trips.form.containerN', { n: d + 1 })}
      </span>
    </Chip>
  );

  const renderPopover = (index: number) => {
    const slot = slots[index];
    if (!slot) return null;
    const { own, containers: choices, canNew } = choicesFor(plan, index, maxContainers);
    const container = own !== null ? containers[own] : undefined;
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

        {/* Every real container, then new. Wraps: the popover is 288 px on a
            phone and four receipts do not fit a row. */}
        <ChipGroup edgeBleed={false} className="flex-wrap gap-1 overflow-visible">
          {choices.map((d) => containerChip(d, index, own === d))}
          {canNew && (
            <Chip
              type="button"
              onClick={() => chooseNew(index)}
              className="h-8 min-w-0 px-2.5 text-[11px]"
            >
              <Plus className="me-1 h-3 w-3" />
              {t('trips.form.compartments.newContainer')}
            </Chip>
          )}
          {own !== null && (
            <Chip
              type="button"
              onClick={() => change((current) => release(current, index, layout))}
              className="h-8 min-w-0 px-2.5 text-[11px]"
            >
              {t('trips.form.compartments.release')}
            </Chip>
          )}
        </ChipGroup>

        {container && own !== null && (
          <div className="space-y-2.5 rounded-md border p-2.5" style={{ borderColor: dropColor(own) }}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: dropColor(own) }}
                  aria-hidden
                />
                {t('trips.form.containerN', { n: own + 1 })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRemoving(own)}
                className="h-8 gap-1 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('common.remove')}
              </Button>
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
              <Label htmlFor={`receipt-${own}`} className="text-[11px]">
                {t('trips.fields.receiptNo')}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`receipt-${own}`}
                value={container.receipt_no}
                onChange={(e) => patchContainer(own, { receipt_no: e.target.value } as Partial<C>)}
                onBlur={() => onReceiptBlur(own)}
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
                  setPicking({ drop: own, from: index });
                  setOpenIndex(null);
                }}
                className="h-8 w-full justify-start gap-1.5 px-2 font-normal disabled:opacity-40"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className={cn('truncate', !container.drop_off_point && 'text-muted-foreground')}>
                  {container.drop_off_point ||
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
              <ChipGroup edgeBleed={false} className="flex-wrap gap-1 overflow-visible">
                {GAS_TYPE_VALUES.map((gas) => (
                  <Chip
                    key={gas}
                    type="button"
                    active={slot.gasType === gas}
                    aria-pressed={slot.gasType === gas}
                    onClick={() => change((current) => setGas(current, index, slot.gasType === gas ? '' : gas))}
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
                  onChange={(e) => change((current) => setVolume(current, index, Number(e.target.value)))}
                  className="h-8 w-28 tabular-nums"
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const assignedCount = slots.length - issues.unassigned;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => change((current) => releaseAll(current, layout))}
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
          activeDrop={lastDrop}
          dropLabels={dropLabels}
          plate={plate}
          onAssign={(index, drop) => change((current) => assign(current, index, drop))}
          renderPopover={renderPopover}
          resolveDragDrop={resolveDragDrop}
          drops={drops}
          openIndex={openIndex}
          onOpenIndexChange={handleOpenChange}
          emptyLabel={t('trips.form.compartments.empty')}
          describeCompartment={(index, nominal, dropLabel) =>
            t('trips.form.compartments.compartmentAria', {
              n: index + 1,
              litres: formatNumber(nominal, 0),
              state:
                dropLabel !== null && slots[index]?.dropIndex !== null
                  ? t('trips.form.compartments.onReceipt', {
                      receipt:
                        containers[slots[index].dropIndex!]?.receipt_no.trim() ||
                        t('trips.form.containerN', { n: (slots[index].dropIndex ?? 0) + 1 }),
                    })
                  : t('trips.form.compartments.empty'),
            })
          }
          aria-label={t('trips.form.compartments.diagramLabel', {
            plate: plate ?? '',
          })}
        />
        </React.Suspense>
        <p className="mt-2 text-[11px] text-muted-foreground">{t('trips.form.compartments.hint')}</p>
      </div>

      {issues.unassigned > 0 && (
        <p className="text-[12px] text-muted-foreground">
          {t('trips.form.compartments.unassignedCount', { count: issues.unassigned })}
        </p>
      )}
      {issues.invalidVolumes > 0 && (
        <p className="text-[12px] text-destructive">
          {t('trips.form.compartments.invalidVolumes', { count: issues.invalidVolumes })}
        </p>
      )}
      {issues.missingProducts > 0 && (
        <button
          type="button"
          onClick={() => {
            const first = slots.findIndex((s) => s.dropIndex !== null && !s.gasType);
            if (first >= 0) handleOpenChange(first);
          }}
          className="block text-[12px] text-warning underline-offset-2 hover:underline"
        >
          {t('trips.form.compartments.missingProducts', { count: issues.missingProducts })}
        </button>
      )}
      {issues.containers.length > 0 && (
        <ul className="space-y-1 text-[12px]">
          {issues.containers.map(({ drop, noCompartments, receiptTooShort, noDropOff }) => {
            const first = slots.findIndex((s) => s.dropIndex === drop);
            const problems = [
              noCompartments ? t('trips.form.compartments.noCompartments') : null,
              receiptTooShort ? t('trips.form.compartments.needsReceipt') : null,
              noDropOff ? t('trips.form.compartments.needsDropOff') : null,
            ].filter((m): m is string => m !== null);
            return (
              <li key={drop} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: dropColor(drop) }}
                    aria-hidden
                  />
                  {containers[drop]?.receipt_no.trim() || t('trips.form.containerN', { n: drop + 1 })}
                </span>
                <span className="text-warning">{problems.join(' · ')}</span>
                {first >= 0 ? (
                  <button
                    type="button"
                    onClick={() => handleOpenChange(first)}
                    className="text-foreground underline underline-offset-2"
                  >
                    {t('common.edit')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRemoving(drop)}
                    className="text-destructive underline underline-offset-2"
                  >
                    {t('common.remove')}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <DropOffPickerModal
        open={picking !== null}
        onOpenChange={(open) => {
          if (open) return;
          const from = picking?.from ?? null;
          setPicking(null);
          // Back to the compartment whose form sent us here.
          if (from !== null && from < slots.length) setOpenIndex(from);
        }}
        company={company}
        terminal={terminal}
        value={picking !== null ? (containers[picking.drop]?.drop_off_point ?? '') : ''}
        onSelect={(dropOff, mapping) => {
          if (picking !== null) onDropOffPicked(picking.drop, dropOff, mapping);
        }}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t('trips.form.compartments.removeContainerTitle')}
        description={t('trips.form.compartments.removeContainerDescription', {
          name:
            removing !== null
              ? containers[removing]?.receipt_no.trim() ||
                t('trips.form.containerN', { n: removing + 1 })
              : '',
        })}
        confirmLabel={t('common.remove')}
        onConfirm={() => {
          if (removing !== null) removeNow(removing);
        }}
      />
    </div>
  );
}

export type { PlanSlot as CompartmentSlot };
export { activeContainers };
