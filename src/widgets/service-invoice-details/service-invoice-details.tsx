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
  AlertCircle
} from 'lucide-react';
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
  invoice,
  onBack,
  onEdit,
  highlightMatches = true,
}: ServiceInvoiceDetailsProps) {
  const { t } = useTranslation();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 print:gap-0">
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
            {t('common.export')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content (Receipt) */}
        <div className="lg:col-span-2 space-y-6 print:col-span-3">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print:hidden">
            <StatCard
              label={t('serviceInvoices.fields.date')}
              value={invoice.date.split('T')[0]}
              icon={Calendar}
              tone="primary"
            />
            <StatCard
              label={t('serviceInvoices.fields.meterReading')}
              value={`${formatNumber(invoice.meter_reading)} KM`}
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
                <div className="grid grid-cols-[1.5fr_1fr] bg-foreground text-background font-bold text-[10px] uppercase tracking-widest">
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
                          "grid grid-cols-[1.5fr_1fr] transition-colors min-h-[60px]",
                          isMatched ? "bg-primary/5" : "hover:bg-muted/30"
                        )}
                      >
                        <div className="p-4 border-e-2 border-muted relative">
                          <p className={cn(
                            "text-sm text-right",
                            isMatched ? "font-medium text-foreground" : "text-muted-foreground"
                          )}>
                            {item.notes || '-'}
                          </p>
                          {isMatched && (
                            <div className="absolute top-2 start-2 flex gap-1">
                              {matchType === 'semantic' && (
                                <span title={t('serviceInvoices.search.semanticMatch')}>
                                  <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                                </span>
                              )}
                              {matchType === 'keyword' && (
                                <span title={t('serviceInvoices.search.keywordMatch')}>
                                  <Search className="h-3 w-3 text-blue-500" />
                                </span>
                              )}
                              {matchType === 'both' && (
                                <>
                                  <span title={t('serviceInvoices.search.semanticMatch')}>
                                    <Sparkles className="h-3 w-3 text-primary" />
                                  </span>
                                  <span title={t('serviceInvoices.search.keywordMatch')}>
                                    <Search className="h-3 w-3 text-blue-500" />
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="p-4 flex items-center justify-end">
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
        <div className="space-y-6 print:hidden">
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
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h4 className="font-bold text-primary">
                    {t('serviceInvoices.fields.matchCount')}
                  </h4>
                </div>
                <p className="text-sm text-primary/80 mb-2">
                  This record contains <strong>{invoice.match_count}</strong> items matching your query.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-background">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {t('serviceInvoices.search.semanticMatch')}
                  </Badge>
                  <Badge variant="outline" className="bg-background">
                    <Search className="h-3 w-3 mr-1" />
                    {t('serviceInvoices.search.keywordMatch')}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
