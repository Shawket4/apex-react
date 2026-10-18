import { useTranslation } from 'react-i18next';
import { ChevronDown, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import type { ExportFormat } from '@/shared/api/download';
import { cn } from '@/shared/lib/cn';

export interface ExportFormatMenuProps {
  /** Button label (already translated). */
  label: string;
  /** Hide the label below `sm`, for crowded toolbars. Keeps an aria-label. */
  compactLabel?: boolean;
  pending?: boolean;
  disabled?: boolean;
  className?: string;
  onExport: (format: ExportFormat) => void;
}

/**
 * An export button that asks which file to make: the Excel workbook or a PDF
 * of the same sheets. One control rather than two buttons, so a toolbar that
 * had one "Export" keeps one.
 */
export function ExportFormatMenu({
  label,
  compactLabel = false,
  pending = false,
  disabled = false,
  className,
  onExport,
}: ExportFormatMenuProps) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
          disabled={disabled || pending}
          aria-label={label}
          data-testid="export-format-trigger"
        >
          {pending ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
          <span className={cn(compactLabel && 'hidden sm:inline')}>{label}</span>
          <ChevronDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t('common.exportFormat.label')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onExport('xlsx')}>
          <FileSpreadsheet className="h-4 w-4" />
          {t('common.exportFormat.excel')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport('pdf')}>
          <FileText className="h-4 w-4" />
          {t('common.exportFormat.pdf')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
