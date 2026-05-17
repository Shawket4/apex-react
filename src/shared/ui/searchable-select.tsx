import * as React from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { normalize } from '@/shared/lib/normalize';
import { Button } from './button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { EmptyState } from './empty-state';
import type { SelectOption } from '@/shared/types';

interface SearchableSelectProps<T extends string | number> {
  options: SelectOption<T>[];
  value?: T | null;
  onChange: (value: T) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  /** Lock width so trigger width matches popover content; on by default */
  matchTriggerWidth?: boolean;
  /** Allow entering custom values not present in the options list */
  allowCustom?: boolean;
}

export function SearchableSelect<T extends string | number>({
  options,
  value,
  onChange,
  placeholder,
  emptyText,
  className,
  disabled,
  id,
  matchTriggerWidth = true,
  allowCustom = false,
}: SearchableSelectProps<T>) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = React.useState<number>();

  React.useEffect(() => {
    if (open && matchTriggerWidth && triggerRef.current) {
      setTriggerWidth(triggerRef.current.getBoundingClientRect().width);
    }
  }, [open, matchTriggerWidth]);

  // Clear search when closing
  React.useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  const selected = options.find((o) => o.value === value);

  // Custom filter function using our comprehensive normalization
  const filteredOptions = React.useMemo(() => {
    const normalizedSearch = normalize(search);

    const filtered = options.filter((option) => {
      if (!normalizedSearch) return true;

      // Search in label
      const normalizedLabel = normalize(option.label);
      if (normalizedLabel.includes(normalizedSearch)) {
        return true;
      }

      // Search in description if it exists
      if (option.description) {
        const normalizedDescription = normalize(option.description);
        if (normalizedDescription.includes(normalizedSearch)) {
          return true;
        }
      }

      // Search in value (converted to string)
      const normalizedValue = normalize(String(option.value));
      if (normalizedValue.includes(normalizedSearch)) {
        return true;
      }

      return false;
    });

    return filtered;
  }, [options, search]);

  const hasExactMatch = React.useMemo(() => {
    const normalizedSearch = normalize(search);
    return options.some((o) => normalize(o.label) === normalizedSearch);
  }, [options, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">
            {selected
              ? selected.label
              : value !== null && value !== undefined && value !== ''
                ? String(value)
                : (placeholder ?? t('common.selectOne'))}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        style={triggerWidth ? { width: triggerWidth } : undefined}
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('common.searchPlaceholder')}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty className="p-0">
              <EmptyState
                lottieSrc="/animations/no_results.json"
                lottieWidth={70}
                lottieHeight={70}
                title={emptyText ?? t('common.noResults')}
                className="border-0 bg-transparent py-4 shadow-none"
              />
            </CommandEmpty>
            <CommandGroup>
              {allowCustom && search.trim() && !hasExactMatch && (
                <CommandItem
                  value={search}
                  onSelect={() => {
                    onChange(search as T);
                    setOpen(false);
                  }}
                  className="text-primary font-medium"
                >
                  <Plus className="me-2 h-4 w-4" />
                  <span>
                    {t('common.use')} "{search}"
                  </span>
                </CommandItem>
              )}
              {filteredOptions.map((option) => (
                <CommandItem
                  key={String(option.value)}
                  value={String(option.value)}
                  disabled={option.disabled}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'me-2 h-4 w-4',
                      option.value === value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-muted-foreground text-start">
                        {option.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}