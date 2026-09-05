import { describe, expect, it } from 'vitest';

import {
  activeContainers,
  addContainer,
  assign,
  canSave,
  choicesFor,
  compartmentsOf,
  dragTarget,
  emptySlots,
  fitLegacy,
  freshContainer,
  isBlank,
  planIssues,
  conform,
  pruneBlanks,
  reindexAfterRemovals,
  reindexAfterRemove,
  release,
  releaseAll,
  removeContainer,
  setGas,
  setVolume,
  type Plan,
  type PlanContainer,
  type PlanSlot,
} from './compartment-plan';

const LAYOUT = [15000, 12000, 12000, 15000];
const MAX = 4;
const blank = (): PlanContainer => ({ receipt_no: '', drop_off_point: '' });
const c = (receipt_no: string, drop_off_point = 'Qena'): PlanContainer => ({ receipt_no, drop_off_point });
const slot = (dropIndex: number | null, gasType = '92', volume = 1): PlanSlot => ({ dropIndex, gasType, volume });

const plan = (slots: PlanSlot[], containers: PlanContainer[]): Plan => ({ slots, containers });
const fresh = (): Plan => plan(emptySlots(LAYOUT), [blank()]);
const frozen = <T,>(v: T): T => {
  if (v && typeof v === 'object') Object.values(v as object).forEach(frozen);
  return Object.freeze(v);
};

describe('emptySlots', () => {
  it('mirrors the layout with nothing assigned', () => {
    expect(emptySlots(LAYOUT)).toEqual(LAYOUT.map((volume) => ({ dropIndex: null, gasType: '', volume })));
  });
  it('is empty for a truck without a layout', () => {
    expect(emptySlots([])).toEqual([]);
  });
});

describe('isBlank / activeContainers', () => {
  it('a container with nothing at all is blank', () => {
    expect(isBlank(fresh(), 0)).toBe(true);
    expect(activeContainers(fresh())).toEqual([]);
  });
  it('a receipt, a drop-off or a compartment each make it real', () => {
    expect(isBlank(plan(emptySlots(LAYOUT), [c('A-1', '')]), 0)).toBe(false);
    expect(isBlank(plan(emptySlots(LAYOUT), [{ receipt_no: '', drop_off_point: 'Qena' }]), 0)).toBe(false);
    expect(isBlank(plan([slot(0), slot(null)], [blank()]), 0)).toBe(false);
  });
  it('whitespace is not a receipt', () => {
    expect(isBlank(plan(emptySlots(LAYOUT), [{ receipt_no: '   ', drop_off_point: ' ' }]), 0)).toBe(true);
  });
  it('an index that does not exist is not blank, so nobody prunes it', () => {
    expect(isBlank(fresh(), 5)).toBe(false);
    expect(isBlank(fresh(), -1)).toBe(false);
  });
  it('lists real containers in order, skipping blanks in the middle', () => {
    const p = plan([slot(0), slot(2), slot(null), slot(null)], [c('A'), blank(), c('C')]);
    expect(activeContainers(p)).toEqual([0, 2]);
    expect(compartmentsOf(p, 2)).toEqual([1]);
    expect(compartmentsOf(p, 1)).toEqual([]);
    expect(compartmentsOf(p, 9)).toEqual([]);
  });
});

