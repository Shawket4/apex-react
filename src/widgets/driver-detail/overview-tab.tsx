import { useTranslation } from 'react-i18next';
import {
  User,
  Phone,
  Truck,
  ShieldCheck,
  ShieldAlert,
  Hash,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import type { Driver } from '@/entities/driver/schemas';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { DocumentsSummary } from '@/widgets/documents/documents-summary';

/* -------------------------------------------------------------------------- */
/* DetailRow — inline, no rounded icon blobs                                   */
/* -------------------------------------------------------------------------- */

interface DetailRowProps {
  icon: React.ReactNode;
  label: React.ReactNode;
  value: React.ReactNode;
  /** Phone numbers and codes read left to right, and still sit where the text starts. */
  ltr?: boolean;
}

function DetailRow({ icon, label, value, ltr }: DetailRowProps) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="truncate text-sm font-medium">
          {value == null ? (
            <span className="opacity-40">—</span>
          ) : ltr ? (
            <span dir="ltr">{value}</span>
          ) : (
            value
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* OverviewTab                                                                 */
/* -------------------------------------------------------------------------- */

interface OverviewTabProps {
  driver: Driver;
  /** Opens the driver's documents. */
  onOpenDocuments: () => void;
}

export function OverviewTab({ driver, onOpenDocuments }: OverviewTabProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {/* Personal info — clean two-column detail grid */}
      <Card>
        <CardContent className="p-3">
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('drivers.sections.personalInfo')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailRow
              icon={<User className="h-4 w-4" aria-hidden="true" />}
              label={t('drivers.fields.name')}
              value={driver.name}
            />
            <DetailRow
              icon={<Phone className="h-4 w-4" aria-hidden="true" />}
              label={t('drivers.fields.phone')}
              value={driver.mobile_number || <span className="opacity-40">—</span>}
              ltr
            />
            <DetailRow
              icon={<Truck className="h-4 w-4" aria-hidden="true" />}
              label={t('drivers.fields.transporter')}
              value={driver.transporter || 'Apex'}
            />
            {driver.social_security_number && (
              <DetailRow
                icon={<Hash className="h-4 w-4" aria-hidden="true" />}
                label={t('drivers.fields.socialSecurity')}
                value={driver.social_security_number}
                ltr
              />
            )}
            <DetailRow
              icon={
                driver.is_approved ? (
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                )
              }
              label={t('common.status')}
              value={
                driver.is_approved ? (
                  <Badge variant="success">
                    <CheckCircle className="h-3 w-3" aria-hidden="true" />
                    {t('drivers.status.approved')}
                  </Badge>
                ) : (
                  <Badge variant="warning">
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                    {t('drivers.status.pending')}
                  </Badge>
                )
              }
            />
          </div>
        </CardContent>
      </Card>

      <DocumentsSummary ownerKind="driver" ownerId={driver.ID} onOpen={onOpenDocuments} />
    </div>
  );
}
