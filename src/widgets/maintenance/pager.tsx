import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/ui/button';

interface PagerProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Previous / next for a server-paged list. Renders nothing for a single page. */
export function Pager({ page, totalPages, onPageChange, className }: PagerProps) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="rtl:rotate-180" aria-hidden="true" />
          {t('common.previous')}
        </Button>
        <span className="text-xs tabular-nums text-muted-foreground" dir="ltr">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          {t('common.next')}
          <ChevronRight className="rtl:rotate-180" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