describe('assign / release', () => {
  it('puts a compartment on a drop and leaves the rest alone', () => {
    const p = frozen(plan(emptySlots(LAYOUT), [c('A'), c('B')]));
    const next = assign(p, 1, 1);
    expect(next.slots.map((s) => s.dropIndex)).toEqual([null, 1, null, null]);
    expect(next.slots[1].volume).toBe(12000);
    expect(p.slots[1].dropIndex).toBeNull();
  });
  it('moves a compartment between drops and keeps its product — the load did not change', () => {
    const p = plan([slot(0, '92'), slot(0, 'diesel')], [c('A'), c('B')]);
    const moved = assign(p, 1, 1);
    expect(moved.slots.map((s) => s.dropIndex)).toEqual([0, 1]);
    expect(moved.slots[1].gasType).toBe('diesel');
  });
  it('never mutates a frozen plan through any transition', () => {
    const p = frozen(plan([slot(0, '92', 5), slot(null, '', 6)], [c('A'), blank()]));
    expect(() => {
      assign(p, 1, 0);
      release(p, 0, [5, 6]);
      releaseAll(p, [5, 6]);
      setGas(p, 0, '80');
      setVolume(p, 0, 7);
      addContainer(p, blank, MAX);
      freshContainer(p, blank, MAX);
      removeContainer(p, 0, blank);
      pruneBlanks(p);
      dragTarget(p, 1, null, blank, MAX);
      conform(p.slots, [5, 6], 2, true);
    }).not.toThrow();
  });
  it('returns the same plan when nothing changes', () => {
    const p = plan([slot(0)], [c('A')]);
    expect(assign(p, 0, 0)).toBe(p);
    const empty = plan([slot(null, '', 1)], [c('A')]);
    expect(release(empty, 0)).toBe(empty);
  });
  it.each([
    ['index past the end', 4, 0],
    ['negative index', -1, 0],
    ['fractional index', 0.5, 0],
    ['drop past the end', 0, 2],
    ['negative drop', 0, -1],
    ['NaN index', Number.NaN, 0],
  ])('ignores %s', (_label, index, drop) => {
    const p = plan(emptySlots(LAYOUT), [c('A'), c('B')]);
    expect(assign(p, index, drop)).toBe(p);
  });
  it('release frees only that compartment and drops its product', () => {
    const p = plan([slot(0, '92'), slot(0, '92')], [c('A')]);
    expect(release(p, 0).slots).toEqual([slot(null, '', 1), slot(0, '92')]);
  });
  it('release restores the registered litres when given the layout, and keeps them otherwise', () => {
    const p = plan([slot(0, '80', 10000)], [c('A')]);
    expect(release(p, 0, [12000]).slots[0].volume).toBe(12000);
    expect(release(p, 0).slots[0].volume).toBe(10000);
    expect(release(p, 0, [0]).slots[0].volume).toBe(10000);
  });
  it('releaseAll frees everything, clears products, restores litres, and is idempotent', () => {
    const p = plan([slot(0, '80', 5), slot(1, 'diesel', 6)], [c('A'), c('B')]);
    const freed = releaseAll(p, [15000, 12000]);
    expect(freed.slots).toEqual([slot(null, '', 15000), slot(null, '', 12000)]);
    expect(releaseAll(freed, [15000, 12000])).toBe(freed);
  });
  it('an already-empty compartment is untouched by release', () => {
    const p = plan([slot(null, '', 7)], [c('A')]);
    expect(release(p, 0)).toBe(p);
  });
});

describe('setGas / setVolume', () => {
  it('normalises product codes', () => {
    const p = plan([slot(0, '')], [c('A')]);
    expect(setGas(p, 0, ' Diesel ').slots[0].gasType).toBe('diesel');
    const once = setGas(p, 0, '92');
    expect(setGas(once, 0, '92')).toBe(once);
  });
  it('treats non-strings as no product', () => {
    const p = plan([slot(0, '92')], [c('A')]);
    expect(setGas(p, 0, undefined as unknown as string).slots[0].gasType).toBe('');
  });
  it.each([
    [12000, 12000],
    [0, 0],
    [-5, 0],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
    [0.5, 0.5],
  ])('volume %s becomes %s', (input, expected) => {
    expect(setVolume(plan([slot(0, '', 1)], [c('A')]), 0, input).slots[0].volume).toBe(expected);
  });
  it('ignores a bad index', () => {
    const p = plan([slot(0)], [c('A')]);
    expect(setGas(p, 3, '92')).toBe(p);
    expect(setVolume(p, 3, 5)).toBe(p);
  });
});

describe('addContainer / freshContainer', () => {
  it('appends and reports the new index', () => {
    const { plan: next, drop } = addContainer(fresh(), blank, MAX);
    expect(drop).toBe(1);
    expect(next.containers).toHaveLength(2);
  });
  it('refuses at the cap without touching the plan', () => {
    const p = plan(emptySlots(LAYOUT), [c('A'), c('B'), c('C'), c('D')]);
    expect(addContainer(p, blank, MAX)).toEqual({ plan: p, drop: null });
  });
  it('fresh reuses the starting blank instead of adding a second one', () => {
    const p = fresh();
    expect(freshContainer(p, blank, MAX)).toEqual({ plan: p, drop: 0 });
  });
  it('fresh reuses the first blank even when it sits between real ones', () => {
    const p = plan([slot(0), slot(2), slot(null), slot(null)], [c('A'), blank(), c('C')]);
    expect(freshContainer(p, blank, MAX).drop).toBe(1);
  });
  it('fresh adds when every container is real, and refuses at the cap', () => {
    const three = plan(emptySlots(LAYOUT), [c('A'), c('B'), c('C')]);
    expect(freshContainer(three, blank, MAX).drop).toBe(3);
    const four = plan(emptySlots(LAYOUT), [c('A'), c('B'), c('C'), c('D')]);
    expect(freshContainer(four, blank, MAX).drop).toBeNull();
  });
  it('fresh with max 1 and a real container refuses', () => {
    expect(freshContainer(plan(emptySlots(LAYOUT), [c('A')]), blank, 1).drop).toBeNull();
  });
});

