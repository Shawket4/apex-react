import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Sparkles, 
  Loader2,
  X
} from 'lucide-react';
import { useServiceInvoices, useSearchServiceInvoices, useDeleteServiceInvoice } from '@/entities/service-invoice/queries';
import { ServiceInvoicesTable } from '@/widgets/service-invoices-table/service-invoices-table';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Card, CardContent } from '@/shared/ui/card';
import { PageShell } from '@/shared/ui/page-shell';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { toast } from '@/shared/ui/toaster';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { EmptyState } from '@/shared/ui/empty-state';

export default function ServiceInvoicesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);

  const { 
    data: listData, 
    isLoading: listLoading,
  } = useServiceInvoices(1); // Default to first page for now

  const { 
    data: searchData, 
    isFetching: searchLoading 
  } = useSearchServiceInvoices(debouncedSearch);

  const deleteMutation = useDeleteServiceInvoice();
  const [deleteId, setDeleteId] = React.useState<number | null>(null);

  const isSearching = debouncedSearch.length > 0;
  const currentData = isSearching ? searchData?.results || [] : listData?.data || [];
  const loading = isSearching ? searchLoading : listLoading;

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
      title={t('serviceInvoices.title')}
      description={t('serviceInvoices.subtitle')}
      actions={
        <Button onClick={() => navigate('/service-invoices/new')}>
          <Plus className="mr-2 h-4 w-4" />
          {t('serviceInvoices.newInvoice')}
        </Button>
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
        {currentData.length === 0 && !loading ? (
          <EmptyState
            icon={<Search className="h-12 w-12" />}
            title={t('common.noResults')}
            description={isSearching ? t('trips.empty.description') : t('fuelEvents.noEventsDescription')}
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <ServiceInvoicesTable 
                data={currentData} 
                loading={loading}
                onDelete={handleDelete}
                isSearchResults={isSearching}
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
