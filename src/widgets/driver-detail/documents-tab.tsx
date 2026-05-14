import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Eye,
  RotateCw,
  ZoomIn,
  ZoomOut,
  IdCard,
  HardHat,
  FlaskConical,
  Hash,
  Check,
} from 'lucide-react';
import type { Driver } from '@/entities/driver/schemas';
import { getDocumentImage } from '@/entities/driver/api';
import { useUpdateDriverDocuments } from '@/entities/driver/queries';
import { Button } from '@/shared/ui/button';
import { DatePicker } from '@/shared/ui/date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { fmtDate } from '@/shared/lib/format';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { PERMISSION_LEVELS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';

interface DocumentsTabProps {
  driver: Driver;
}

interface DocumentCard {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  dateField: keyof Driver;
  frontField: keyof Driver;
  backField?: keyof Driver;
}

type ExpiryStatus = 'valid' | 'warning' | 'expired' | 'unknown';

function getExpiryStatus(dateStr: string | null | undefined): {
  status: ExpiryStatus;
  daysLeft: number | null;
} {
  if (!dateStr) return { status: 'unknown', daysLeft: null };
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return { status: 'expired', daysLeft: diff };
  if (diff <= 30) return { status: 'warning', daysLeft: diff };
  return { status: 'valid', daysLeft: diff };
}

