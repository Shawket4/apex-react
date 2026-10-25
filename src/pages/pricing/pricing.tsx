import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Eye, ListChecks, RefreshCw, Tags, Truck } from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { toast } from '@/shared/ui/toast';
import { extractErrorMessage } from '@/shared/api/errors';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { PRICING_EDIT_LEVEL } from '@/entities/pricing/masking';
import { useDeletePricingRule, usePricingRules } from '@/entities/pricing/queries';
import type { PricingCompany, PricingRule } from '@/entities/pricing/schemas';
import { PricingCompanyCard } from '@/widgets/pricing/pricing-company-card';
import { PricingRuleFormDialog } from '@/widgets/pricing/pricing-rule-form-dialog';
import { RepriceDialog, type RepriceRequest } from '@/widgets/pricing/reprice-dialog';
import { TruckMonthsPanel } from '@/widgets/pricing/truck-months-panel';
import { cairoThisMonth, cairoToday, formatDay } from '@/widgets/pricing/pricing-format';

type Tab = 'rules' | 'rental';

/**
 * Pricing (permission 3 reads, 4 edits).
 *
 * Every company's stored, effective-dated pricing rule — the single source
 * trip revenue and car rental are computed from on write — with its version
 * history, the per-truck rental it produced each month, and (at 4) a new
 * version and a re-price over a date range.
 */
export default function PricingPage() {
  const { t, i18n } = useTranslation();
  const { level } = usePermissions();
  const canEdit = level >= PRICING_EDIT_LEVEL;
  const today = React.useMemo(() => cairoToday(), []);
  const thisMonth = React.useMemo(() => cairoThisMonth(), []);

  const { data: companies = [], isLoading, isError, error, refetch } = usePricingRules();
  const deleteRule = useDeletePricingRule();

  const [tab, setTab] = React.useState<Tab>('rules');
  const [editing, setEditing] = React.useState<PricingCompany | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [reprice, setReprice] = React.useState<RepriceRequest | null>(null);
  const [repriceOpen, setRepriceOpen] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<PricingRule | null>(null);

  const companyNames = React.useMemo(() => companies.map((c) => c.company), [companies]);

  const openReprice = (req: RepriceRequest) => {
    setReprice(req);
    setRepriceOpen(true);
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteRule.mutateAsync(pendingDelete.id);
      toast.success(t('pricing.delete.success'));
      setPendingDelete(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, t('pricing.delete.failed')));
    }
  };

  const actions = canEdit ? (
    <Button size="sm" variant="outline" onClick={() => openReprice({ from: `${thisMonth}-01` })}>
      <RefreshCw />
      {t('pricing.actions.reprice')}
    </Button>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
      <Eye className="h-3.5 w-3.5" aria-hidden />
      {t('common.viewOnly')}
    </span>
  );

  return (
    <PageShell
      title={t('pricing.title')}
      description={t('pricing.subtitle')}
      icon={<Tags className="h-5 w-5" />}
      actions={actions}
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="rules" className="gap-1.5">
            <ListChecks className="h-3.5 w-3.5" />
            {t('pricing.tabs.rules')}
          </TabsTrigger>
          <TabsTrigger value="rental" className="gap-1.5">
            <Truck className="h-3.5 w-3.5" />
            {t('pricing.tabs.rental')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4">
          {isLoading ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-72 w-full" />
              ))}
            </div>
          ) : isError ? (
            <Card className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <AlertCircle className="h-6 w-6 text-destructive" aria-hidden />
              <p className="text-sm">{extractErrorMessage(error, t('pricing.loadFailed'))}</p>
              <Button size="sm" variant="outline" onClick={() => void refetch()}>
                {t('common.retry')}
              </Button>
            </Card>
          ) : companies.length === 0 ? (
            <EmptyState
              icon={<Tags className="h-6 w-6" />}
              title={t('pricing.empty')}
              description={t('pricing.emptyHint')}
            />
          ) : (
            <div className="grid items-start gap-4 xl:grid-cols-2">
              {companies.map((c) => (
                <PricingCompanyCard
                  key={c.company}
                  company={c}
                  today={today}
                  canEdit={canEdit}
                  onNewVersion={() => {
                    setEditing(c);
                    setFormOpen(true);
                  }}
                  // This month by default: the seed versions date from 2000, and
                  // a re-price over a quarter-century is never the intent.
                  onReprice={() => openReprice({ from: `${thisMonth}-01`, company: c.company })}
                  onDeleteVersion={setPendingDelete}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rental" className="mt-4">
          <TruckMonthsPanel companies={companyNames} thisMonth={thisMonth} />
        </TabsContent>
      </Tabs>

      {canEdit && (
        <>
          <PricingRuleFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            company={editing}
            today={today}
            onReprice={(from, company) => openReprice({ from, company })}
          />
          <RepriceDialog
            open={repriceOpen}
            onOpenChange={setRepriceOpen}
            initial={reprice}
            companies={companyNames}
            today={today}
          />
          <ConfirmDialog
            open={pendingDelete != null}
            onOpenChange={(o) => !o && setPendingDelete(null)}
            title={t('pricing.delete.title')}
            description={
              pendingDelete
                ? t('pricing.delete.body', {
                    company: pendingDelete.company,
                    date: formatDay(pendingDelete.effective_from, i18n.language),
                  })
                : undefined
            }
            confirmLabel={t('common.delete')}
            variant="destructive"
            loading={deleteRule.isPending}
            onConfirm={handleDelete}
          />
        </>
      )}
    </PageShell>
  );
}
