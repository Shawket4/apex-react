/* -------------------------------------------------------------------------- */
/* Compartment plan                                                            */
/*                                                                            */
/* The state behind the tanker diagram, as pure functions over plain data.    */
/* A plan is the truck's compartments (each holding at most one drop's       */
/* product) and the drops themselves — one per receipt. Every transition the */
/* diagram, the popover and the trip form perform goes through here, and     */
/* nothing here touches React, so the whole thing is testable as arithmetic. */
/*                                                                            */
/* Invariants every function preserves:                                       */
/*   - a slot's dropIndex is null or a valid index into `containers`;         */
/*   - there is always at least one container (the form needs somewhere to    */
/*     type), and never more than `max`;                                      */
/*   - inputs are never mutated; an unchanged plan comes back as the same     */
/*     reference, so callers can bail out of re-renders cheaply.              */
/* -------------------------------------------------------------------------- */

export interface PlanSlot {
  /** Which drop took it, `null` while unassigned. */
  dropIndex: number | null;
  /** Product loaded, `''` until chosen. */
  gasType: string;
  /** Litres taken. Equals the registered figure unless an admin overrides it. */
  volume: number;
}

/** The part of a container the plan reasons about, named as the payload names them. */
export interface PlanContainer {
  receipt_no: string;
  drop_off_point: string;
}

export interface Plan<C extends PlanContainer = PlanContainer> {
  slots: PlanSlot[];
  containers: C[];
}

const isIndex = (n: unknown, length: number): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < length;

/** Fresh slots for a registered layout, nothing assigned. */
export function emptySlots(layout: readonly number[]): PlanSlot[] {
  return layout.map((volume) => ({ dropIndex: null, gasType: '', volume }));
}

/** Compartments a drop holds, in truck order. */
export function compartmentsOf(plan: Plan, drop: number): number[] {
  const out: number[] = [];
  plan.slots.forEach((slot, i) => {
    if (slot.dropIndex === drop) out.push(i);
  });
  return out;
}

/**
 * A container nobody has touched: no receipt, no drop-off, no compartments.
 * The form starts with one, and "new container" hands out blanks before
 * adding more, so blanks are scaffolding rather than choices — they are
 * never offered as chips and never block a save.
 */
export function isBlank(plan: Plan, drop: number): boolean {
  const c = plan.containers[drop];
  if (!c) return false;
  return !c.receipt_no.trim() && !c.drop_off_point.trim() && compartmentsOf(plan, drop).length === 0;
}

/** Indices of the containers that are real choices — everything not blank. */
export function activeContainers(plan: Plan): number[] {
  return plan.containers.map((_, d) => d).filter((d) => !isBlank(plan, d));
}

/* -- Slot transitions ------------------------------------------------------ */

/** Put a compartment on a drop, or off any drop with `null`. Invalid input is a no-op. */
export function assign<C extends PlanContainer>(plan: Plan<C>, index: number, drop: number | null): Plan<C> {
  if (!isIndex(index, plan.slots.length)) return plan;
  if (drop !== null && !isIndex(drop, plan.containers.length)) return plan;
  const slot = plan.slots[index];
  if (slot.dropIndex === drop) return plan;
  const slots = plan.slots.slice();
  slots[index] = { ...slot, dropIndex: drop };
  return { ...plan, slots };
}

/**
 * Take a compartment off its drop. The product goes with it and the litres
 * return to the registered figure when the layout has one for it: an empty
 * compartment carrying last time's product or an admin's re-measurement
 * would hand both to whoever assigns it next, and a non-admin could never
 * clear the re-measurement, which blocks their save. (Moving a compartment
 * between drops keeps its product: what is in it did not change.)
 */
export function release<C extends PlanContainer>(
  plan: Plan<C>,
  index: number,
  layout?: readonly number[],
): Plan<C> {
  if (!isIndex(index, plan.slots.length)) return plan;
  const slot = plan.slots[index];
  const volume = layout && layout[index] > 0 ? layout[index] : slot.volume;
  if (slot.dropIndex === null && slot.gasType === '' && slot.volume === volume) return plan;
  const slots = plan.slots.slice();
  slots[index] = { dropIndex: null, gasType: '', volume };
  return { ...plan, slots };
}

export function setGas<C extends PlanContainer>(plan: Plan<C>, index: number, gasType: string): Plan<C> {
  if (!isIndex(index, plan.slots.length)) return plan;
  const slot = plan.slots[index];
  const next = typeof gasType === 'string' ? gasType.trim().toLowerCase() : '';
  if (slot.gasType === next) return plan;
  const slots = plan.slots.slice();
  slots[index] = { ...slot, gasType: next };
  return { ...plan, slots };
}

/** Litres carried. Anything that is not a finite non-negative number becomes 0. */
export function setVolume<C extends PlanContainer>(plan: Plan<C>, index: number, volume: number): Plan<C> {
  if (!isIndex(index, plan.slots.length)) return plan;
  const next = Number.isFinite(volume) && volume > 0 ? volume : 0;
  const slot = plan.slots[index];
  if (slot.volume === next) return plan;
  const slots = plan.slots.slice();
  slots[index] = { ...slot, volume: next };
  return { ...plan, slots };
}

