import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, ChevronDown, History, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { cn } from '@/shared/lib/cn';
import type { PricingCompany, PricingRule } from '@/entities/pricing/schemas';
import { PricingRuleDetails } from './pricing-rule-details';
import {
  formatDay,
  formatVat,
  rateSummary,
  rentalSummary,
  versionStatus,
  type VersionStatus,
} from './pricing-format';

interface Props {
  company: PricingCompany;
  today: string;
  canEdit: boolean;
  onNewVersion: () => void;
  onReprice: () => void;
  onDeleteVersion: (rule: PricingRule) => void;
}

const STATUS_VARIANT: Record<VersionStatus, 'success' | 'warning' | 'outline'> = {
  current: 'success',
  scheduled: 'warning',
  past: 'outline',
};

/**
 * One company's pricing: the version in force, then every version as a
 * timeline, newest first. Read-only at permission 3; permission 4 adds a new
 * version, re-prices, and deletes a version that has not started yet.
 */
export function PricingCompanyCard({
  company,
  today,
  canEdit,
  onNewVersion,
  onReprice,
  onDeleteVersion,
}: Props) {
  const { t, i18n } = useTranslation();
  const current = company.rules.find((r) => r.id === company.current_rule_id);
  const scheduled = company.rules.filter((r) => r.effective_from > today);

  return (
    <Card className="overflow-hidden" data-testid={`pricing-company-${company.company}`}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0 space-y-1">
          <h2 className="truncate text-base font-semibold" dir="auto">
            {company.company}
          </h2>
          <p className="text-[12.5px] text-muted-foreground">
            {current
              ? t('pricing.card.inForceSince', { date: formatDay(current.effective_from, i18n.language) })
              : t('pricing.card.noCurrent')}
          </p>
          {scheduled.length > 0 && (
            <p className="flex items-center gap-1.5 text-[12.5px] text-warning">
              <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t('pricing.card.scheduled', {
                date: formatDay(scheduled[scheduled.length - 1].effective_from, i18n.language),
              })}
            </p>
          )}
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onReprice}>
              <RefreshCw />
              {t('pricing.actions.reprice')}
            </Button>
            <Button size="sm" onClick={onNewVersion}>
              <Plus />
              {t('pricing.actions.newVersion')}
            </Button>
          </div>
        )}
      </header>

      <div className="px-4 py-4">
        {current ? (
          <PricingRuleDetails rule={current} />
        ) : (
          <p className="text-sm text-muted-foreground">{t('pricing.card.noCurrentHint')}</p>
        )}
      </div>

      <section className="border-t bg-muted/20 px-4 py-3">
        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <History className="h-3.5 w-3.5" aria-hidden />
          {t('pricing.card.history', { count: company.rules.length })}
        </h3>
        <ol className="relative space-y-1 border-s ps-4">
          {company.rules.map((rule) => (
            <VersionItem
              key={rule.id}
              rule={rule}
              status={versionStatus(rule, company.current_rule_id, today)}
              canDelete={canEdit && rule.effective_from > today}
              onDelete={() => onDeleteVersion(rule)}
            />
          ))}
        </ol>
      </section>
    </Card>
  );
}

function VersionItem({
  rule,
  status,
  canDelete,
  onDelete,
}: {
  rule: PricingRule;
  status: VersionStatus;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const id = `pricing-version-${rule.id}`;

  return (
    <li className="relative">
      <span
        aria-hidden
        className={cn(
          'absolute -start-[21px] top-3 h-2.5 w-2.5 rounded-full border-2 border-background',
          status === 'current' ? 'bg-success' : status === 'scheduled' ? 'bg-warning' : 'bg-muted-foreground/40',
        )}
      />
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-start justify-between gap-2 rounded-md px-2 py-1.5 text-start
                     transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-ring"
        >
          <span className="min-w-0 space-y-0.5">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-medium tabular-nums">
                {formatDay(rule.effective_from, i18n.language)}
              </span>
              <Badge variant={STATUS_VARIANT[status]} className="px-2 py-0 text-[10.5px]">
                {t(`pricing.status.${status}`)}
              </Badge>
            </span>
            <span className="block text-[12.5px] text-muted-foreground">
              {/* Each part isolated: they mix Arabic words with Latin figures, and
                  joined as one run the bidi algorithm reorders them across the dots. */}
              {[rateSummary(rule, t), t('pricing.rule.vatValue', { vat: formatVat(rule.vat_rate) }), rentalSummary(rule, t)].map(
                (part, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && ' · '}
                    <bdi>{part}</bdi>
                  </React.Fragment>
                ),
              )}
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              'mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-base',
              open && 'rotate-180',
            )}
          />
        </button>
        {canDelete && (
          <Button
            size="icon"
            variant="ghost"
            className="mt-0.5 h-8 w-8 shrink-0 text-destructive"
            aria-label={t('pricing.actions.deleteVersion')}
            title={t('pricing.actions.deleteVersion')}
            onClick={onDelete}
          >
            <Trash2 />
          </Button>
        )}
      </div>
      {open && (
        <div id={id} className="mb-2 mt-1 rounded-md border bg-background px-3 py-3">
          <PricingRuleDetails rule={rule} />
        </div>
      )}
    </li>
  );
}
