import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useServiceInvoice } from '@/entities/service-invoice/queries';
import { ServiceInvoiceDetails } from '@/widgets/service-invoice-details/service-invoice-details';
import { Skeleton } from '@/shared/ui/skeleton';

export default function ServiceInvoiceDetailsPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('query');
  
  const { data: invoice, isLoading } = useServiceInvoice(id);

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 p-3 sm:p-4">
        <Skeleton className="h-5 w-1/3 rounded-sm" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (!invoice) return <p className="py-6 text-center text-xs text-muted-foreground">{t('common.noResults')}</p>;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 p-3 sm:p-4">
      <ServiceInvoiceDetails
        invoice={invoice}
        onBack={() => navigate('/service-invoices')}
        onEdit={() => navigate(`/service-invoices/${id}/edit`)}
        highlightMatches={!!query}
      />
    </div>
  );
}
