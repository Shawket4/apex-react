import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCreateServiceInvoice } from '@/entities/service-invoice/queries';
import { ServiceInvoiceForm } from '@/widgets/service-invoice-form/service-invoice-form';

import { toast } from '@/shared/ui/toaster';
import type { ServiceInvoiceFormValues } from '@/entities/service-invoice/schemas';

export default function ServiceInvoiceNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createMutation = useCreateServiceInvoice();

  const handleSubmit = async (values: ServiceInvoiceFormValues) => {
    try {
      const result = await createMutation.mutateAsync(values);
      toast({ title: t('common.saveSuccess') });
      navigate(`/service-invoices/${result.ID}`);
    } catch (err) {
      toast({ 
        title: t('errors.generic'), 
        variant: 'destructive' 
      });
    }
  };

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <ServiceInvoiceForm
        submitting={createMutation.isPending}
        onBack={() => navigate('/service-invoices')}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