describe('removeContainer', () => {
  it('frees its compartments (product and litres included) and pulls later drops down', () => {
    const p = plan([slot(0), slot(1, '80', 9), slot(2), slot(2)], [c('A'), c('B'), c('C')]);
    const next = removeContainer(p, 1, blank, [1, 12000, 1, 1]);
    expect(next.containers.map((x) => x.receipt_no)).toEqual(['A', 'C']);
    expect(next.slots.map((s) => s.dropIndex)).toEqual([0, null, 1, 1]);
    expect(next.slots[1]).toEqual(slot(null, '', 12000));
  });
  it('removing the first shifts everything', () => {
    const p = plan([slot(0), slot(1), slot(2), slot(null)], [c('A'), c('B'), c('C')]);
    expect(removeContainer(p, 0, blank).slots.map((s) => s.dropIndex)).toEqual([null, 0, 1, null]);
  });
  it('never removes the last container — it empties it', () => {
    const p = plan([slot(0), slot(0)], [c('A')]);
    const next = removeContainer(p, 0, blank);
    expect(next.containers).toEqual([blank()]);
    expect(next.slots.map((s) => s.dropIndex)).toEqual([null, null]);
  });
  it('emptying an already blank last container is a no-op', () => {
    const p = fresh();
    expect(removeContainer(p, 0, blank)).toBe(p);
  });
  it('ignores a bad index', () => {
    const p = plan([slot(0)], [c('A'), c('B')]);
    expect(removeContainer(p, 2, blank)).toBe(p);
    expect(removeContainer(p, -1, blank)).toBe(p);
  });
  it('does not mutate its input', () => {
    const p = frozen(plan([slot(1)], [c('A'), c('B')]));
    expect(() => removeContainer(p, 0, blank)).not.toThrow();
  });
});

describe('reindexAfterRemove', () => {
  it.each([
    [null, 1, null],
    [1, 1, null],
    [0, 1, 0],
    [2, 1, 1],
    [3, 0, 2],
  ])('%s after removing %s → %s', (drop, removed, expected) => {
    expect(reindexAfterRemove(drop, removed)).toBe(expected);
  });
});

describe('pruneBlanks', () => {
  it('removes every blank while keeping real containers and their numbering coherent', () => {
    const p = plan([slot(1), slot(3), slot(null), slot(null)], [blank(), c('B'), blank(), c('D')]);
    const { plan: next, removed } = pruneBlanks(p);
    expect(next.containers.map((x) => x.receipt_no)).toEqual(['B', 'D']);
    expect(next.slots.map((s) => s.dropIndex)).toEqual([0, 1, null, null]);
    expect(removed).toEqual([2, 0]);
    // Index-keyed state elsewhere follows the same removals.
    expect(reindexAfterRemovals(3, removed)).toBe(1);
    expect(reindexAfterRemovals(2, removed)).toBeNull();
    expect(reindexAfterRemovals(1, removed)).toBe(0);
  });
  it('keeps one blank when there is nothing else', () => {
    const p = plan(emptySlots(LAYOUT), [blank(), blank(), blank()]);
    expect(pruneBlanks(p).plan.containers).toHaveLength(1);
  });
  it('removes a leading blank and shifts the real container down', () => {
    const p = plan([slot(1), slot(null)], [blank(), c('A')]);
    const { plan: next, removed } = pruneBlanks(p);
    expect(removed).toEqual([0]);
    expect(next.containers.map((x) => x.receipt_no)).toEqual(['A']);
    expect(next.slots.map((s) => s.dropIndex)).toEqual([0, null]);
  });
  it('emits removals in descending order, which is the order index-keyed state must apply them', () => {
    expect(reindexAfterRemovals(3, [2, 0])).toBe(1);
    // Applied ascending, the second removal hits the wrong container.
    expect(reindexAfterRemovals(3, [0, 2])).toBeNull();
  });
  it('returns the same plan when nothing is blank', () => {
    const p = plan([slot(0), slot(1)], [c('A'), c('B')]);
    expect(pruneBlanks(p).plan).toBe(p);
    expect(pruneBlanks(p).removed).toEqual([]);
  });
  it('the fresh plan is already minimal', () => {
    const p = fresh();
    expect(pruneBlanks(p).plan).toBe(p);
  });
  it('the scenario that stuck the save button: switch a fresh container for an existing one', () => {
    // Tap C3 → fresh container 1 auto-assigned → user picks container 0 instead.
    let p = plan([slot(0), slot(0), slot(null), slot(null)], [c('A')]);
    const made = freshContainer(p, blank, MAX);
    p = assign(made.plan, 2, made.drop!);
    p = assign(p, 2, 0);
    expect(p.containers).toHaveLength(2);
    const pruned = pruneBlanks(p).plan;
    expect(pruned.containers).toHaveLength(1);
    expect(pruned.slots.map((s) => s.dropIndex)).toEqual([0, 0, 0, null]);
  });
});

