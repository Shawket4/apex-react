import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { type ColumnDef } from '@tanstack/react-table';
import { Car as CarIcon, Clock, FileText, Paperclip, ShieldAlert, ShieldCheck, Users } from 'lucide-react';
import { useCars } from '@/entities/car/queries';
import { useDrivers } from '@/entities/driver/queries';
import {
  prefetchOwnerDocuments,
  useDocumentCatalogue,
  useDocumentsOverview,
} from '@/entities/document/queries';
import type { OwnerKind } from '@/entities/document/schemas';
import { DOCUMENT_STATUSES, type DocumentStatus } from '@/entities/document/status';
import { formatCairoDate } from '@/shared/lib/cairo';
import { matches } from '@/shared/lib/normalize';
import { preloadChunk } from '@/shared/lib/prefetch';
import { useIsMobile } from '@/shared/hooks/use-media-query';
import { Button } from '@/shared/ui/button';
import { ChipRadioGroup } from '@/shared/ui/chip-group';
import { DataTable } from '@/shared/ui/data-table';
import { EmptyState } from '@/shared/ui/empty-state';
import { SearchInput } from '@/shared/ui/search-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { StatCard } from '@/shared/ui/stat-card';
import { documentName, documentTypeName } from '@/widgets/documents/labels';
import { DocumentStatusBadge } from '@/widgets/documents/status-badge';
import { documentTypeIcon } from '@/widgets/documents/type-icon';
import {
  byUrgency,
  countByStatus,
  fleetDocuments,
  ownerDocumentsPath,
  type FleetDocument,
} from './rows';

type KindFilter = 'all' | OwnerKind;
type StatusFilter = 'all' | DocumentStatus;
const ALL_TYPES = 'all';

const KIND_ICON = { car: CarIcon, driver: Users } as const;

function ownerLabel(t: TFunction, row: FleetDocument): string {
  return row.ownerName || t('common.unknown');
}

function day(value: string | null, language: string): string {
  return value ? formatCairoDate(value, language) : '—';
}

function DocumentTitle({ row }: { row: FleetDocument }) {
  const { t } = useTranslation();
  const Icon = documentTypeIcon(row.typeKey);
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 truncate font-medium">{documentName(t, row.typeKey, row.label)}</span>
    </div>
  );
}

function Owner({ row }: { row: FleetDocument }) {
  const { t } = useTranslation();
  const Icon = KIND_ICON[row.kind];
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-sm">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="truncate" dir="auto">
        {ownerLabel(t, row)}
      </span>
    </span>
  );
}

/**
 * Every document in force across the fleet, most urgent first: what has
 * lapsed, what is about to, and whose it is. A row leads to its owner's
 * documents, which is where a paper is renewed.
 */