export function DocumentsTab({ driver }: DocumentsTabProps) {
  const { t } = useTranslation();
  const { atLeast } = usePermissions();
  const canEdit = atLeast(PERMISSION_LEVELS.MANAGER);
  const updateDocs = useUpdateDriverDocuments();

  const [editing, setEditing] = React.useState(false);
  const [dates, setDates] = React.useState({
    id_license_expiration_date: driver.id_license_expiration_date ?? '',
    driver_license_expiration_date: driver.driver_license_expiration_date ?? '',
    safety_license_expiration_date: driver.safety_license_expiration_date ?? '',
    drug_test_expiration_date: driver.drug_test_expiration_date ?? '',
  });
  const [files, setFiles] = React.useState<Record<string, File>>({});
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = React.useState('');
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);

  const docs: DocumentCard[] = [
    {
      key: 'driver_license',
      label: t('drivers.docs.driverLicense'),
      icon: IdCard,
      dateField: 'driver_license_expiration_date',
      frontField: 'driver_license_image_name',
      backField: 'driver_license_image_name_back',
    },
    {
      key: 'id_license',
      label: t('drivers.docs.idLicense'),
      icon: Hash,
      dateField: 'id_license_expiration_date',
      frontField: 'id_license_image_name',
      backField: 'id_license_image_name_back',
    },
    {
      key: 'safety_license',
      label: t('drivers.docs.safetyLicense'),
      icon: HardHat,
      dateField: 'safety_license_expiration_date',
      frontField: 'safety_license_image_name',
    },
    {
      key: 'drug_test',
      label: t('drivers.docs.drugTest'),
      icon: FlaskConical,
      dateField: 'drug_test_expiration_date',
      frontField: 'drug_test_image_name',
    },
  ];

  const cancelEditing = () => {
    setEditing(false);
    setFiles({});
    setDates({
      id_license_expiration_date: driver.id_license_expiration_date ?? '',
      driver_license_expiration_date: driver.driver_license_expiration_date ?? '',
      safety_license_expiration_date: driver.safety_license_expiration_date ?? '',
      drug_test_expiration_date: driver.drug_test_expiration_date ?? '',
    });
  };

  const handleFileChange = (fieldKey: string, file: File) => {
    setFiles((prev) => ({ ...prev, [fieldKey]: file }));
  };

  const handleDateChange = (field: string, value: string) => {
    setDates((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateDocs.mutate(
      {
        id: driver.ID,
        payload: {
          ID: driver.ID,
          name: driver.name,
          mobile_number: driver.mobile_number ?? '',
          transporter: driver.transporter ?? 'Apex',
          social_security_number: driver.social_security_number ?? '',
          ...dates,
        },
        files,
      },
      {
        onSuccess: () => {
          setEditing(false);
          setFiles({});
        },
      },
    );
  };

  const handleViewImage = async (imagePath: string, title: string) => {
    try {
      const url = await getDocumentImage(imagePath);
      setPreviewUrl(url);
      setPreviewTitle(title);
      setZoom(1);
      setRotation(0);
    } catch {
      // Toast handled by API layer
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewTitle('');
  };

  const hasDirtyFiles = Object.keys(files).length > 0;

  return (
    <div className="space-y-4">
      {/* Actions — right-aligned header bar */}
      {canEdit && (
        <div className="flex items-center justify-end gap-2">
          {editing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelEditing}
                disabled={updateDocs.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateDocs.isPending}>
                {updateDocs.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t('common.save')}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              {t('common.edit')}
            </Button>
          )}
        </div>
      )}

      {/* Document cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {docs.map((doc) => {
          const dateValue = driver[doc.dateField] as string | null;
          const frontImage = driver[doc.frontField] as string | null;
          const backImage = doc.backField ? (driver[doc.backField] as string | null) : null;
          const { status, daysLeft } = getExpiryStatus(dateValue);
          const DocIcon = doc.icon;

          return (
            <Card
              key={doc.key}
              className={cn(
                status === 'expired' && 'border-destructive/30',
                status === 'warning' && 'border-warning/30',
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
                    <DocIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{doc.label}</span>
                  </CardTitle>
                  {status === 'valid' && (
                    <Badge variant="success" className="gap-1 shrink-0">
                      <CheckCircle className="h-3 w-3" />
                      {t('drivers.expiry.valid')}
                    </Badge>
                  )}
                  {status === 'warning' && (
                    <Badge variant="warning" className="gap-1 shrink-0">
                      <AlertTriangle className="h-3 w-3" />
                      {t('drivers.expiry.expiresInDays', { days: daysLeft })}
                    </Badge>
                  )}
                  {status === 'expired' && (
                    <Badge variant="destructive" className="gap-1 shrink-0">
                      <AlertTriangle className="h-3 w-3" />
                      {t('drivers.expiry.expired')}
                    </Badge>
                  )}
                  {status === 'unknown' && (
                    <Badge variant="secondary" className="shrink-0">
                      {t('drivers.expiry.notSet')}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Expiry date */}
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    {t('drivers.fields.expiryDate')}
                  </p>
                  {editing ? (
                    <DatePicker
                      value={dates[doc.dateField as keyof typeof dates] || ''}
                      onChange={(v) => handleDateChange(doc.dateField as string, v)}
                      max="2099-12-31"
                    />
                  ) : (
                    <p className="text-sm font-medium">
                      {dateValue ? fmtDate(dateValue) : '—'}
                    </p>
                  )}
                </div>

                {/* Document images — view + upload inline per side */}
                <div className="space-y-2">
                  {/* Front */}
                  <DocumentImageRow
                    label={t('drivers.docs.front')}
                    existingImage={frontImage}
                    selectedFile={files[`${doc.key}_front`]}
                    editing={editing}
                    onView={() =>
                      frontImage &&
                      handleViewImage(
                        frontImage,
                        `${doc.label} — ${t('drivers.docs.front')}`,
                      )
                    }
                    onFileSelect={(f) => handleFileChange(`${doc.key}_front`, f)}
                    t={t}
                  />
                  {/* Back (only on docs that have a back side) */}
                  {doc.backField && (
                    <DocumentImageRow
                      label={t('drivers.docs.back')}
                      existingImage={backImage}
                      selectedFile={files[`${doc.key}_back`]}
                      editing={editing}
                      onView={() =>
                        backImage &&
                        handleViewImage(
                          backImage,
                          `${doc.label} — ${t('drivers.docs.back')}`,
                        )
                      }
                      onFileSelect={(f) => handleFileChange(`${doc.key}_back`, f)}
                      t={t}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dirty-state hint when user has picked files but not saved */}
      {editing && hasDirtyFiles && (
        <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-2.5 text-xs text-muted-foreground">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            {t('drivers.docs.filesReadyToUpload', { count: Object.keys(files).length })}
          </span>
        </div>
      )}

      {/* Image preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center gap-2 py-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setRotation((r) => r + 90)}
              aria-label="Rotate"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
          <div
            className="flex items-center justify-center overflow-auto rounded-lg bg-muted/30 p-4"
            style={{ maxHeight: '70vh' }}
          >
            {previewUrl && (
              <img
                src={previewUrl}
                alt={previewTitle}
                className="transition-transform duration-200"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  maxWidth: '100%',
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* DocumentImageRow — a single side of a document (front / back)               */
/*                                                                             */
/* View mode:  [👁 View]      or   "no image uploaded"                         */
/* Edit mode:  [👁 View] [↑ Replace]  or  [↑ Upload]                           */
/*             When a new file is picked, shows a green check + filename.      */
/* -------------------------------------------------------------------------- */

function DocumentImageRow({
  label,
  existingImage,
  selectedFile,
  editing,
  onView,
  onFileSelect,
  t,
}: {
  label: string;
  existingImage: string | null;
  selectedFile?: File;
  editing: boolean;
  onView: () => void;
  onFileSelect: (file: File) => void;
  t: (k: string) => string;
}) {
  const fileInputId = React.useId();

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-12 shrink-0 text-muted-foreground">{label}</span>

      {existingImage && (
        <Button variant="outline" size="sm" className="h-7" onClick={onView}>
          <Eye className="h-3.5 w-3.5" />
          {t('common.view')}
        </Button>
      )}

      {editing && (
        <>
          <label
            htmlFor={fileInputId}
            className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium shadow-sm hover:bg-muted/50"
          >
            <Upload className="h-3.5 w-3.5" />
            {existingImage
              ? t('drivers.docs.replace')
              : t('drivers.docs.upload')}
          </label>
          <input
            id={fileInputId}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
          />
        </>
      )}

      {!existingImage && !editing && (
        <span className="text-muted-foreground">{t('drivers.docs.noImage')}</span>
      )}

      {selectedFile && (
        <span className="flex min-w-0 items-center gap-1 text-primary">
          <Check className="h-3 w-3 shrink-0" />
          <span className="truncate">{selectedFile.name}</span>
        </span>
      )}
    </div>
  );
}