export function releaseAll<C extends PlanContainer>(plan: Plan<C>, layout?: readonly number[]): Plan<C> {
  return plan.slots.reduce((next, _slot, index) => release(next, index, layout), plan);
}

/* -- Container transitions ------------------------------------------------- */

export interface Added<C extends PlanContainer> {
  plan: Plan<C>;
  /** The container to use, or `null` when the cap forbade a new one. */
  drop: number | null;
}

/** Append a container. Refuses past `max`. */
export function addContainer<C extends PlanContainer>(plan: Plan<C>, blank: () => C, max: number): Added<C> {
  if (plan.containers.length >= max) return { plan, drop: null };
  return { plan: { ...plan, containers: [...plan.containers, blank()] }, drop: plan.containers.length };
}

/**
 * A container nobody has filled yet: the first blank if there is one, else a
 * new one. This is what "new container" means to the user — they never see
 * the blank the form started with, so it must not become a second "new".
 */
export function freshContainer<C extends PlanContainer>(plan: Plan<C>, blank: () => C, max: number): Added<C> {
  const existing = plan.containers.findIndex((_, d) => isBlank(plan, d));
  if (existing >= 0) return { plan, drop: existing };
  return addContainer(plan, blank, max);
}

/** Map a drop index across the removal of `removed`; the removed one becomes null. */
export function reindexAfterRemove(drop: number | null, removed: number): number | null {
  if (drop === null) return null;
  if (drop === removed) return null;
  return drop > removed ? drop - 1 : drop;
}

/**
 * Drop a container, freeing its compartments and pulling later drops down
 * to match the new numbering. The last container is never removed — the
 * form needs one — it is emptied instead.
 */
export function removeContainer<C extends PlanContainer>(
  plan: Plan<C>,
  drop: number,
  blank: () => C,
  layout?: readonly number[],
): Plan<C> {
  if (!isIndex(drop, plan.containers.length)) return plan;
  let next = plan;
  plan.slots.forEach((slot, index) => {
    if (slot.dropIndex === drop) next = release(next, index, layout);
  });
  if (plan.containers.length === 1) {
    if (isBlank(next, 0)) return next;
    return { ...next, containers: [blank()] };
  }
  return {
    containers: next.containers.filter((_, d) => d !== drop),
    slots: next.slots.map((slot) =>
      slot.dropIndex === null || slot.dropIndex < drop
        ? slot
        : { ...slot, dropIndex: reindexAfterRemove(slot.dropIndex, drop) },
    ),
  };
}

/**
 * Sweep blank containers, keeping at least one container overall. Called
 * when a popover closes: switching a compartment from a freshly made
 * container to an existing one leaves the fresh one blank, and while blanks
 * never show, a stale one would be reused with a misleading number. Returns
 * the removed indices too, so index-keyed state elsewhere can follow.
 */
export function pruneBlanks<C extends PlanContainer>(plan: Plan<C>): { plan: Plan<C>; removed: number[] } {
  let next = plan;
  const removed: number[] = [];
  // Walk from the end so earlier indices stay valid as we remove; the
  // `length > 1` guard means the last-container branch, and so the blank
  // factory, is never reached.
  const never = (): C => {
    throw new Error('pruneBlanks never empties the last container');
  };
  for (let d = next.containers.length - 1; d >= 0 && next.containers.length > 1; d--) {
    if (isBlank(next, d)) {
      next = removeContainer(next, d, never);
      removed.push(d);
    }
  }
  return { plan: next, removed };
}

/** A slot's drop after several removals, applied in the order they happened. */
export function reindexAfterRemovals(drop: number | null, removed: readonly number[]): number | null {
  return removed.reduce<number | null>((d, r) => reindexAfterRemove(d, r), drop);
}

/**
 * Bring an incoming plan (a stored trip, a URL draft) onto a layout. Slots
 * beyond the layout are dropped, drops beyond the containers become
 * unassigned, and unless the reader may override, every litre figure is the
 * registered one — an override someone else typed must not lock a clerk out
 * of their own save.
 */
export function conform(
  slots: readonly PlanSlot[],
  layout: readonly number[],
  containerCount: number,
  canOverride: boolean,
): PlanSlot[] {
  return layout.map((nominal, index) => {
    const slot = slots[index];
    if (!slot) return { dropIndex: null, gasType: '', volume: nominal };
    const dropIndex = isIndex(slot.dropIndex, containerCount) ? slot.dropIndex : null;
    // An empty compartment is always at its registered litres — that is what
    // `release` leaves behind, and an override on nothing would only count
    // as a re-measurement nobody can see.
    const volume =
      dropIndex !== null && canOverride && Number.isFinite(slot.volume) && slot.volume > 0
        ? slot.volume
        : nominal;
    const gasType = dropIndex === null ? '' : (slot.gasType ?? '').trim().toLowerCase();
    return { dropIndex, gasType, volume };
  });
}

/* -- What a tap or a drag offers ------------------------------------------- */

