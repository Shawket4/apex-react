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
import type { ServiceInvoice } from '@/entities/service-invoice/schemas';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { StatCard } from '@/shared/ui/stat-card';
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
    <div className="flex flex-col gap-6 print:gap-4 [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t('serviceInvoices.receipt.title')} #{invoice.ID}
            </h1>
            <p className="text-sm text-muted-foreground">
              {invoice.plate_number} • {invoice.date.split('T')[0]}
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
            <Printer className="mr-2 h-4 w-4" />
            {t('common.print')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content (Receipt) */}
        <div className="lg:col-span-2 space-y-6 print:col-span-3">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print:gap-2">
            <StatCard
              label={t('serviceInvoices.fields.date')}
              value={invoice.date.split('T')[0]}
              icon={Calendar}
              tone="primary"
            />
            <StatCard
              label={t('serviceInvoices.fields.meterReading')}
              value={`${formatNumber(invoice.meter_reading)} ${t('common.unit.km')}`}
              icon={Gauge}
              tone="success"
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
              tone="warning"
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

          <Card className="border-2 border-muted shadow-lg print:shadow-none print:border-muted/50">
            <CardContent className="p-8">
              {/* Receipt Header */}
              <div className="text-center mb-10 border-b pb-8">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-4 print:h-8 print:w-8">
                  <CheckCircle2 className="h-6 w-6 print:h-4 print:w-4" />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tighter text-foreground print:text-xl">
                  {t('serviceInvoices.form.checklistTitle')}
                </h2>
                <h3 className="text-lg font-medium text-muted-foreground uppercase tracking-[0.3em] mt-1 print:text-sm">
                  {t('serviceInvoices.form.truckSubtitle')}
                </h3>
              </div>

              {/* Items Table */}
              <div className="rounded-xl border-2 border-muted overflow-hidden">
                <div className="hidden md:grid grid-cols-[1.5fr_1fr] bg-foreground text-background font-bold text-[10px] uppercase tracking-widest print:grid">
                  <div className="p-3 text-center border-e border-background/20">
                    {t('serviceInvoices.fields.notes')}
                  </div>
                  <div className="p-3 text-center">
                    {t('serviceInvoices.fields.service')}
                  </div>
                </div>
                <div className="divide-y-2 divide-muted">
                  {invoice.inspection_items?.map((item, index) => {
                    const isMatched = highlightMatches && item.matched;
                    const matchType = item.match_type;
                    
                    return (
                      <div 
                        key={item.ID || index} 
                        className={cn(
                          "grid grid-cols-1 md:grid-cols-[1.5fr_1fr] transition-colors min-h-[60px]",
                          isMatched ? "bg-primary/5" : "hover:bg-muted/30"
                        )}
                      >
                        <div className="p-4 border-e-0 md:border-e-2 border-muted relative">
                          <div className="mb-2 md:hidden text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            {t('serviceInvoices.fields.notes')}
                          </div>
                          <p className={cn(
                            "text-sm text-right",
                            isMatched ? "font-medium text-foreground" : "text-muted-foreground"
                          )}>
                            {item.notes || '-'}
                          </p>
                          {isMatched && (
                            <div className="absolute top-2 start-2 flex items-center gap-1">
                              {matchType === 'semantic' && (
                                <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-0.5 rounded-full text-[9px] font-black text-primary uppercase tracking-tighter border border-primary/20 shadow-sm print:bg-primary/5">
                                  <Sparkles className="h-2.5 w-2.5" />
                                  <span>{t('serviceInvoices.search.matchPercent', { percent: Math.round((1 - (item.distance || 0)) * 100) })}</span>
                                </div>
                              )}
                              {matchType === 'keyword' && (
                                <div className="flex items-center gap-1.5 bg-blue-500/10 px-2 py-0.5 rounded-full text-[9px] font-black text-blue-500 uppercase tracking-tighter border border-blue-500/20 shadow-sm print:bg-blue-500/5">
                                  <Search className="h-2.5 w-2.5" />
                                  <span>{t('serviceInvoices.search.keyword')}</span>
                                </div>
                              )}
                              {matchType === 'both' && (
                                <div className="flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded-full text-[9px] font-black text-indigo-500 uppercase tracking-tighter border border-indigo-500/20 shadow-sm print:bg-indigo-500/5">
                                  <Sparkles className="h-2.5 w-2.5" />
                                  <Search className="h-2.5 w-2.5" />
                                  <span>{t('serviceInvoices.search.hybrid')}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="p-4 flex flex-col md:flex-row md:items-center justify-end bg-muted/5 md:bg-transparent">
                          <div className="mb-1 md:hidden text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">
                            {t('serviceInvoices.fields.service')}
                          </div>
                          <p className={cn(
                            "text-sm font-bold text-right",
                            isMatched ? "text-primary" : "text-foreground"
                          )}>
                            {item.service}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {!invoice.inspection_items?.length && (
                    <div className="p-12 text-center text-muted-foreground italic">
                      {t('common.noResults')}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6 print:col-span-3 lg:print:col-span-1 print:mt-6">
          <Card>
            <CardContent className="p-6">
              <h4 className="font-bold mb-4 uppercase tracking-wider text-xs text-muted-foreground">
                {t('serviceInvoices.receipt.billedTo')}
              </h4>
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                    {t('serviceInvoices.fields.plateNumber')}
                  </span>
                  <span className="text-xl font-black">{invoice.plate_number}</span>
                </div>
                {invoice.car && (
                  <>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                        {t('nav.cars')}
                      </span>
                      <span className="font-semibold">{invoice.car.car_type || '-'}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {invoice.match_count != null && invoice.match_count > 0 && (
            <Card className="border-primary/20 bg-primary/5 overflow-hidden">
              <div className="bg-primary/10 px-6 py-3 border-b border-primary/20 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h4 className="font-bold text-primary text-sm uppercase tracking-wider">
                  {t('serviceInvoices.search.hybridMatch')}
                </h4>
              </div>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest">
                        {t('serviceInvoices.fields.matchCount')}
                      </span>
                      <Badge variant="default" className="h-5 px-1.5 font-black">
                        {invoice.match_count}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t('serviceInvoices.search.hybridMatchDescription')}
                    </p>
                  </div>

                    <div className="flex flex-col gap-3 pt-4 border-t border-primary/10">
                      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                        <TrendingUp className="h-3 w-3" />
                        {t('serviceInvoices.search.aiInsight')}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-background/50 rounded-lg p-2 border border-primary/10">
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold mb-1 uppercase">
                            <Sparkles className="h-2.5 w-2.5 text-primary" />
                            {t('serviceInvoices.search.semanticMatch')}
                          </div>
                          <div className="text-xs font-bold text-foreground">
                            {t('serviceInvoices.search.vectorEmbeddings')}
                          </div>
                        </div>
                        <div className="bg-background/50 rounded-lg p-2 border border-primary/10">
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold mb-1 uppercase">
                            <Search className="h-2.5 w-2.5 text-blue-500" />
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

          <Card className="border-dashed border-2">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <Info className="h-4 w-4 text-muted-foreground" />
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
