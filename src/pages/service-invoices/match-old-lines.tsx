import * as React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  FileSearch,
  Info,
  ListChecks,
  Loader2,
  RefreshCw,
  Search,
  ServerOff,
} from 'lucide-react';
import { isMaintConfigured } from '@/entities/maintenance/api';
import { localName } from '@/entities/maintenance/lib';
import { searchWordings } from '@/entities/legacy-match/lib';
import {
  useDecideWording,
  useImportLegacy,
  useMaintCategories,
  useUnmatchedWordings,
} from '@/entities/legacy-match/queries';
import type { MaintCategory, UnmatchedRow } from '@/entities/legacy-match/schemas';
import { ApiError, extractErrorMessage } from '@/shared/api/errors';
import { formatNumber } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { NativeSelect } from '@/shared/ui/native-select';
import { PageShell } from '@/shared/ui/page-shell';
import { SearchInput } from '@/shared/ui/search-input';
import { Skeleton } from '@/shared/ui/skeleton';
import { StatCard } from '@/shared/ui/stat-card';
import { toast } from '@/shared/ui/toast';
import { maintDate } from '@/widgets/maintenance/maint-date';
import { MaintError, MaintNotConfigured } from '@/widgets/maintenance/maint-states';

/** The server sends at most this many wordings at a time. */
const SERVER_CAP = 300;

function BackToInvoices() {
  const { t } = useTranslation();
  return (
    <Button variant="outline" size="sm" asChild>
      <Link to="/service-invoices">
        <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
        {t('legacyMatch.backToInvoices')}
      </Link>
    </Button>
  );
}

/** Why anyone should spend ten minutes on this list. */
function Why() {
  const { t } = useTranslation();
  return (
    <div role="note" className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <p className="font-medium">{t('legacyMatch.why.title')}</p>
        <p className="text-muted-foreground">{t('legacyMatch.why.body')}</p>
        <p className="text-muted-foreground">{t('legacyMatch.why.how')}</p>
      </div>
    </div>
  );
}

