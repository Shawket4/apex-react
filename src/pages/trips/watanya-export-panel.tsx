import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { ChipRadioGroup } from '@/shared/ui/chip-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { toExportLang, type ExportFormat, type ExportLang } from '@/shared/api/download';
import type { WatanyaPdfPart } from '@/entities/trip/api';

export interface WatanyaExportRequest {
  lang: ExportLang;
  format: ExportFormat;
  part?: WatanyaPdfPart;
}

interface WatanyaExportPanelProps {
  /** No date range picked yet: the report is per range, so nothing to make. */
  disabled: boolean;
  /** The download in flight, if any — "xlsx", "summary" or "details". */
  pending: 'xlsx' | WatanyaPdfPart | null;
  onExport: (request: WatanyaExportRequest) => void;
}

/**
 * The Watanya report button and its options.
 *
 * The report's language is its own choice, defaulting to the app's: an Arabic
 * dashboard user may still owe Watanya an English copy. Excel is the whole
 * workbook in one file; the PDF comes as two files — the Summary and the Trip
 * Details — because they are printed and filed separately.
 */
export function WatanyaExportPanel({ disabled, pending, onExport }: WatanyaExportPanelProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [lang, setLang] = React.useState<ExportLang>(() => toExportLang(i18n.language));
  const [format, setFormat] = React.useState<ExportFormat>('xlsx');

  // Follow the app if its language changes while the panel is closed.
  React.useEffect(() => {
    if (!open) setLang(toExportLang(i18n.language));
  }, [i18n.language, open]);

  const busy = pending !== null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          data-testid="watanya-export-trigger"
        >
          {busy ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
          <span className="hidden sm:inline">{t('trips.actions.watanyaReport')}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4" data-testid="watanya-export-panel">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{t('trips.export.watanya.title')}</p>
          <p className="text-xs text-muted-foreground">{t('trips.export.watanya.hint')}</p>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {t('trips.export.watanya.language')}
          </p>
          <ChipRadioGroup<ExportLang>
            label={t('trips.export.watanya.language')}
            value={lang}
            onChange={setLang}
            edgeBleed={false}
            options={[
              { value: 'en', label: 'English' },
              { value: 'ar', label: 'عربي' },
            ]}
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {t('common.exportFormat.label')}
          </p>
          <ChipRadioGroup<ExportFormat>
            label={t('common.exportFormat.label')}
            value={format}
            onChange={setFormat}
            edgeBleed={false}
            options={[
              { value: 'xlsx', label: t('common.exportFormat.excel') },
              { value: 'pdf', label: t('common.exportFormat.pdf') },
            ]}
          />
        </div>

        {format === 'xlsx' ? (
          <Button
            className="w-full"
            disabled={busy}
            onClick={() => onExport({ lang, format: 'xlsx' })}
          >
            {pending === 'xlsx' ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
            {t('trips.export.watanya.downloadExcel')}
          </Button>
        ) : (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">{t('trips.export.watanya.pdfHint')}</p>
            <div className="grid grid-cols-2 gap-2">
              {(['summary', 'details'] as const).map((part) => (
                <Button
                  key={part}
                  disabled={busy}
                  onClick={() => onExport({ lang, format: 'pdf', part })}
                >
                  {pending === part ? <Loader2 className="animate-spin" /> : <FileText />}
                  {t(`trips.export.watanya.${part}`)}
                </Button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
