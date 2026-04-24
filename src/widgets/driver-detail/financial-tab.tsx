import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DollarSign, CreditCard, FileText, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { cn } from '@/shared/lib/cn';

interface FinancialTabProps {
  driverId: number;
}

/**
 * Hub tab that routes the user to the three financial detail screens for
 * this driver. Styled to match the rest of the app — small muted icons,
 * quiet borders, hover ring rather than colored backgrounds. Previously
 * the cards used red/blue/green icon blobs which didn't carry meaning and
 * clashed with the otherwise semantic tone system used elsewhere.
 */
export function FinancialTab({ driverId }: FinancialTabProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const links = [
    {
      key: 'expenses',
      icon: DollarSign,
      label: t('drivers.financial.expenses'),
      description: t('drivers.financial.expensesDescription'),
      to: `/drivers/${driverId}/expenses`,
    },
    {
      key: 'loans',
      icon: CreditCard,
      label: t('drivers.financial.loans'),
      description: t('drivers.financial.loansDescription'),
      to: `/drivers/${driverId}/loans`,
    },
    {
      key: 'salaries',
      icon: FileText,
      label: t('drivers.financial.salaries'),
      description: t('drivers.financial.salariesDescription'),
      to: `/drivers/${driverId}/salaries`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <Card
            key={link.key}
            role="button"
            tabIndex={0}
            onClick={() => navigate(link.to)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate(link.to);
              }
            }}
            className={cn(
              'cursor-pointer transition-colors',
              'hover:border-primary/40 hover:bg-muted/40',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            )}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{link.label}</p>
                <p className="truncate text-xs text-muted-foreground">{link.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}