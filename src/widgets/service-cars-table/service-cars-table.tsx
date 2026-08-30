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
          <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
            <Truck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="font-mono text-[15px] font-semibold tabular-nums" dir="auto">{row.getValue('car_no_plate')}</div>
        </div>
      ),
    },
    {
      accessorKey: 'car_type',
      header: t('nav.trucks'),
      cell: ({ row }: any) => (
        <Badge variant="outline" className="font-medium">
          {row.getValue('car_type') || <span className="opacity-40">—</span>}
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
          <div className="text-end">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => onSelect(car)}
            >
              <span className="text-xs">{t('common.view')}</span>
              <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
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