describe('choicesFor', () => {
  it('offers every real container plus new, never the starting blank', () => {
    const p = plan([slot(0), slot(null), slot(null), slot(null)], [c('A'), blank()]);
    expect(choicesFor(p, 1, MAX)).toEqual({ own: null, containers: [0], canNew: true });
  });
  it('reports the compartment\'s own container', () => {
    const p = plan([slot(0), slot(1)], [c('A'), c('B')]);
    expect(choicesFor(p, 1, MAX)).toEqual({ own: 1, containers: [0, 1], canNew: true });
  });
  it('withholds new at the cap when no blank is available', () => {
    const p = plan(emptySlots(LAYOUT), [c('A'), c('B'), c('C'), c('D')]);
    expect(choicesFor(p, 0, MAX).canNew).toBe(false);
  });
  it('still allows new at the cap when a blank can be reused', () => {
    const p = plan(emptySlots(LAYOUT), [c('A'), c('B'), c('C'), blank()]);
    expect(choicesFor(p, 0, MAX).canNew).toBe(true);
  });
  it('a bad index has no own container but still lists the choices', () => {
    expect(choicesFor(plan([slot(0)], [c('A')]), 9, MAX).own).toBeNull();
  });
});

describe('dragTarget', () => {
  it('an assigned compartment drags its own drop', () => {
    const p = plan([slot(1)], [c('A'), c('B')]);
    expect(dragTarget(p, 0, 0, blank, MAX)).toEqual({ plan: p, drop: 1 });
  });
  it('an empty compartment prefers the container of the last tap', () => {
    const p = plan([slot(0), slot(null)], [c('A'), c('B')]);
    expect(dragTarget(p, 1, 1, blank, MAX).drop).toBe(1);
  });
  it('ignores a last tap that pointed at a removed or blank container', () => {
    const p = plan([slot(0), slot(null)], [c('A'), blank()]);
    // 7 does not exist; A already has compartments; so the blank is reused as fresh.
    expect(dragTarget(p, 1, 7, blank, MAX)).toEqual({ plan: p, drop: 1 });
    expect(dragTarget(p, 1, 1, blank, MAX)).toEqual({ plan: p, drop: 1 });
  });
  it('a last tap on a container that already has compartments still wins over an emptier one', () => {
    const p = plan([slot(0), slot(null), slot(null)], [c('A'), c('B')]);
    expect(dragTarget(p, 1, 0, blank, MAX).drop).toBe(0);
    expect(dragTarget(p, 1, null, blank, MAX).drop).toBe(1);
  });
  it('falls back to a real container that has no compartments yet', () => {
    const p = plan([slot(0), slot(null)], [c('A'), c('B')]);
    expect(dragTarget(p, 1, null, blank, MAX).drop).toBe(1);
  });
  it('else makes a fresh one, and refuses at the cap', () => {
    const p = plan([slot(0), slot(null)], [c('A')]);
    const made = dragTarget(p, 1, null, blank, MAX);
    expect(made.drop).toBe(1);
    expect(made.plan.containers).toHaveLength(2);
    const full = plan([slot(0), slot(1), slot(2), slot(null)], [c('A'), c('B'), c('C'), c('D')]);
    expect(dragTarget(full, 3, null, blank, MAX).drop).toBe(3); // D has no compartments yet
    const fullAndUsed = plan([slot(0), slot(1), slot(2), slot(3), slot(null)], [c('A'), c('B'), c('C'), c('D')]);
    expect(dragTarget(fullAndUsed, 4, null, blank, MAX).drop).toBeNull();
  });
  it('a bad index means no drag', () => {
    expect(dragTarget(fresh(), 9, null, blank, MAX).drop).toBeNull();
  });
});

