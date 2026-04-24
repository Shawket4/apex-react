import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileImage,
  Upload,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Eye,
  X,
  RotateCw,
  ZoomIn,
  ZoomOut,
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

interface DocumentsTabProps {
  driver: Driver;
}

interface DocumentCard {
  key: string;
  label: string;
  dateField: keyof Driver;
  frontField: keyof Driver;
  backField?: keyof Driver;
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
      dateField: 'driver_license_expiration_date',
      frontField: 'driver_license_image_name',
      backField: 'driver_license_image_name_back',
    },
    {
      key: 'id_license',
      label: t('drivers.docs.idLicense'),
      dateField: 'id_license_expiration_date',
      frontField: 'id_license_image_name',
      backField: 'id_license_image_name_back',
    },
    {
      key: 'safety_license',
      label: t('drivers.docs.safetyLicense'),
      dateField: 'safety_license_expiration_date',
      frontField: 'safety_license_image_name',
    },
    {
      key: 'drug_test',
      label: t('drivers.docs.drugTest'),
      dateField: 'drug_test_expiration_date',
      frontField: 'drug_test_image_name',
    },
  ];

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

  const getExpiryStatus = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'unknown';
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
    if (diff < 0) return 'expired';
    if (diff <= 30) return 'warning';
    return 'valid';
  };

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      {canEdit && (
        <div className="flex justify-end gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setFiles({}); }}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={updateDocs.isPending}>
                {updateDocs.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t('common.save')}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}>
              {t('common.edit')}
            </Button>
          )}
        </div>
      )}

      {/* Document cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {docs.map((doc) => {
          const dateValue = driver[doc.dateField] as string | null;
          const frontImage = driver[doc.frontField] as string | null;
          const backImage = doc.backField ? (driver[doc.backField] as string | null) : null;
          const status = getExpiryStatus(dateValue);

          return (
            <Card key={doc.key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <FileImage className="h-4 w-4 text-muted-foreground" />
                    {doc.label}
                  </CardTitle>
                  {status === 'valid' && (
                    <Badge variant="success"><CheckCircle className="h-3 w-3" />{t('drivers.expiry.valid')}</Badge>
                  )}
                  {status === 'warning' && (
                    <Badge variant="warning"><AlertTriangle className="h-3 w-3" />{t('drivers.expiry.expiresSoon', { days: '' })}</Badge>
                  )}
                  {status === 'expired' && (
                    <Badge variant="destructive"><AlertTriangle className="h-3 w-3" />{t('drivers.expiry.expired')}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Expiry date */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('drivers.fields.expiryDate')}</p>
                  {editing ? (
                    <DatePicker
                      value={dates[doc.dateField as keyof typeof dates] || ''}
                      onChange={(v) => handleDateChange(doc.dateField as string, v)}
                    />
                  ) : (
                    <p className="text-sm font-medium">{dateValue ? fmtDate(dateValue) : '—'}</p>
                  )}
                </div>

                {/* Image buttons */}
                <div className="flex flex-wrap gap-2">
                  {frontImage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewImage(frontImage, `${doc.label} — ${t('drivers.docs.front')}`)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {t('drivers.docs.front')}
                    </Button>
                  )}
                  {backImage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewImage(backImage, `${doc.label} — ${t('drivers.docs.back')}`)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {t('drivers.docs.back')}
                    </Button>
                  )}
                  {!frontImage && !editing && (
                    <span className="text-xs text-muted-foreground">{t('drivers.docs.noImage')}</span>
                  )}
                </div>

                {/* Upload inputs (edit mode) */}
                {editing && (
                  <div className="space-y-2">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-2 text-sm text-muted-foreground hover:bg-muted/30">
                      <Upload className="h-4 w-4" />
                      {files[`${doc.key}_front`]?.name ?? t('drivers.docs.uploadFront')}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileChange(`${doc.key}_front`, e.target.files[0])}
                      />
                    </label>
                    {doc.backField && (
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-2 text-sm text-muted-foreground hover:bg-muted/30">
                        <Upload className="h-4 w-4" />
                        {files[`${doc.key}_back`]?.name ?? t('drivers.docs.uploadBack')}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleFileChange(`${doc.key}_back`, e.target.files[0])}
                        />
                      </label>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Image preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center gap-2 py-2">
            <Button variant="outline" size="icon" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setZoom((z) => Math.min(3, z + 0.25))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setRotation((r) => r + 90)}>
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={closePreview}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-center overflow-auto rounded-lg bg-muted/30 p-4" style={{ maxHeight: '70vh' }}>
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
