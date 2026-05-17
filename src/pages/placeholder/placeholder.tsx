import { useTranslation } from 'react-i18next';
import { type LucideIcon } from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { EmptyState } from '@/shared/ui/empty-state';

interface PlaceholderProps {
  titleKey: string;
  icon?: LucideIcon;
  descriptionKey?: string;
}

export function Placeholder({ titleKey, icon: Icon }: PlaceholderProps) {
  const { t } = useTranslation();
  const isSpeedViolations = titleKey === 'nav.speedViolations';

  return (
    <PageShell
      title={t(titleKey)}
      icon={Icon ? <Icon className="h-5 w-5" /> : undefined}
    >
      <EmptyState
        lottieSrc={isSpeedViolations ? '/animations/warning.lottie' : '/animations/construction.lottie'}
        lottieWidth={120}
        lottieHeight={120}
        title={t(titleKey)}
        description={
          isSpeedViolations
            ? 'Speed violations tracking and telemetry radar are currently being compiled.'
            : 'This module will be refactored next. The scaffold, architecture, and API wiring are ready.'
        }
      />
    </PageShell>
  );
}

// Named placeholder components for convenient route registration
export const TrucksPage = () => <Placeholder titleKey="nav.trucks" />;
export const CarsPage = () => <Placeholder titleKey="nav.cars" />;
export const TiresPage = () => <Placeholder titleKey="nav.tires" />;
export const PayrollPage = () => <Placeholder titleKey="nav.payroll" />;
export const VendorsPage = () => <Placeholder titleKey="nav.vendors" />;
export const FleetExpensesPage = () => <Placeholder titleKey="nav.fleetExpenses" />;
export const UsersPage = () => <Placeholder titleKey="nav.users" />;
export const LogsPage = () => <Placeholder titleKey="nav.logs" />;
export const SettingsPage = () => <Placeholder titleKey="nav.settings" />;
export const TabletsPage = () => <Placeholder titleKey="nav.tablets" />;
export const SpeedViolationsPage = () => <Placeholder titleKey="nav.speedViolations" />;
