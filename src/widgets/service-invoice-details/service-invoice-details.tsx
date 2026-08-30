import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Printer,
  Calendar,
  User,
  MapPin,
  Gauge,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  Info,
  TrendingUp,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import type { ServiceInvoice } from '@/entities/service-invoice/schemas';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { StatCard } from '@/shared/ui/stat-card';
import { EmptyState } from '@/shared/ui/empty-state';
import { cn } from '@/shared/lib/cn';
import { formatNumber } from '@/shared/lib/format';

interface ServiceInvoiceDetailsProps {
  invoice: ServiceInvoice;
  onBack: () => void;
  onEdit?: () => void;
  highlightMatches?: boolean;
}

export function ServiceInvoiceDetails({
  invoice: propInvoice,
  onBack,
  onEdit,
  highlightMatches = true,
}: ServiceInvoiceDetailsProps) {
  const { t } = useTranslation();
  const location = useLocation();

  // If we came from search, the location state might have the invoice with match data
  const stateInvoice = location.state?.invoice as ServiceInvoice | undefined;

  // Use stateInvoice if it matches the current ID, otherwise use propInvoice
  const invoice = (stateInvoice?.ID === propInvoice.ID) ? stateInvoice : propInvoice;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-3 [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label={t('common.back')}>
            <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold leading-tight sm:text-xl">
              {t('serviceInvoices.receipt.title')} #{invoice.ID}
            </h1>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              {invoice.plate_number} · {format(new Date(invoice.date), 'd MMM yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              {t('common.edit')}
            </Button>
          )}
          <Button onClick={handlePrint}>
            <Printer aria-hidden="true" />
            {t('common.print')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Main Content (Receipt) */}
        <div className="lg:col-span-2 space-y-3 print:col-span-3 print:w-full print:max-w-4xl print:mx-auto">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 print:gap-2">
            <StatCard
              label={t('serviceInvoices.fields.date')}
              value={format(new Date(invoice.date), 'd MMM yyyy')}
              icon={Calendar}
              tone="primary"
            />
            <StatCard
              label={t('serviceInvoices.fields.meterReading')}
              value={`${formatNumber(invoice.meter_reading)} ${t('common.unit.km')}`}
              icon={Gauge}
            />
            <StatCard
              label={t('serviceInvoices.fields.driver')}
              value={invoice.driver_name}
              icon={User}
            />
            <StatCard
              label={t('serviceInvoices.fields.supervisor')}
              value={invoice.supervisor}
              icon={AlertCircle}
            />
            <StatCard
              label={t('serviceInvoices.fields.region')}
              value={invoice.operating_region}
              icon={MapPin}
            />
            <StatCard
              label={t('serviceInvoices.fields.plateNumber')}
              value={invoice.plate_number}
              icon={CheckCircle2}
              tone="primary"
            />
          </div>

          <Card className="print:border-border/60">
            <CardContent className="p-3 sm:p-4">
              {/* Receipt Header */}
              <div className="text-center mb-3 border-b pb-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground mb-4 print:h-8 print:w-8">
                  <CheckCircle2 className="h-6 w-6 print:h-4 print:w-4" aria-hidden="true" />
                </div>
                <h2 className="text-lg font-semibold leading-tight text-foreground print:text-base">
                  {t('serviceInvoices.form.checklistTitle')}
                </h2>
                <h3 className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('serviceInvoices.form.truckSubtitle')}
                </h3>
              </div>

              {/* Items Table */}
              <div className="rounded-lg border overflow-hidden">
                <div className="hidden md:grid grid-cols-[1.5fr_1fr] border-b bg-muted/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground print:grid">
                  <div className="p-3 text-center border-e">
                    {t('serviceInvoices.fields.notes')}
                  </div>
                  <div className="p-3 text-center">
                    {t('serviceInvoices.fields.service')}
                  </div>
                </div>
                <div className="divide-y">
                  {invoice.inspection_items?.map((item, index) => {
                    const isMatched = highlightMatches && item.matched;
                    const matchType = item.match_type;

                    return (
                      <div
                        key={item.ID || index}
                        className={cn(
                          "grid grid-cols-1 md:grid-cols-[1.5fr_1fr] transition-colors min-h-[60px]",
                          isMatched ? "bg-primary/10" : "hover:bg-muted/50"
                        )}
                      >
                        <div className="px-3 py-2.5 border-e-0 md:border-e relative">
                          <div className="mb-2 md:hidden text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('serviceInvoices.fields.notes')}
                          </div>
                          <p className={cn(
                            "text-sm text-end",
                            isMatched ? "font-medium text-foreground" : "text-muted-foreground"
                          )}>
                            {item.notes || <span className="opacity-40">—</span>}
                          </p>
                          {isMatched && (
                            <div className="absolute top-2 start-2 flex items-center gap-1">
                              {matchType === 'semantic' && (
                                <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-0.5 rounded-full text-[9px] font-black text-primary uppercase tracking-tighter border border-primary/20 print:bg-primary/5">
                                  <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                                  <span>{t('serviceInvoices.search.matchPercent', { percent: Math.round((1 - (item.distance || 0)) * 100) })}</span>
                                </div>
                              )}
                              {matchType === 'keyword' && (
                                <div className="flex items-center gap-1.5 bg-muted px-2 py-0.5 rounded-full text-[9px] font-black text-muted-foreground uppercase tracking-tighter border border-border print:bg-muted">
                                  <Search className="h-2.5 w-2.5" aria-hidden="true" />
                                  <span>{t('serviceInvoices.search.keyword')}</span>
                                </div>
                              )}
                              {matchType === 'both' && (
                                <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full text-[9px] font-black text-primary uppercase tracking-tighter border border-primary/40 print:bg-primary/5">
                                  <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                                  <Search className="h-2.5 w-2.5" aria-hidden="true" />
                                  <span>{t('serviceInvoices.search.hybrid')}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="px-3 py-2.5 flex flex-col md:flex-row md:items-center justify-end md:bg-transparent">
                          <div className="mb-1 md:hidden text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-end">
                            {t('serviceInvoices.fields.service')}
                          </div>
                          <p className={cn(
                            "text-sm font-bold text-end",
                            isMatched ? "text-primary" : "text-foreground"
                          )}>
                            {item.service}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {!invoice.inspection_items?.length && (
                    <div className="p-6">
                      <EmptyState
                        lottieSrc="/animations/receipt.lottie"
                        lottieWidth={100}
                        lottieHeight={100}
                        title={t('common.noResults')}
                        className="border-0 bg-transparent py-4 shadow-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-3 lg:col-span-1 print:hidden">
          <Card>
            <CardContent className="p-3">
              <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('serviceInvoices.receipt.billedTo')}
              </h4>
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('serviceInvoices.fields.plateNumber')}
                  </span>
                  <span className="text-[15px] font-semibold" dir="auto">{invoice.plate_number}</span>
                </div>
                {invoice.car && (
                  <>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('nav.cars')}
                      </span>
                      <span className="font-semibold">{invoice.car.car_type || <span className="opacity-40">—</span>}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {invoice.match_count != null && invoice.match_count > 0 && (
            <Card className="border-primary/40 bg-primary/10 overflow-hidden">
              <div className="bg-primary/10 px-6 py-3 border-b border-primary/40 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {t('serviceInvoices.search.hybridMatch')}
                </h4>
              </div>
              <CardContent className="p-3">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('serviceInvoices.fields.matchCount')}
                      </span>
                      <Badge variant="default" className="h-5 px-1.5">
                        {invoice.match_count}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t('serviceInvoices.search.hybridMatchDescription')}
                    </p>
                  </div>

                    <div className="flex flex-col gap-3 pt-4 border-t border-border/60">
                      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                        <TrendingUp className="h-3 w-3" aria-hidden="true" />
                        {t('serviceInvoices.search.aiInsight')}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-muted/40 rounded-lg p-2 border border-border/60">
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            <Sparkles className="h-2.5 w-2.5 text-primary" aria-hidden="true" />
                            {t('serviceInvoices.search.semanticMatch')}
                          </div>
                          <div className="text-xs font-bold text-foreground">
                            {t('serviceInvoices.search.vectorEmbeddings')}
                          </div>
                        </div>
                        <div className="bg-muted/40 rounded-lg p-2 border border-border/60">
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            <Search className="h-2.5 w-2.5 text-muted-foreground" aria-hidden="true" />
                            {t('serviceInvoices.search.keywordMatch')}
                          </div>
                          <div className="text-xs font-bold text-foreground">
                            {t('serviceInvoices.search.exactKeyword')}
                          </div>
                        </div>
                      </div>
                    </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-dashed border-border/60">
            <CardContent className="p-3">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <Info className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <h4 className="font-bold text-sm">{t('common.details')}</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('serviceInvoices.receipt.verificationNote')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
