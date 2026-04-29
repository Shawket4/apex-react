import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Sparkles, 
  Loader2,
  X,
  ArrowLeft
} from 'lucide-react';
import { 
  useServiceInvoices, 
  useServiceCars,
  useSearchServiceInvoices, 
  useDeleteServiceInvoice 
} from '@/entities/service-invoice/queries';
import { ServiceInvoicesTable } from '@/widgets/service-invoices-table/service-invoices-table';
import { ServiceCarsTable } from '@/widgets/service-cars-table/service-cars-table';
import { type Car } from '@/entities/car/schemas';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Card, CardContent } from '@/shared/ui/card';
import { PageShell } from '@/shared/ui/page-shell';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { toast } from '@/shared/ui/toaster';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';

export default function ServiceInvoicesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // States
  const [selectedCar, setSelectedCar] = React.useState<Car | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [carPage, setCarPage] = React.useState(1);
  const [invoicePage, setInvoicePage] = React.useState(1);
  const [searchPage, setSearchPage] = React.useState(1);
  const [deleteId, setDeleteId] = React.useState<number | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 500);
  const isSearching = debouncedSearch.length > 0;

  // Queries
  const { 
    data: carsData, 
    isLoading: carsLoading 
  } = useServiceCars(carPage);

  const { 
    data: invoicesData, 
    isLoading: invoicesLoading 
  } = useServiceInvoices(selectedCar?.ID, invoicePage);

  const { 
    data: searchData, 
    isFetching: searchLoading 
  } = useSearchServiceInvoices(debouncedSearch, selectedCar?.ID, searchPage);

  const deleteMutation = useDeleteServiceInvoice();

  // Reset pages when context changes
  React.useEffect(() => {
    setInvoicePage(1);
    setSearchPage(1);
  }, [selectedCar?.ID]);

  React.useEffect(() => {
    setSearchPage(1);
  }, [debouncedSearch]);


  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({ title: t('common.deleteSuccess') });
    } catch (err) {
      toast({ title: t('errors.generic'), variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <PageShell
      title={selectedCar ? selectedCar.car_no_plate : t('serviceInvoices.title')}
      description={selectedCar ? t('serviceInvoices.subtitle') : t('serviceInvoices.subtitle')}
      actions={
        <div className="flex items-center gap-2">
          {selectedCar && (
            <Button variant="outline" onClick={() => setSelectedCar(null)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back')}
            </Button>
          )}
          <Button onClick={() => navigate('/service-invoices/new')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('serviceInvoices.newInvoice')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Smart Search Bar */}
        <Card className="border-2 border-primary/20 shadow-lg shadow-primary/5 bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
          <CardContent className="p-6">
            <div className="relative group">
              <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none">
                {searchLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : isSearching ? (
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                ) : (
                  <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                )}
              </div>
              <Input
                type="text"
                placeholder={t('serviceInvoices.searchPlaceholder')}
                className="ps-12 pe-12 py-6 text-lg border-2 border-muted focus-visible:border-primary/50 rounded-2xl shadow-inner bg-background/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 end-0 flex items-center pe-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            
            <div className="mt-4 flex flex-wrap gap-4 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" />
                {t('serviceInvoices.search.semanticMatch')}
              </div>
              <div className="flex items-center gap-1.5">
                <Search className="h-3 w-3 text-blue-500" />
                {t('serviceInvoices.search.keywordMatch')}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isSearching ? (
          <Card>
            <CardContent className="p-0">
              <ServiceInvoicesTable 
                data={searchData?.results || []} 
                loading={searchLoading}
                onDelete={handleDelete}
                isSearchResults={true}
                pagination={searchData?.pagination ? {
                  page: searchData.pagination.page,
                  totalPages: searchData.pagination.totalPages,
                  onPageChange: setSearchPage,
                } : undefined}
              />
            </CardContent>
          </Card>
        ) : selectedCar ? (
          <Card>
            <CardContent className="p-0">
              <ServiceInvoicesTable 
                data={invoicesData?.data || []} 
                loading={invoicesLoading}
                onDelete={handleDelete}
                pagination={invoicesData?.pagination ? {
                  page: invoicesData.pagination.page,
                  totalPages: invoicesData.pagination.totalPages,
                  onPageChange: setInvoicePage,
                } : undefined}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <ServiceCarsTable 
                data={carsData?.data || []} 
                loading={carsLoading}
                onSelect={setSelectedCar}
                pagination={carsData?.pagination ? {
                  page: carsData.pagination.page,
                  totalPages: carsData.pagination.totalPages,
                  onPageChange: setCarPage,
                } : undefined}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t('common.confirm')}
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
      />
    </PageShell>
  );
}
