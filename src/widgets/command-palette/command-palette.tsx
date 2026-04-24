import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User,
  Receipt,
  CreditCard,
  Plus,
  ChevronRight,
  Zap,
  Navigation,
  Clock,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/shared/ui/command';
import { Badge } from '@/shared/ui/badge';
import { NAV_SECTIONS } from '@/widgets/sidebar/sidebar';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { PERMISSION_LEVELS } from '@/shared/config/constants';
import { useDrivers } from '@/entities/driver/queries';
import type { Driver } from '@/entities/driver/schemas';

// ─── Constants ────────────────────────────────────────────────────────────────

const RECENT_KEY = 'cmd-palette:recent';
const MAX_RECENT = 5;

// ─── Types ────────────────────────────────────────────────────────────────────

type Page =
  | { type: 'root' }
  | { type: 'driver'; driver: Driver };

interface RecentItem {
  label: string;
  path: string;
  ts: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRecent(): RecentItem[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function pushRecent(item: Omit<RecentItem, 'ts'>) {
  const prev = getRecent().filter((r) => r.path !== item.path);
  const next: RecentItem[] = [{ ...item, ts: Date.now() }, ...prev].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return { open, setOpen };
}

// ─── Kbd ─────────────────────────────────────────────────────────────────────

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="pointer-events-none inline-flex h-5 select-none items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ page }: { page: Page }) {
  const { t } = useTranslation();
  if (page.type === 'root') return null;

  return (
    <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2.5">
      {/* Driver avatar */}
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <User className="h-3.5 w-3.5 text-primary" />
      </div>

      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">{t('nav.drivers')}</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
        <span className="font-semibold text-foreground">{page.driver.name}</span>
      </div>

      <div className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
        <Kbd>⌫</Kbd>
        <span>to go back</span>
      </div>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function PaletteFooter({ page }: { page: Page }) {
  return (
    <div className="flex items-center gap-4 border-t border-border bg-muted/20 px-4 py-2.5 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Kbd>↑↓</Kbd>
        <span>navigate</span>
      </span>
      <span className="flex items-center gap-1.5">
        <Kbd>↵</Kbd>
        <span>select</span>
      </span>
      {page.type !== 'root' && (
        <span className="flex items-center gap-1.5">
          <Kbd>⌫</Kbd>
          <span>back</span>
        </span>
      )}
      <span className="ml-auto flex items-center gap-1.5">
        <Kbd>esc</Kbd>
        <span>{page.type !== 'root' ? 'back' : 'close'}</span>
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { atLeast } = usePermissions();

  const { data: drivers = [] } = useDrivers();

  const [page, setPage] = React.useState<Page>({ type: 'root' });
  const [search, setSearch] = React.useState('');
  const [recent, setRecent] = React.useState<RecentItem[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const canManage = atLeast(PERMISSION_LEVELS.MANAGER);

  // Sync recent on open
  React.useEffect(() => {
    if (open) setRecent(getRecent());
  }, [open]);

  // Reset on close
  React.useEffect(() => {
    if (!open) {
      const id = setTimeout(() => {
        setPage({ type: 'root' });
        setSearch('');
      }, 150);
      return () => clearTimeout(id);
    }
  }, [open]);

  // Backspace → go back; Escape in sub-page → go back (not close)
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (page.type === 'root') return;

      if (e.key === 'Backspace' && search === '') {
        e.preventDefault();
        setPage({ type: 'root' });
        setSearch('');
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setPage({ type: 'root' });
        setSearch('');
      }
    },
    [search, page.type],
  );

  const go = React.useCallback(
    (path: string, label: string) => {
      pushRecent({ label, path });
      onOpenChange(false);
      navigate(path);
    },
    [navigate, onOpenChange],
  );

  const openDriver = React.useCallback((driver: Driver) => {
    setPage({ type: 'driver', driver });
    setSearch('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const visibleSections = React.useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => !item.minPermission || atLeast(item.minPermission as 1 | 2 | 3 | 4),
        ),
      })).filter((s) => s.items.length > 0),
    [atLeast],
  );

  const placeholder =
    page.type === 'driver'
      ? `Actions for ${page.driver.name}…`
      : t('common.searchPlaceholder');

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && page.type !== 'root') return; // let handleKeyDown manage ESC in sub-pages
        onOpenChange(next);
      }}
      // Widen and heighten the dialog beyond the shadcn default
    >
      <Breadcrumb page={page} />

      <CommandInput
        ref={inputRef}
        placeholder={placeholder}
        value={search}
        onValueChange={setSearch}
        onKeyDown={handleKeyDown}
        // Taller input with slightly larger text
        className="h-14 text-base [&_svg]:h-5 [&_svg]:w-5"
      />

      <CommandList className="max-h-[400px] overflow-y-auto">
        <CommandEmpty className="py-10 text-center text-sm text-muted-foreground">
          {t('common.noResults')}
        </CommandEmpty>

        {/* ── ROOT PAGE ── */}
        {page.type === 'root' && (
          <>
            {/* Recent — only when not searching */}
            {recent.length > 0 && !search && (
              <>
                <CommandGroup
                  heading={
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      Recent
                    </span>
                  }
                >
                  {recent.map((item) => (
                    <CommandItem
                      key={`recent-${item.path}`}
                      value={`recent ${item.label} ${item.path}`}
                      onSelect={() => go(item.path, item.label)}
                      className="group flex items-center gap-2 px-4 py-2.5"
                    >
                      <Navigation className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{item.label}</span>
                      <span className="shrink-0 text-xs text-muted-foreground/50 truncate max-w-[160px]">
                        {item.path}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-aria-selected:opacity-100" />
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Nav sections */}
            {visibleSections.map((section) => (
              <CommandGroup
                key={section.titleKey}
                heading={t(section.titleKey)}
              >
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.to}
                      value={`${t(section.titleKey)} ${t(item.labelKey)} ${item.to}`}
                      onSelect={() => go(item.to, `${t(section.titleKey)} › ${t(item.labelKey)}`)}
                      className="group flex items-center gap-2 px-4 py-2.5"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>{t(item.labelKey)}</span>
                      <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-aria-selected:opacity-100" />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}

            {/* Drivers */}
            {drivers.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading={t('nav.drivers')}>
                  {drivers.map((driver) => (
                    <CommandItem
                      key={`driver-${driver.ID}`}
                      value={`${t('nav.drivers')} ${driver.name} ${driver.mobile_number ?? ''}`}
                      onSelect={() => openDriver(driver)}
                      className="group flex items-center gap-2 px-4 py-2.5"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="flex-1 font-medium">{driver.name}</span>
                      {driver.mobile_number && (
                        <span className="shrink-0 text-xs text-muted-foreground/60">
                          {driver.mobile_number}
                        </span>
                      )}
                      <span className="ml-1 flex shrink-0 items-center gap-0.5 text-[11px] text-muted-foreground opacity-0 transition-opacity group-aria-selected:opacity-100">
                        actions <ChevronRight className="h-3 w-3" />
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </>
        )}

        {/* ── DRIVER SUB-PAGE ── */}
        {page.type === 'driver' && (
          <>
            {/* ① Quick Actions — top, auto-focused on Enter */}
            {canManage && (
              <CommandGroup
                heading={
                  <span className="flex items-center gap-1.5">
                    <Zap className="h-3 w-3" />
                    Quick Actions
                  </span>
                }
              >
                <CommandItem
                  value="add new loan create"
                  onSelect={() =>
                    go(
                      `/drivers/${page.driver.ID}/loans/new`,
                      `${page.driver.name} › New Loan`,
                    )
                  }
                  className="group flex items-center gap-3 px-4 py-3"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/20">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">{t('driverLoans.addLoan')}</span>
                    <span className="text-xs text-muted-foreground">
                      {t('nav.drivers')} › {page.driver.name}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="ml-auto shrink-0 border-primary/25 px-2 py-0.5 text-[10px] text-primary/60 opacity-0 transition-opacity group-aria-selected:opacity-100"
                  >
                    create
                  </Badge>
                </CommandItem>

                <CommandItem
                  value="add new expense create"
                  onSelect={() =>
                    go(
                      `/drivers/${page.driver.ID}/expenses/new`,
                      `${page.driver.name} › New Expense`,
                    )
                  }
                  className="group flex items-center gap-3 px-4 py-3"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/20">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">{t('driverExpenses.addExpense')}</span>
                    <span className="text-xs text-muted-foreground">
                      {t('nav.drivers')} › {page.driver.name}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="ml-auto shrink-0 border-primary/25 px-2 py-0.5 text-[10px] text-primary/60 opacity-0 transition-opacity group-aria-selected:opacity-100"
                  >
                    create
                  </Badge>
                </CommandItem>
              </CommandGroup>
            )}

            <CommandSeparator />

            {/* ② View — loans, expenses, overview */}
            <CommandGroup heading="View">
              <CommandItem
                value="loans view list credit"
                onSelect={() =>
                  go(`/drivers/${page.driver.ID}/loans`, `${page.driver.name} › Loans`)
                }
                className="group flex items-center gap-2 px-4 py-2.5"
              >
                <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{t('driverLoans.title')}</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-aria-selected:opacity-100" />
              </CommandItem>

              <CommandItem
                value="expenses view list receipt"
                onSelect={() =>
                  go(`/drivers/${page.driver.ID}/expenses`, `${page.driver.name} › Expenses`)
                }
                className="group flex items-center gap-2 px-4 py-2.5"
              >
                <Receipt className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{t('driverExpenses.title')}</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-aria-selected:opacity-100" />
              </CommandItem>

              <CommandItem
                value="overview profile details driver"
                onSelect={() =>
                  go(`/drivers/${page.driver.ID}`, `${page.driver.name} › Overview`)
                }
                className="group flex items-center gap-2 px-4 py-2.5"
              >
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{t('nav.overview')}</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-aria-selected:opacity-100" />
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>

      <PaletteFooter page={page} />
    </CommandDialog>
  );
}