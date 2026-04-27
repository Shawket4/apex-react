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

  MapPin,
  Droplet,
  Car,
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
import { PERMISSION_LEVELS } from '@/shared/config/constants';
import { useCars } from '@/entities/car/queries';
import { useDrivers } from '@/entities/driver/queries';
import { useCompanies, useTerminals } from '@/entities/mapping/queries';
import type { Driver } from '@/entities/driver/schemas';
import { usePermissions } from '@/shared/hooks/use-permissions';

// ─── Types ────────────────────────────────────────────────────────────────────

type Page =
  | { type: 'root' }
  | { type: 'driver'; driver: Driver }
  | { type: 'fuel' }
  | { type: 'fuel-terminals'; company: string }
  | { type: 'fuel-up' };

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
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

  let title = '';
  let subTitle = '';
  let Icon = User;

  if (page.type === 'driver') {
    title = t('nav.drivers');
    subTitle = page.driver.name;
    Icon = User;
  } else if (page.type === 'fuel') {
    title = t('commandPalette.quickAddTrip');
    subTitle = t('commandPalette.selectCompany');
    Icon = Zap;
  } else if (page.type === 'fuel-terminals') {
    title = t('commandPalette.quickAddTrip');
    subTitle = page.company;
    Icon = Zap;
  } else if (page.type === 'fuel-up') {
    title = t('fuelEvents.title');
    subTitle = t('fuelEvents.fields.selectCar');
    Icon = Droplet;
  }

  return (
    <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2.5">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>

      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">{title}</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
        <span className="font-semibold text-foreground">{subTitle}</span>
      </div>

      <div className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
        <Kbd>⌫</Kbd>
        <span>{t('commandPalette.goBack')}</span>
      </div>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function PaletteFooter({ page }: { page: Page }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-4 border-t border-border bg-muted/20 px-4 py-2.5 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Kbd>↑↓</Kbd>
        <span>{t('commandPalette.navigate')}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <Kbd>↵</Kbd>
        <span>{t('commandPalette.select')}</span>
      </span>
      {page.type !== 'root' && (
        <span className="flex items-center gap-1.5">
          <Kbd>⌫</Kbd>
          <span>{t('commandPalette.back')}</span>
        </span>
      )}
      <span className="ml-auto flex items-center gap-1.5">
        <Kbd>esc</Kbd>
        <span>{page.type !== 'root' ? t('commandPalette.back') : t('commandPalette.close')}</span>
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

  const { data: companiesResp } = useCompanies();
  const { data: terminalsResp } = useTerminals(
    page.type === 'fuel-terminals' ? page.company : '',
    { enabled: page.type === 'fuel-terminals' },
  );
  const { data: cars = [] } = useCars();

  const companies = companiesResp?.data ?? [];
  const terminals = terminalsResp?.data ?? [];
  const inputRef = React.useRef<HTMLInputElement>(null);

  const canManage = atLeast(PERMISSION_LEVELS.MANAGER);

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
    (path: string) => {
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
      ? t('commandPalette.actionsFor', { name: page.driver.name })
      : page.type === 'fuel'
      ? t('commandPalette.searchCompanies')
      : page.type === 'fuel-terminals'
      ? t('commandPalette.searchTerminals', { company: page.company })
      : page.type === 'fuel-up'
      ? t('fuelEvents.searchPlaceholder')
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
            {/* Quick Actions (Trips) */}
            <CommandGroup
              heading={
                <span className="flex items-center gap-1.5">
                  <Receipt className="h-3 w-3" />
                  {t('nav.trips')}
                </span>
              }
            >
              <CommandItem
                value="trips quick add trip create fuel"
                onSelect={() => {
                  setPage({ type: 'fuel' });
                  setSearch('');
                }}
                className="group flex items-center gap-2 px-4 py-2.5"
              >
                <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{t('commandPalette.quickAddTrip')}</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-aria-selected:opacity-100" />
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />

            {/* Quick Actions (Fuel Events) */}
            <CommandGroup
              heading={
                <span className="flex items-center gap-1.5">
                  <Droplet className="h-3 w-3" />
                  {t('nav.fuelEvents')}
                </span>
              }
            >
              <CommandItem
                value="fuel events quick fuel up create car"
                onSelect={() => {
                  setPage({ type: 'fuel-up' });
                  setSearch('');
                }}
                className="group flex items-center gap-2 px-4 py-2.5"
              >
                <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{t('fuelEvents.addEvent')}</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-aria-selected:opacity-100" />
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />





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
                      onSelect={() => go(item.to)}
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

            {/* Drivers — only when searching to avoid clutter */}
            {drivers.length > 0 && search && (
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
                    go(`/drivers/${page.driver.ID}/loans/new`)
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
                    go(`/drivers/${page.driver.ID}/expenses/new`)
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
                  go(`/drivers/${page.driver.ID}/loans`)
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
                  go(`/drivers/${page.driver.ID}/expenses`)
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
                  go(`/drivers/${page.driver.ID}`)
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
        {/* ── FUEL: COMPANY SELECTION ── */}
        {page.type === 'fuel' && (
          <CommandGroup heading={t('commandPalette.selectCompany')}>
            {companies.map((company) => (
              <CommandItem
                key={company}
                value={company}
                onSelect={() => {
                  setPage({ type: 'fuel-terminals', company });
                  setSearch('');
                }}
                className="group flex items-center gap-2 px-4 py-2.5"
              >
                <Navigation className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{company}</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-aria-selected:opacity-100" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* ── FUEL: TERMINAL SELECTION ── */}
        {page.type === 'fuel-terminals' && (
          <CommandGroup heading={t('commandPalette.searchTerminals', { company: page.company })}>
            {terminals.map((terminal) => (
              <CommandItem
                key={terminal}
                value={terminal}
                onSelect={() =>
                  go(
                    `/trips/new?company=${encodeURIComponent(page.company)}&terminal=${encodeURIComponent(terminal)}`
                  )
                }
                className="group flex items-center gap-2 px-4 py-2.5"
              >
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{terminal}</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-aria-selected:opacity-100" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {/* ── FUEL UP: CAR SELECTION ── */}
        {page.type === 'fuel-up' && (
          <CommandGroup heading={t('fuelEvents.fields.selectCar')}>
            {cars.map((car) => (
              <CommandItem
                key={car.ID}
                value={`${car.car_no_plate} ${car.ID}`}
                onSelect={() =>
                  go(`/fuel-events/new?carId=${car.ID}`)
                }
                className="group flex items-center gap-2 px-4 py-2.5"
              >
                <Car className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{car.car_no_plate}</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-aria-selected:opacity-100" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>

      <PaletteFooter page={page} />
    </CommandDialog>
  );
}