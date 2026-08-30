import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useServiceInvoice, useUpdateServiceInvoice } from '@/entities/service-invoice/queries';
import { ServiceInvoiceForm } from '@/widgets/service-invoice-form/service-invoice-form';
import { Skeleton } from '@/shared/ui/skeleton';
import { toast } from '@/shared/ui/toast';
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
    } catch {
      toast({ 
        title: t('errors.generic'), 
        variant: 'destructive' 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6 lg:p-8">
        <Skeleton className="h-5 w-1/3 rounded-sm" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (!invoice) return <p className="py-6 text-center text-xs text-muted-foreground">{t('common.noResults')}</p>;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6 lg:p-8">
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
