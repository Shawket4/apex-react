import { useTranslation } from 'react-i18next';
import {
  User,
  Phone,
  Truck,
  ShieldCheck,
  ShieldAlert,
  Hash,
  IdCard,
  HardHat,
  FlaskConical,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import type { Driver, ExpirationInfo } from '@/entities/driver/schemas';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { StatCard } from '@/shared/ui/stat-card';
import { fmtDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function getExpirationInfo(dateStr: string | null | undefined): ExpirationInfo {
  if (!dateStr) return { status: 'unknown', daysLeft: null };
  const expiry = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { status: 'expired', daysLeft: diff };
  if (diff <= 30) return { status: 'warning', daysLeft: diff };
  return { status: 'valid', daysLeft: diff };
}

/**
 * StatCard tone picker for an expiry. Maps our three live states to the tone
 * system used across the app. `unknown` (never set) stays neutral — missing
 * data shouldn't register as a warning.
 */
function toneForExpiry(info: ExpirationInfo): 'primary' | 'success' | 'warning' | undefined {
  switch (info.status) {
    case 'expired':
    case 'warning':
      return 'warning';
    case 'valid':
      return 'success';
    case 'unknown':
    default:
      return undefined;
  }
}

/**
 * Subvalue copy — tells the user how many days until (or since) expiry. For
 * `unknown` we hide the subvalue so the card doesn't look noisy.
 */
function expirySubvalue(
  info: ExpirationInfo,
  t: (k: string, o?: Record<string, unknown>) => string,
): string | undefined {
  switch (info.status) {
    case 'expired':
      return t('drivers.expiry.expiredDaysAgo', { days: Math.abs(info.daysLeft ?? 0) });
    case 'warning':
      return t('drivers.expiry.inDays', { days: info.daysLeft });
    case 'valid':
      return t('drivers.expiry.inDays', { days: info.daysLeft });
    case 'unknown':
    default:
      return undefined;
  }
}

/* -------------------------------------------------------------------------- */
/* DetailRow — inline, no rounded icon blobs                                   */
/* -------------------------------------------------------------------------- */

interface DetailRowProps {
  icon: React.ReactNode;
  label: React.ReactNode;
  value: React.ReactNode;
  /** Force LTR for phone numbers / codes inside Arabic layout */
  ltr?: boolean;
}

function DetailRow({ icon, label, value, ltr }: DetailRowProps) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium" dir={ltr ? 'ltr' : undefined}>
          {value ?? '—'}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* OverviewTab                                                                 */
/* -------------------------------------------------------------------------- */

interface OverviewTabProps {
  driver: Driver;
}

export function OverviewTab({ driver }: OverviewTabProps) {
  const { t } = useTranslation();

  const licenses = [
    {
      key: 'driver_license',
      label: t('drivers.fields.driverLicenseExpiry'),
      icon: IdCard,
      date: driver.driver_license_expiration_date,
      info: getExpirationInfo(driver.driver_license_expiration_date),
    },
    {
      key: 'id_license',
      label: t('drivers.fields.idExpiry'),
      icon: Hash,
      date: driver.id_license_expiration_date,
      info: getExpirationInfo(driver.id_license_expiration_date),
    },
    {
      key: 'safety_license',
      label: t('drivers.fields.safetyExpiry'),
      icon: HardHat,
      date: driver.safety_license_expiration_date,
      info: getExpirationInfo(driver.safety_license_expiration_date),
    },
    {
      key: 'drug_test',
      label: t('drivers.fields.drugTestExpiry'),
      icon: FlaskConical,
      date: driver.drug_test_expiration_date,
      info: getExpirationInfo(driver.drug_test_expiration_date),
    },
  ];

  const expiredCount = licenses.filter((l) => l.info.status === 'expired').length;
  const warningCount = licenses.filter((l) => l.info.status === 'warning').length;
  const anyProblem = expiredCount > 0 || warningCount > 0;

  return (
    <div className="space-y-4">
      {/* License expiry band — 4 StatCards, one per license, tone reflects urgency */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {licenses.map((lic) => (
          <StatCard
            key={lic.key}
            label={lic.label}
            value={lic.date ? fmtDate(lic.date) : t('drivers.expiry.notSet')}
            subvalue={expirySubvalue(lic.info, t)}
            icon={lic.icon}
            tone={toneForExpiry(lic.info)}
          />
        ))}
      </div>

      {/* At-a-glance explainer when anything is amber/red */}
      {anyProblem && (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-2.5 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <span>
            {expiredCount > 0 &&
              t('drivers.expiry.summaryExpired', { count: expiredCount })}
            {expiredCount > 0 && warningCount > 0 && ' · '}
            {warningCount > 0 &&
              t('drivers.expiry.summaryExpiring', { count: warningCount })}
          </span>
        </div>
      )}

      {/* Personal info — clean two-column detail grid */}
      <Card>
        <CardContent className="p-4 md:p-5">
          <h2 className="mb-4 text-sm font-semibold">{t('drivers.sections.personalInfo')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailRow
              icon={<User className="h-4 w-4" />}
              label={t('drivers.fields.name')}
              value={driver.name}
            />
            <DetailRow
              icon={<Phone className="h-4 w-4" />}
              label={t('drivers.fields.phone')}
              value={driver.mobile_number || '—'}
              ltr
            />
            <DetailRow
              icon={<Truck className="h-4 w-4" />}
              label={t('drivers.fields.transporter')}
              value={driver.transporter || 'Apex'}
            />
            {driver.social_security_number && (
              <DetailRow
                icon={<Hash className="h-4 w-4" />}
                label={t('drivers.fields.socialSecurity')}
                value={driver.social_security_number}
                ltr
              />
            )}
            <DetailRow
              icon={
                driver.is_approved ? (
                  <ShieldCheck className="h-4 w-4" />
                ) : (
                  <ShieldAlert className="h-4 w-4" />
                )
              }
              label={t('common.status')}
              value={
                driver.is_approved ? (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {t('drivers.status.approved')}
                  </Badge>
                ) : (
                  <Badge variant="warning" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {t('drivers.status.pending')}
                  </Badge>
                )
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Licenses detail — minimal rows, no rounded icon blobs */}
      <Card>
        <CardContent className="p-4 md:p-5">
          <h2 className="mb-4 text-sm font-semibold">{t('drivers.sections.licenses')}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {licenses.map((lic) => {
              const Icon = lic.icon;
              const info = lic.info;
              return (
                <div
                  key={lic.key}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-md border p-3',
                    info.status === 'expired' && 'border-destructive/30 bg-destructive/5',
                    info.status === 'warning' && 'border-warning/30 bg-warning/5',
                  )}
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{lic.label}</p>
                      <p className="truncate text-sm font-medium">
                        {lic.date ? fmtDate(lic.date) : '—'}
                      </p>
                    </div>
                  </div>
                  <ExpirationBadge info={info} t={t} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ExpirationBadge                                                             */
/* -------------------------------------------------------------------------- */

function ExpirationBadge({
  info,
  t,
}: {
  info: ExpirationInfo;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  if (info.status === 'unknown') {
    return <Badge variant="secondary">{t('drivers.expiry.notSet')}</Badge>;
  }
  if (info.status === 'expired') {
    return (
      <Badge variant="destructive" className="gap-1 shrink-0">
        <AlertTriangle className="h-3 w-3" />
        {t('drivers.expiry.expired')}
      </Badge>
    );
  }
  if (info.status === 'warning') {
    return (
      <Badge variant="warning" className="gap-1 shrink-0">
        <AlertTriangle className="h-3 w-3" />
        {t('drivers.expiry.expiresInDays', { days: info.daysLeft })}
      </Badge>
    );
  }
  return (
    <Badge variant="success" className="gap-1 shrink-0">
      <CheckCircle className="h-3 w-3" />
      {t('drivers.expiry.valid')}
    </Badge>
  );
}