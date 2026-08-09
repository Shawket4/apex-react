import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown, UserPlus, User, Truck } from 'lucide-react';

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
import { cn } from '@/shared/lib/cn';
import {
  findExistingParty,
  useCreateEmployee,
  useParties,
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
}: {
  value: PartyValue;
  onChange: (v: PartyValue) => void;
  /** From the category: which kinds of person are acceptable. */
  required: PartyKind;
  disabled?: boolean;
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
          disabled={disabled}
          // Full width so it is comfortably tappable on a phone.
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.name : t('fleetExpenses.party.placeholder')}
          </span>
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter>
          <CommandInput
            placeholder={t('fleetExpenses.party.search')}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {canCreate ? (
                <button
                  type="button"
                  onClick={create}
                  className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-accent"
                >
                  <UserPlus className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {t('fleetExpenses.party.create', { name: search.trim() })}
                  </span>
                </button>
              ) : (
                <span className="block px-3 py-2 text-sm text-muted-foreground">
                  {t('fleetExpenses.party.noMatch')}
                </span>
              )}
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
        </Command>
      </PopoverContent>
    </Popover>
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
      <Icon className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate" dir="auto">
        {party.name}
      </span>
      {selected && <Check className="ms-auto h-4 w-4 shrink-0" />}
    </CommandItem>
  );
}
