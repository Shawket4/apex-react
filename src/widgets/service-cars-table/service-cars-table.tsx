import { useTranslation } from 'react-i18next';
import { 
  ChevronRight,
  Truck
} from 'lucide-react';
import type { Car } from '@/entities/car/schemas';
import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';

interface ServiceCarsTableProps {
  data: Car[];
  loading?: boolean;
  onSelect: (car: Car) => void;
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export function ServiceCarsTable({
  data,
  loading,
  onSelect,
  pagination,
}: ServiceCarsTableProps) {
  const { t } = useTranslation();

  const columns = [
    {
      accessorKey: 'car_no_plate',
      header: t('serviceInvoices.fields.plateNumber'),
      cell: ({ row }: any) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Truck className="h-4 w-4 text-primary" />
          </div>
          <div className="font-black tracking-tight text-lg">{row.getValue('car_no_plate')}</div>
        </div>
      ),
    },
    {
      accessorKey: 'car_type',
      header: t('nav.trucks'),
      cell: ({ row }: any) => (
        <Badge variant="outline" className="font-medium">
          {row.getValue('car_type') || '-'}
        </Badge>
      ),
    },
    {
      accessorKey: 'transporter',
      header: t('drivers.fields.transporter'),
    },
    {
      id: 'actions',
      cell: ({ row }: any) => {
        const car = row.original as Car;
        return (
          <div className="text-right">
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 hover:bg-primary/5 hover:text-primary transition-all group"
              onClick={() => onSelect(car)}
            >
              <span className="font-semibold text-xs uppercase tracking-wider">{t('common.view')}</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      loading={loading}
      emptyState={t('common.noResults')}
      pagination={pagination}
    />
  );
}