export interface Choices {
  /** The compartment's own container, if assigned. */
  own: number | null;
  /** Every real container, in order — the compartment's own included. */
  containers: number[];
  /** Whether "new container" is possible (a blank exists or the cap allows one). */
  canNew: boolean;
}

/** The chips a compartment's popover shows. */
export function choicesFor(plan: Plan, index: number, max: number): Choices {
  const own = isIndex(index, plan.slots.length) ? plan.slots[index].dropIndex : null;
  const containers = activeContainers(plan);
  const hasBlank = plan.containers.some((_, d) => isBlank(plan, d));
  return { own, containers, canNew: hasBlank || plan.containers.length < max };
}

/**
 * The drop a drag starting on a compartment extends. Its own if it has one;
 * otherwise the container the previous tap dealt with, else the first
 * container with nothing yet, else a fresh one. `null` means no drag.
 */
export function dragTarget<C extends PlanContainer>(
  plan: Plan<C>,
  index: number,
  lastDrop: number | null,
  blank: () => C,
  max: number,
): Added<C> {
  if (!isIndex(index, plan.slots.length)) return { plan, drop: null };
  const own = plan.slots[index].dropIndex;
  if (own !== null) return { plan, drop: own };
  if (lastDrop !== null && isIndex(lastDrop, plan.containers.length) && !isBlank(plan, lastDrop)) {
    return { plan, drop: lastDrop };
  }
  const empty = plan.containers.findIndex((_, d) => compartmentsOf(plan, d).length === 0 && !isBlank(plan, d));
  if (empty >= 0) return { plan, drop: empty };
  return freshContainer(plan, blank, max);
}

/* -- Legacy trips ---------------------------------------------------------- */

/**
 * Lay containers that were saved as typed litres onto a registered layout.
 * Each container in turn takes the next run of compartments whose registered
 * volumes sum to exactly its litres. The first container that fits no such
 * run stops the fitting — after a miss the rest is guesswork — and stays
 * unassigned for the user to place. A single product carries over; a mixed
 * one does not, because it cannot be told which compartment held which.
 */
export function fitLegacy(
  layout: readonly number[],
  containers: ReadonlyArray<{ capacity: number; gasTypes: readonly string[] }>,
): PlanSlot[] {
  const slots = emptySlots(layout);
  let cursor = 0;
  for (let drop = 0; drop < containers.length && cursor < layout.length; drop++) {
    const { capacity, gasTypes } = containers[drop];
    if (!(capacity > 0)) break;
    let sum = 0;
    let end = cursor;
    while (end < layout.length && sum < capacity) sum += layout[end++];
    if (sum !== capacity) break;
    const gasType = gasTypes.length === 1 ? gasTypes[0] : '';
    for (let i = cursor; i < end; i++) slots[i] = { dropIndex: drop, gasType, volume: layout[i] };
    cursor = end;
  }
  return slots;
}

/* -- What stands between the plan and a save -------------------------------- */

export interface ContainerIssue {
  drop: number;
  noCompartments: boolean;
  receiptTooShort: boolean;
  noDropOff: boolean;
}

export interface PlanIssues {
  unassigned: number;
  missingProducts: number;
  overridden: number;
  /** Assigned compartments whose litres are not a positive number — the backend rejects those. */
  invalidVolumes: number;
  /** Real containers only; blanks are not the user's problem. */
  containers: ContainerIssue[];
  /** No real container at all — nothing to save. */
  nothingPlanned: boolean;
}

export function planIssues(plan: Plan, layout: readonly number[], minReceipt: number): PlanIssues {
  const active = activeContainers(plan);
  return {
    unassigned: plan.slots.filter((slot) => slot.dropIndex === null).length,
    missingProducts: plan.slots.filter((slot) => slot.dropIndex !== null && !slot.gasType).length,
    overridden: plan.slots.filter((slot, i) => slot.volume !== (layout[i] ?? slot.volume)).length,
    invalidVolumes: plan.slots.filter((slot) => slot.dropIndex !== null && !(slot.volume > 0)).length,
    containers: active
      .map((drop) => ({
        drop,
        noCompartments: compartmentsOf(plan, drop).length === 0,
        receiptTooShort: plan.containers[drop].receipt_no.trim().length < minReceipt,
        noDropOff: !plan.containers[drop].drop_off_point.trim(),
      }))
      .filter((issue) => issue.noCompartments || issue.receiptTooShort || issue.noDropOff),
    nothingPlanned: active.length === 0,
  };
}

/**
 * Whether the plan may be saved. Everyone needs every real container whole
 * (receipt, drop-off, compartments) and something planned; below permission
 * 4 the truck must also be exactly as registered — every compartment
 * assigned, with a product, at its registered volume. An admin may save a
 * partial or re-measured load, and answers a warning for it elsewhere.
 */
export function canSave(issues: PlanIssues, canOverride: boolean): boolean {
  if (issues.nothingPlanned || issues.containers.length > 0 || issues.invalidVolumes > 0) return false;
  if (canOverride) return true;
  return issues.unassigned === 0 && issues.missingProducts === 0 && issues.overridden === 0;
}
