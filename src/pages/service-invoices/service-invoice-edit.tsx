import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useServiceInvoice, useUpdateServiceInvoice } from '@/entities/service-invoice/queries';
import { ServiceInvoiceForm } from '@/widgets/service-invoice-form/service-invoice-form';
import { Skeleton } from '@/shared/ui/skeleton';
import { toast } from '@/shared/ui/toaster';
import type { ServiceInvoiceFormValues } from '@/entities/service-invoice/schemas';

export default function ServiceInvoiceEditPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { data: invoice, isLoading } = useServiceInvoice(id);
  const updateMutation = useUpdateServiceInvoice(id!);

  const handleSubmit = async (values: ServiceInvoiceFormValues) => {
    try {
      await updateMutation.mutateAsync(values);
      toast({ title: t('common.saveSuccess') });
      navigate(`/service-invoices/${id}`);
    } catch (err) {
      toast({ 
        title: t('errors.generic'), 
        variant: 'destructive' 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <ServiceInvoiceForm
        isEditMode
        initialValues={invoice}
        submitting={updateMutation.isPending}
        onBack={() => navigate(`/service-invoices/${id}`)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
