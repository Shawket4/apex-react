import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Eye, 
  Edit, 
  Trash2, 
  Sparkles,
  MoreHorizontal
} from 'lucide-react';
import type { ServiceInvoice } from '@/entities/service-invoice/schemas';
import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/shared/ui/dropdown-menu';
import { Badge } from '@/shared/ui/badge';
import { formatNumber } from '@/shared/lib/format';

interface ServiceInvoicesTableProps {
  data: ServiceInvoice[];
  loading?: boolean;
  onDelete?: (id: number) => void;
  isSearchResults?: boolean;
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  searchQuery?: string;
}

export function ServiceInvoicesTable({
  data,
  loading,
  onDelete,
  isSearchResults = false,
  pagination,
  searchQuery,
}: ServiceInvoicesTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const columns = [
    {
      accessorKey: 'date',
      header: t('serviceInvoices.fields.date'),
      cell: ({ row }: any) => {
        const date = new Date(row.getValue('date'));
        return <div className="font-medium">{date.toISOString().split('T')[0]}</div>;
      },
    },
    {
      accessorKey: 'plate_number',
      header: t('serviceInvoices.fields.plateNumber'),
      cell: ({ row }: any) => (
        <div className="font-black tracking-tight">{row.getValue('plate_number')}</div>
      ),
    },
    {
      accessorKey: 'driver_name',
      header: t('serviceInvoices.fields.driver'),
    },
    {
      accessorKey: 'meter_reading',
      header: t('serviceInvoices.fields.meterReading'),
      cell: ({ row }: any) => (
        <div className="text-right font-mono">{formatNumber(row.getValue('meter_reading'))} {t('common.unit.km')}</div>
      ),
    },
    {
      accessorKey: 'match_count',
      header: t('serviceInvoices.fields.matchCount'),
      cell: ({ row }: any) => {
        const count = row.getValue('match_count') as number;
        if (!isSearchResults || !count) return null;
        
        return (
          <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20">
            <Sparkles className="h-3 w-3" />
            {count}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }: any) => {
        const invoice = row.original as ServiceInvoice;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  const url = searchQuery 
                    ? `/service-invoices/${invoice.ID}?query=${encodeURIComponent(searchQuery)}`
                    : `/service-invoices/${invoice.ID}`;
                  navigate(url, { state: { invoice } });
                }}>
                  <Eye className="mr-2 h-4 w-4" />
                  {t('common.view')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/service-invoices/${invoice.ID}/edit`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t('common.edit')}
                </DropdownMenuItem>
                {onDelete && (
                  <DropdownMenuItem 
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    onClick={() => onDelete(invoice.ID)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('common.delete')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