/** "Read invoices again", and the one answer that is not an error: not set up. */
function ReadAgain() {
  const { t } = useTranslation();
  const importNow = useImportLegacy();
  const outcome = importNow.data;

  const run = () => {
    importNow.mutate(undefined, {
      onSuccess: (result) => {
        if (result.kind !== 'done') return;
        toast.success(
          t('legacyMatch.import.done', {
            lines: formatNumber(result.result.lines),
            recognised: formatNumber(result.result.recognised),
            unrecognised: formatNumber(result.result.unrecognised),
          }),
        );
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError && error.status === 403
            ? t('legacyMatch.errors.forbidden')
            : extractErrorMessage(error, t('legacyMatch.import.failed')),
        );
      },
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">{t('legacyMatch.import.hint')}</p>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={run}
          disabled={importNow.isPending}
        >
          {importNow.isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw aria-hidden="true" />
          )}
          {importNow.isPending ? t('legacyMatch.import.reading') : t('legacyMatch.import.button')}
        </Button>
      </div>
      {outcome?.kind === 'not-set-up' && !importNow.isPending && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm"
        >
          <ServerOff className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="font-medium">{t('legacyMatch.import.notSetUpTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('legacyMatch.import.notSetUpBody')}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface WordingRowProps {
  row: UnmatchedRow;
  categories: MaintCategory[];
  /** False while the types are loading or could not be loaded. */
  typesReady: boolean;
  onDecide: (row: UnmatchedRow, categoryId: string | null) => void;
}

function WordingRow({ row, categories, typesReady, onDecide }: WordingRowProps) {
  const { t, i18n } = useTranslation();
  const [categoryId, setCategoryId] = React.useState('');
  const selectId = React.useId();
  return (
    <li className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="break-words text-sm font-medium" dir="auto">
          {row.text?.trim() || row.norm_text}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums text-muted-foreground">
          <span>{t('legacyMatch.row.lines', { n: formatNumber(row.lines) })}</span>
          <span>{t('legacyMatch.row.trucks', { n: formatNumber(row.vehicles) })}</span>
          {row.last_at && (
            <span>{t('legacyMatch.row.last', { date: maintDate(row.last_at, i18n.language) })}</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor={selectId} className="sr-only">
          {t('legacyMatch.row.typeLabel')}
        </label>
        <NativeSelect
          id={selectId}
          className="sm:w-52"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          disabled={!typesReady}
        >
          <option value="">{t('legacyMatch.row.choose')}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {localName(category.name_ar, category.name_en, i18n.language) ?? category.id}
            </option>
          ))}
        </NativeSelect>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="flex-1 sm:flex-none"
            disabled={!categoryId}
            onClick={() => onDecide(row, categoryId)}
          >
            <Check aria-hidden="true" />
            {t('legacyMatch.row.match')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => onDecide(row, null)}
          >
            <Ban aria-hidden="true" />
            {t('legacyMatch.row.ignore')}
          </Button>
        </div>
      </div>
    </li>
  );
}

/**
 * Old invoice wording the garage system could not match to a maintenance
 * type. A manager says what each one was (or that it is not maintenance), and
 * the due clock then counts the work those invoices recorded.
 */
export default function MatchOldLinesPage() {
  const { t } = useTranslation();
  const unmatched = useUnmatchedWordings();
  const categories = useMaintCategories();
  const decide = useDecideWording();
  const [search, setSearch] = React.useState('');

  const rows = unmatched.data?.rows;
  const stats = unmatched.data?.stats;
  const shown = React.useMemo(() => searchWordings(rows ?? [], search), [rows, search]);
  const icon = <FileSearch className="h-5 w-5" aria-hidden="true" />;

  const onDecide = (row: UnmatchedRow, categoryId: string | null) => {
    decide.mutate(
      { norm_text: row.norm_text, category_id: categoryId },
      {
        onError: (error) => {
          const status = error instanceof ApiError ? error.status : undefined;
          toast.error(
            status === 403
              ? t('legacyMatch.errors.forbidden')
              : status === 400
                ? t('legacyMatch.errors.unknownType')
                : status === 404
                  ? t('legacyMatch.errors.gone')
                  : extractErrorMessage(error, t('legacyMatch.errors.generic')),
          );
        },
      },
    );
  };

  return (
    <PageShell
      title={t('legacyMatch.title')}
      description={t('legacyMatch.subtitle')}
      icon={icon}
      actions={<BackToInvoices />}
    >
      {!isMaintConfigured ? (
        <MaintNotConfigured />
      ) : (
        <div className="flex flex-col gap-3">
          <Why />

          {unmatched.isError ? (
            <MaintError
              onRetry={() => void unmatched.refetch()}
              retrying={unmatched.isFetching}
            />
          ) : unmatched.isLoading || !rows || !stats ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
              </div>
              <Skeleton className="h-64 rounded-lg" />
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard
                  label={t('legacyMatch.stats.lines')}
                  value={formatNumber(stats.lines)}
                  icon={ListChecks}
                />
                <StatCard
                  label={t('legacyMatch.stats.recognised')}
                  value={formatNumber(stats.recognised)}
                  icon={CheckCircle2}
                  tone="success"
                />
                <StatCard
                  label={t('legacyMatch.stats.ignored')}
                  value={formatNumber(stats.ignored)}
                  icon={Ban}
                />
              </div>

              <ReadAgain />

              {rows.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
                  title={
                    stats.lines === 0
                      ? t('legacyMatch.empty.noLinesTitle')
                      : t('legacyMatch.empty.allDoneTitle')
                  }
                  description={
                    stats.lines === 0
                      ? t('legacyMatch.empty.noLinesDescription')
                      : t('legacyMatch.empty.allDoneDescription')
                  }
                />
              ) : (
                <Card>
                  <CardContent className="flex flex-col gap-3 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-0.5">
                        <h2 className="text-sm font-semibold">
                          {t('legacyMatch.list.title', { n: formatNumber(rows.length) })}
                        </h2>
                        {rows.length >= SERVER_CAP && (
                          <p className="text-xs text-muted-foreground">
                            {t('legacyMatch.list.capped', { n: SERVER_CAP })}
                          </p>
                        )}
                      </div>
                      <SearchInput
                        id="legacy-match-search"
                        className="sm:w-72"
                        value={search}
                        onChange={setSearch}
                        placeholder={t('legacyMatch.list.search')}
                      />
                    </div>
                    {categories.isError && (
                      <p className="text-xs text-warning">{t('legacyMatch.list.typesFailed')}</p>
                    )}
                    {shown.length === 0 ? (
                      <EmptyState
                        icon={<Search className="h-5 w-5" aria-hidden="true" />}
                        title={t('legacyMatch.empty.searchTitle')}
                        description={t('legacyMatch.empty.searchDescription')}
                        action={
                          <Button variant="outline" onClick={() => setSearch('')}>
                            {t('common.clearFilters')}
                          </Button>
                        }
                      />
                    ) : (
                      <ul className="divide-y rounded-lg border">
                        {shown.map((row) => (
                          <WordingRow
                            key={row.norm_text}
                            row={row}
                            categories={categories.data ?? []}
                            typesReady={categories.isSuccess}
                            onDecide={onDecide}
                          />
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </PageShell>
  );
}