describe('fitLegacy', () => {
  it('lays exact runs in order and carries a single product', () => {
    const slots = fitLegacy(LAYOUT, [
      { capacity: 27000, gasTypes: ['92'] },
      { capacity: 12000, gasTypes: ['80'] },
      { capacity: 15000, gasTypes: ['diesel'] },
    ]);
    expect(slots.map((s) => s.dropIndex)).toEqual([0, 0, 1, 2]);
    expect(slots.map((s) => s.gasType)).toEqual(['92', '92', '80', 'diesel']);
    expect(slots.map((s) => s.volume)).toEqual(LAYOUT);
  });
  it('stops at the first container that fits no run, leaving the rest empty', () => {
    const slots = fitLegacy(LAYOUT, [{ capacity: 27000, gasTypes: ['92'] }, { capacity: 20000, gasTypes: ['92'] }]);
    expect(slots.map((s) => s.dropIndex)).toEqual([0, 0, null, null]);
  });
  it('a first container that fits nothing leaves everything empty', () => {
    expect(fitLegacy(LAYOUT, [{ capacity: 1, gasTypes: [] }]).every((s) => s.dropIndex === null)).toBe(true);
  });
  it('drops a mixed product rather than guess', () => {
    expect(fitLegacy([27000, 27000], [{ capacity: 27000, gasTypes: ['80', '92'] }])[0].gasType).toBe('');
  });
  it('zero, negative and NaN litres stop the fit', () => {
    for (const capacity of [0, -1, Number.NaN]) {
      expect(fitLegacy(LAYOUT, [{ capacity, gasTypes: ['92'] }]).every((s) => s.dropIndex === null)).toBe(true);
    }
  });
  it('a container larger than the whole truck does not fit', () => {
    expect(fitLegacy(LAYOUT, [{ capacity: 99999, gasTypes: ['92'] }]).every((s) => s.dropIndex === null)).toBe(true);
  });
  it('more containers than compartments: the surplus stays unplaced', () => {
    const slots = fitLegacy([27000, 27000], [
      { capacity: 27000, gasTypes: ['92'] },
      { capacity: 27000, gasTypes: ['92'] },
      { capacity: 27000, gasTypes: ['92'] },
    ]);
    expect(slots.map((s) => s.dropIndex)).toEqual([0, 1]);
  });
  it('an empty layout yields no slots', () => {
    expect(fitLegacy([], [{ capacity: 27000, gasTypes: ['92'] }])).toEqual([]);
  });
});

