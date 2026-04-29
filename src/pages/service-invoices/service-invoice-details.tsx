import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useServiceInvoice } from '@/entities/service-invoice/queries';
import { ServiceInvoiceDetails } from '@/widgets/service-invoice-details/service-invoice-details';
import { Skeleton } from '@/shared/ui/skeleton';

export default function ServiceInvoiceDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('query');
  
  const { data: invoice, isLoading } = useServiceInvoice(id);

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-[800px] w-full" />
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <ServiceInvoiceDetails
        invoice={invoice}
        onBack={() => navigate('/service-invoices')}
        onEdit={() => navigate(`/service-invoices/${id}/edit`)}
        highlightMatches={!!query}
      />
    </div>
  );
}