export function DocumentsOverview() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const carDocuments = useDocumentsOverview('car');
  const driverDocuments = useDocumentsOverview('driver');
  const { data: cars } = useCars();
  const { data: drivers } = useDrivers();
  const { data: catalogue } = useDocumentCatalogue();

  const [search, setSearch] = React.useState('');
  const [kind, setKind] = React.useState<KindFilter>('all');
  const [status, setStatus] = React.useState<StatusFilter>('all');
  const [typeKey, setTypeKey] = React.useState(ALL_TYPES);

  const rows = React.useMemo(() => {
    const plates = new Map((cars ?? []).map((car) => [car.ID, car.car_no_plate]));
    const names = new Map((drivers ?? []).map((driver) => [driver.ID, driver.name]));
    return [
      ...fleetDocuments('car', carDocuments.data ?? [], plates),
      ...fleetDocuments('driver', driverDocuments.data ?? [], names),
    ].sort(byUrgency);
  }, [carDocuments.data, driverDocuments.data, cars, drivers]);

  // Each filter's counts are of what the other filters leave, so a chip
  // never promises rows that choosing it would not show.
  const ofKind = React.useMemo(
    () => rows.filter((row) => kind === 'all' || row.kind === kind),
    [rows, kind],
  );
  const ofType = React.useMemo(
    () => ofKind.filter((row) => typeKey === ALL_TYPES || row.typeKey === typeKey),
    [ofKind, typeKey],
  );
  const statusCounts = React.useMemo(() => countByStatus(ofType), [ofType]);
  const visible = React.useMemo(
    () =>
      ofType.filter(
        (row) =>
          (status === 'all' || row.status === status) &&
          (!search.trim() ||
            matches(row.ownerName, search) ||
            matches(documentName(t, row.typeKey, row.label), search)),
      ),
    [ofType, status, search, t],
  );

  const totals = React.useMemo(() => countByStatus(rows), [rows]);
  const types = React.useMemo(
    () => (catalogue?.types ?? []).filter((type) => kind === 'all' || type.owner_kind === kind),
    [catalogue, kind],
  );

  const changeKind = (next: KindFilter) => {
    setKind(next);
    // A type belongs to one kind: keeping a driver's type while showing cars
    // would be an empty list with no visible reason.
    setTypeKey(ALL_TYPES);
  };

  const open = (row: FleetDocument) => navigate(ownerDocumentsPath(row.kind, row.ownerId));
  const warm = (row: FleetDocument) => {
    preloadChunk(row.kind === 'car' ? 'car-detail' : 'driver-detail');
    prefetchOwnerDocuments(queryClient, row.kind, row.ownerId);
  };

  const columns = React.useMemo<ColumnDef<FleetDocument, unknown>[]>(
    () => [
      {
        id: 'document',
        header: t('documents.fleet.columns.document'),
        accessorFn: (row) => documentName(t, row.typeKey, row.label),
        cell: ({ row }) => <DocumentTitle row={row.original} />,
      },
      {
        id: 'owner',
        header: t('documents.fleet.columns.owner'),
        accessorFn: (row) => row.ownerName,
        cell: ({ row }) => <Owner row={row.original} />,
      },
      {
        id: 'issueDate',
        header: t('documents.fields.issueDate'),
        accessorFn: (row) => row.issueDate ?? '',
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {day(row.original.issueDate, i18n.language)}
          </span>
        ),
      },
      {
        id: 'expiryDate',
        header: t('documents.fields.expiryDate'),
        // Time remaining, with the undated last: the question is what lapses next.
        accessorFn: (row) => row.days ?? Infinity,
        cell: ({ row }) => (
          <span className="tabular-nums">{day(row.original.expiryDate, i18n.language)}</span>
        ),
      },
      {
        id: 'status',
        header: t('common.status'),
        accessorFn: (row) => DOCUMENT_STATUSES.indexOf(row.status),
        cell: ({ row }) => <DocumentStatusBadge expiryDate={row.original.expiryDate} />,
      },
      {
        id: 'files',
        header: t('documents.fleet.columns.files'),
        accessorFn: (row) => row.fileCount,
        cell: ({ row }) => (
          <span className="flex items-center gap-1 tabular-nums text-muted-foreground">
            <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
            {row.original.fileCount}
          </span>
        ),
      },
    ],
    [t, i18n.language],
  );

  const loading = carDocuments.isLoading || driverDocuments.isLoading;
  const failed = carDocuments.isError || driverDocuments.isError;

  if (failed && rows.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-6 w-6" aria-hidden="true" />}
        title={t('documents.loadFailed')}
        action={
          <Button
            variant="outline"
            onClick={() => {
              void carDocuments.refetch();
              void driverDocuments.refetch();
            }}
          >
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  const empty = (
    <EmptyState
      icon={<FileText className="h-6 w-6" aria-hidden="true" />}
      title={rows.length === 0 ? t('documents.fleet.empty') : t('common.noResults')}
      description={rows.length === 0 ? t('documents.fleet.emptyDescription') : undefined}
    />
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('documents.fleet.stats.total')} value={rows.length} icon={FileText} tone="primary" />
        <StatCard label={t('documents.status.expired')} value={totals.expired} icon={ShieldAlert} tone="destructive" />
        <StatCard label={t('documents.status.expiring')} value={totals.expiring} icon={Clock} tone="warning" />
        <StatCard label={t('documents.status.valid')} value={totals.valid} icon={ShieldCheck} tone="success" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          id="documents-search"
          value={search}
          onChange={setSearch}
          placeholder={t('documents.fleet.searchPlaceholder')}
          className="sm:max-w-sm"
        />
        <Select value={typeKey} onValueChange={setTypeKey}>
          <SelectTrigger className="sm:w-64" aria-label={t('documents.fleet.typeFilter')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TYPES}>{t('documents.fleet.allTypes')}</SelectItem>
            {types.map((type) => (
              <SelectItem key={type.key} value={type.key}>
                {documentTypeName(t, type.key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <ChipRadioGroup<KindFilter>
          label={t('documents.fleet.kindFilter')}
          value={kind}
          onChange={changeKind}
          options={[
            { value: 'all', label: t('documents.fleet.kinds.all'), count: rows.length },
            {
              value: 'car',
              label: t('documents.fleet.kinds.car'),
              icon: <CarIcon className="h-3.5 w-3.5" />,
              count: rows.filter((row) => row.kind === 'car').length,
            },
            {
              value: 'driver',
              label: t('documents.fleet.kinds.driver'),
              icon: <Users className="h-3.5 w-3.5" />,
              count: rows.filter((row) => row.kind === 'driver').length,
            },
          ]}
        />
        <ChipRadioGroup<StatusFilter>
          label={t('common.status')}
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: t('documents.fleet.allStatuses'), count: ofType.length },
            ...DOCUMENT_STATUSES.map((value) => ({
              value,
              label: t(`documents.status.${value}`),
              count: statusCounts[value],
            })),
          ]}
        />
      </div>

      {isMobile ? (
        <MobileList rows={visible} loading={loading} empty={empty} onIntent={warm} />
      ) : (
        <DataTable
          columns={columns}
          data={visible}
          loading={loading}
          onRowClick={open}
          onRowIntent={warm}
          emptyState={empty}
        />
      )}
    </div>
  );
}

interface MobileListProps {
  rows: FleetDocument[];
  loading: boolean;
  empty: React.ReactNode;
  onIntent: (row: FleetDocument) => void;
}

/** The same rows as cards: six columns do not survive a phone. */
function MobileList({ rows, loading, empty, onIntent }: MobileListProps) {
  const { t, i18n } = useTranslation();

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-[104px] w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) return <>{empty}</>;

  return (
    <ul className="grid gap-2">
      {rows.map((row) => (
        <li key={row.key}>
          <Link
            to={ownerDocumentsPath(row.kind, row.ownerId)}
            onTouchStart={() => onIntent(row)}
            onFocus={() => onIntent(row)}
            className="block rounded-lg border bg-card p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-start justify-between gap-3">
              <DocumentTitle row={row} />
              <DocumentStatusBadge expiryDate={row.expiryDate} className="shrink-0" />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <Owner row={row} />
              <span className="shrink-0 tabular-nums">
                {row.expiryDate
                  ? t('documents.card.expires', { date: day(row.expiryDate, i18n.language) })
                  : t('documents.card.noExpiry')}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
