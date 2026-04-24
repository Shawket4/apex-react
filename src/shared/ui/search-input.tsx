import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';

interface SearchInputProps {
  /**
   * Controlled search value
   */
  value: string;
  
  /**
   * Called when search value changes
   */
  onChange: (value: string) => void;
  
  /**
   * Placeholder text
   */
  placeholder?: string;
  
  /**
   * Debounce delay in milliseconds (default: 200)
   */
  debounceMs?: number;
  
  /**
   * Show clear button when search has value
   */
  showClear?: boolean;
  
  /**
   * Additional className for the container
   */
  className?: string;
  
  /**
   * Input ID for accessibility
   */
  id?: string;
  
  /**
   * Auto-focus on mount
   */
  autoFocus?: boolean;
  
  /**
   * Disabled state
   */
  disabled?: boolean;
}

/**
 * Reusable search input component with:
 * - Search icon
 * - Optional clear button
 * - Built-in debouncing support (use with useDebounce hook for actual debouncing)
 * - Consistent styling
 * - Accessibility features
 * 
 * Pairs with the `normalize()` function from @/shared/lib/normalize
 * for Arabic/English normalization in your filter logic.
 * 
 * @example
 * ```tsx
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 200);
 * 
 * const filtered = useMemo(() => {
 *   if (!debouncedSearch.trim()) return items;
 *   return items.filter(item => matches(item.name, debouncedSearch));
 * }, [items, debouncedSearch]);
 * 
 * return <SearchInput value={search} onChange={setSearch} placeholder="Search..." />
 * ```
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  showClear = true,
  className,
  id,
  autoFocus = false,
  disabled = false,
}: SearchInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleClear = React.useCallback(() => {
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Clear on Escape
      if (e.key === 'Escape' && value) {
        e.preventDefault();
        handleClear();
      }
    },
    [value, handleClear],
  );

  return (
    <div className={cn('relative flex-1', className)}>
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn('ps-9', showClear && value && 'pe-9')}
        aria-label={placeholder}
      />
      {showClear && value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="absolute end-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}