describe('planIssues / canSave', () => {
  const minReceipt = 4;
  const complete = plan(
    [slot(0, '92', 15000), slot(0, '92', 12000), slot(1, '80', 12000), slot(1, '80', 15000)],
    [c('A-1042'), c('A-1043', 'Luxor')],
  );

  it('a complete plan has no issues and saves for everyone', () => {
    const issues = planIssues(complete, LAYOUT, minReceipt);
    expect(issues).toEqual({
      unassigned: 0,
      missingProducts: 0,
      overridden: 0,
      invalidVolumes: 0,
      containers: [],
      nothingPlanned: false,
    });
    expect(canSave(issues, false)).toBe(true);
    expect(canSave(issues, true)).toBe(true);
  });
  it('a fresh plan has nothing planned and never saves', () => {
    const issues = planIssues(fresh(), LAYOUT, minReceipt);
    expect(issues.nothingPlanned).toBe(true);
    expect(canSave(issues, true)).toBe(false);
  });
  it('an unassigned compartment blocks a clerk and not an admin', () => {
    const issues = planIssues(release(complete, 3), LAYOUT, minReceipt);
    expect(issues.unassigned).toBe(1);
    expect(canSave(issues, false)).toBe(false);
    expect(canSave(issues, true)).toBe(true);
  });
  it('a missing product blocks a clerk and not an admin', () => {
    const issues = planIssues(setGas(complete, 2, ''), LAYOUT, minReceipt);
    expect(issues.missingProducts).toBe(1);
    expect(canSave(issues, false)).toBe(false);
    expect(canSave(issues, true)).toBe(true);
  });
  it('an overridden volume blocks a clerk and not an admin', () => {
    const issues = planIssues(setVolume(complete, 0, 14000), LAYOUT, minReceipt);
    expect(issues.overridden).toBe(1);
    expect(canSave(issues, false)).toBe(false);
    expect(canSave(issues, true)).toBe(true);
  });
  it('a real container with no compartments blocks everyone, with its reason', () => {
    const p = plan([slot(0), slot(0)], [c('A-1042'), c('A-1043')]);
    const issues = planIssues(p, [1, 1], minReceipt);
    expect(issues.containers).toEqual([{ drop: 1, noCompartments: true, receiptTooShort: false, noDropOff: false }]);
    expect(canSave(issues, true)).toBe(false);
  });
  it('a short receipt or a missing drop-off blocks everyone', () => {
    const p = plan([slot(0), slot(1)], [c('A-1'), { receipt_no: 'A-1043', drop_off_point: '' }]);
    const issues = planIssues(p, [1, 1], minReceipt);
    expect(issues.containers.map((i) => [i.drop, i.receiptTooShort, i.noDropOff])).toEqual([
      [0, true, false],
      [1, false, true],
    ]);
    expect(canSave(issues, true)).toBe(false);
  });
  it('an assigned compartment at zero litres blocks everyone, even an admin', () => {
    const issues = planIssues(setVolume(complete, 0, 0), LAYOUT, minReceipt);
    expect(issues.invalidVolumes).toBe(1);
    expect(canSave(issues, true)).toBe(false);
  });
  it('an unassigned compartment at zero litres is not an invalid volume', () => {
    const p = plan([slot(null, '', 0), slot(0, '92', 1)], [c('A-1042')]);
    expect(planIssues(p, [0, 1], minReceipt).invalidVolumes).toBe(0);
  });
  it('blank containers are not reported', () => {
    const p = plan([slot(0), slot(0)], [c('A-1042'), blank()]);
    expect(planIssues(p, [1, 1], minReceipt).containers).toEqual([]);
  });
  it('a layout shorter than the slots does not count the extra slots as overridden', () => {
    const p = plan([slot(0, '92', 5), slot(0, '92', 7)], [c('A-1042')]);
    expect(planIssues(p, [5], minReceipt).overridden).toBe(0);
  });
});

describe('conform', () => {
  it('drops slots beyond the layout and fills missing ones', () => {
    expect(conform([slot(0, '92', 5)], [15000, 12000], 1, true)).toEqual([slot(0, '92', 5), slot(null, '', 12000)]);
    expect(conform([slot(0), slot(0), slot(0)], [1], 1, true)).toHaveLength(1);
  });
  it('unassigns a drop that no container backs, and clears its product with it', () => {
    expect(conform([slot(3, '92', 1)], [1], 2, true)).toEqual([slot(null, '', 1)]);
    expect(conform([slot(-1, '92', 1)], [1], 2, true)).toEqual([slot(null, '', 1)]);
  });
  it('a clerk gets registered litres whatever was stored; an admin keeps a valid override', () => {
    expect(conform([slot(0, '92', 10000)], [12000], 1, false)[0].volume).toBe(12000);
    expect(conform([slot(0, '92', 10000)], [12000], 1, true)[0].volume).toBe(10000);
  });
  it('an unassigned slot is always at registered litres, even for an admin', () => {
    expect(conform([slot(null, '', 9000)], [12000], 1, true)[0].volume).toBe(12000);
  });
  it('normalises product codes the way setGas does', () => {
    expect(conform([slot(0, ' Diesel ', 1)], [1], 1, true)[0].gasType).toBe('diesel');
  });
  it('no containers at all leaves every slot unassigned', () => {
    expect(conform([slot(0), slot(1)], [1, 1], 0, true).every((s) => s.dropIndex === null)).toBe(true);
  });
  it('an admin still does not keep zero, negative or NaN litres', () => {
    for (const v of [0, -3, Number.NaN]) {
      expect(conform([slot(0, '92', v)], [12000], 1, true)[0].volume).toBe(12000);
    }
  });
  it('an empty layout conforms to nothing', () => {
    expect(conform([slot(0)], [], 1, true)).toEqual([]);
  });
});
