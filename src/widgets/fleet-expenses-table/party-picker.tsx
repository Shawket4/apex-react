import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CheckCircle2, ChevronsUpDown, UserPlus, User, Truck } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui/command';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';
import {
  findExistingParty,
  useCreateEmployee,
  useParties,
  usePartySuggestion,
  type Party,
  type PartyKind,
} from '@/entities/transaction/categories';

export interface PartyValue {
  driver_id: number | null;
  employee_id: number | null;
}

/**
 * Picks the person a transaction is about, and can create a new employee inline.
 *
 * Stores an **id**, never a name. `public.loans.method` in this database shows
 * what free text becomes: one person recorded as 'Shady', 'shady', 'شادى',
 * 'Shady (تاني)' and 'Shady (x2)', in a column that also collected payment
 * methods, reasons, dates and whole sentences. None of that can be reported on.
 *
 * Creating is allowed; creating a duplicate is not. A typed name that matches an
 * existing person case- and whitespace-insensitively selects them instead of
 * offering to create a second row.
 */
export function PartyPicker({
  value,
  onChange,
  required,
  disabled,
  labelledBy,
}: {
  value: PartyValue;
  onChange: (v: PartyValue) => void;
  /** From the category: which kinds of person are acceptable. */
  required: PartyKind;
  disabled?: boolean;
  /** id of the visible label naming this field. */
  labelledBy?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const parties = useParties();
  const createEmployee = useCreateEmployee();

  const all = React.useMemo(() => parties.data ?? [], [parties.data]);

  // Only offer people the category actually accepts — an advance restricted to
  // drivers must not let an office employee be selected.
  const selectable = React.useMemo(() => {
    if (required === 'driver') return all.filter((p) => p.kind === 'driver');
    if (required === 'employee') return all.filter((p) => p.kind === 'employee');
    return all;
  }, [all, required]);

  const selected: Party | undefined = React.useMemo(() => {
    if (value.driver_id) return all.find((p) => p.kind === 'driver' && p.id === value.driver_id);
    if (value.employee_id)
      return all.find((p) => p.kind === 'employee' && p.id === value.employee_id);
    return undefined;
  }, [all, value]);

  const select = (p: Party) => {
    onChange(
      p.kind === 'driver'
        ? { driver_id: p.id, employee_id: null }
        : { driver_id: null, employee_id: p.id },
    );
    setOpen(false);
    setSearch('');
  };

  const existingMatch = findExistingParty(all, search);
  // Creating is only offered for employees: drivers are onboarded properly
  // elsewhere, with licences and documents this picker knows nothing about.
  const canCreate =
    required !== 'driver' &&
    search.trim().length > 1 &&
    !existingMatch &&
    !createEmployee.isPending;

  const create = () => {
    createEmployee.mutate(search.trim(), {
      onSuccess: (created) => {
        const id = created?.ID ?? created?.id;
        if (typeof id === 'number') {
          onChange({ driver_id: null, employee_id: id });
          setOpen(false);
          setSearch('');
        }
      },
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-labelledby={labelledBy}
          disabled={disabled}
          // Full width so it is comfortably tappable on a phone.
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.name : t('fleetExpenses.party.placeholder')}
          </span>
          <ChevronsUpDown className="ms-2 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      {/* z-bumped above the Sheet overlay (z-[9999]) so the picker works when
          it renders inside the inline-category bottom sheet as well as on the
          plain edit form. */}
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter>
          <CommandInput
            placeholder={t('fleetExpenses.party.search')}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              <span className="block px-3 py-2 text-sm text-muted-foreground">
                {t('fleetExpenses.party.noMatch')}
              </span>
            </CommandEmpty>

            {selectable.some((p) => p.kind === 'driver') && (
              <CommandGroup heading={t('fleetExpenses.party.drivers')}>
                {selectable
                  .filter((p) => p.kind === 'driver')
                  .map((p) => (
                    <PartyRow
                      key={`d-${p.id}`}
                      party={p}
                      selected={value.driver_id === p.id}
                      onSelect={select}
                    />
                  ))}
              </CommandGroup>
            )}

            {selectable.some((p) => p.kind === 'employee') && (
              <CommandGroup heading={t('fleetExpenses.party.employees')}>
                {selectable
                  .filter((p) => p.kind === 'employee')
                  .map((p) => (
                    <PartyRow
                      key={`e-${p.id}`}
                      party={p}
                      selected={value.employee_id === p.id}
                      onSelect={select}
                    />
                  ))}
              </CommandGroup>
            )}
          </CommandList>

          {/* Persistent create action, OUTSIDE the filtered list: a new
              employee's name often partially matches existing people (half the
              staff share a first name), so waiting for zero matches would hide
              the button exactly when it's needed. It only disappears when the
              typed name matches someone exactly — that's the duplicate guard. */}
          {canCreate && (
            <button
              type="button"
              onClick={create}
              className="flex w-full items-center gap-2 border-t px-3 py-2 text-start text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-inset"
            >
              <UserPlus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate" dir="auto">
                {t('fleetExpenses.party.create', { name: search.trim() })}
              </span>
            </button>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* -------------------------------------------------------------------------- */
/* SmartPartyField — the "to whom?" field with an exact-match history hint     */
/* -------------------------------------------------------------------------- */

/**
 * When the transaction's counterparty text was attributed to the same person
 * before, /parties/suggest returns them and this renders a PRE-SELECTED
 * suggestion card instead of the empty picker: the primary flow is just
 * confirming (saving uses the suggested ids), and "Someone else" swaps in the
 * normal PartyPicker (which keeps its create-employee footer).
 *
 * The suggestion never saves silently: the card is on screen the whole time
 * and saving still takes the form's explicit save tap. A suggestion whose kind
 * the category refuses (e.g. an employee for a drivers-only advance) is
 * treated as no suggestion at all.
 */
export function SmartPartyField({
  counterparty,
  value,
  onChange,
  required,
  disabled,
  suggest = true,
  labelledBy,
}: {
  /** The transaction's counterparty text — the lookup key. */
  counterparty?: string | null;
  value: PartyValue;
  onChange: (v: PartyValue) => void;
  required: PartyKind;
  disabled?: boolean;
  /** Pass false when the row already names a person — no second-guessing. */
  suggest?: boolean;
  /** id of the visible label naming this field. */
  labelledBy?: string;
}) {
  const { t } = useTranslation();
  const [manual, setManual] = React.useState(false);

  const trimmed = (counterparty ?? '').trim();
  const active = suggest && !manual && !disabled && trimmed.length > 0;
  const suggestionQuery = usePartySuggestion(active ? trimmed : '');

  const raw = suggestionQuery.data ?? null;
  const suggestion =
    raw && (required === 'either' || required === 'none' || raw.kind === required)
      ? raw
      : null;

  // Pre-select the suggested ids the moment the card shows. Visible, not
  // silent: the card names the person, and saving is still the user's tap.
  const valueEmpty = !value.driver_id && !value.employee_id;
  React.useEffect(() => {
    if (!active || !suggestion || !valueEmpty) return;
    onChange({
      driver_id: suggestion.driver_id ?? null,
      employee_id: suggestion.employee_id ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, suggestion?.driver_id, suggestion?.employee_id]);

  if (active && suggestionQuery.isLoading) {
    return <Skeleton className="h-[74px] w-full rounded-lg" />;
  }

  if (active && suggestion) {
    const Icon = suggestion.kind === 'driver' ? Truck : User;
    return (
      <div className="rounded-lg border bg-muted/40 p-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold" dir="auto">
              {suggestion.name}
            </span>
            <span className="block text-xs text-muted-foreground">
              {t('fleetExpenses.party.matchedTimes', { count: suggestion.times })}
            </span>
          </span>
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2.5 min-h-10 w-full sm:min-h-8 sm:w-auto"
          onClick={() => {
            setManual(true);
            onChange({ driver_id: null, employee_id: null });
          }}
        >
          {t('fleetExpenses.party.someoneElse')}
        </Button>
      </div>
    );
  }

  return (
    <PartyPicker
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      labelledBy={labelledBy}
    />
  );
}

function PartyRow({
  party,
  selected,
  onSelect,
}: {
  party: Party;
  selected: boolean;
  onSelect: (p: Party) => void;
}) {
  const Icon = party.kind === 'driver' ? Truck : User;
  return (
    <CommandItem value={`${party.name} ${party.kind}`} onSelect={() => onSelect(party)}>
      <Icon className="me-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="truncate" dir="auto">
        {party.name}
      </span>
      {selected && <Check className="ms-auto h-4 w-4 shrink-0" aria-hidden="true" />}
    </CommandItem>
  );
}
