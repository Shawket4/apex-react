import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, Sparkles, X } from 'lucide-react';
import {
  serviceName,
  useApproveSuggestion,
  useRejectSuggestion,
  type Suggestion,
  type SuggestionStatus,
} from '@/entities/advisor';
import { useAuthStore } from '@/shared/auth/store';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { cn } from '@/shared/lib/cn';
import { SuggestionDiffTable } from './suggestion-diff-table';
import {
  describeResult,
  formatInstant,
  humanizeField,
  isSuccessStatus,
  makeValueFormatter,
  resetReason,
} from './suggestion-diff';

const STATUS_VARIANT: Record<SuggestionStatus, 'secondary' | 'warning' | 'success' | 'destructive' | 'outline'> = {
  pending: 'warning',
  applying: 'secondary',
  applied: 'success',
  failed: 'destructive',
  rejected: 'outline',
};

interface SuggestionCardProps {
  suggestion: Suggestion;
  className?: string;
}

/**
 * One proposed change: what and why, the before → after, and the decision.
 * Approving applies it in the system that owns the record (FalconGo,
 * maintenance, or the bank ledger) under the signed-in user's name, marked as
 * made via AI — the confirm dialog says so before anything is sent.
 */
export function SuggestionCard({ suggestion, className }: SuggestionCardProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language ?? 'en';
  const userName = useAuthStore((s) => s.user?.name ?? '');
  const approve = useApproveSuggestion();
  const reject = useRejectSuggestion();
  const [confirming, setConfirming] = React.useState(false);

  // The decision's answer is the freshest copy until the list refetches.
  const s = approve.data?.id === suggestion.id
    ? approve.data
    : reject.data?.id === suggestion.id
      ? reject.data
      : suggestion;
  const busy = approve.isPending || reject.isPending;
  const service = serviceName(s.target, t);
  const result = describeResult(s.result, s.status, t('advisor.suggestion.refusedGeneric'));
  const reset = s.status === 'rejected' ? resetReason(s.result) : null;
  const formatValue = React.useMemo(
    () => makeValueFormatter((key, fallback) => t(key, fallback), language),
    [t, language],
  );

  const onApprove = async () => {
    try {
      await approve.mutateAsync(s.id);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className={cn('rounded-lg border bg-card p-3 text-card-foreground shadow-sm', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
            {t(`advisor.suggestion.kinds.${s.kind}`, humanizeField(s.kind))}
            <span aria-hidden="true">·</span>
            <span className="normal-case tracking-normal">{service}</span>
          </p>
          <h4 dir="auto" className="text-sm font-semibold">
            {s.title}
          </h4>
        </div>
        <Badge variant={STATUS_VARIANT[s.status]}>
          {s.status === 'applying' && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
          {t(`advisor.suggestion.status.${s.status}`)}
        </Badge>
      </div>

      {s.rationale && (
        <p dir="auto" className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {s.rationale}
        </p>
      )}

      <div className="mt-3">
        <SuggestionDiffTable
          before={s.before}
          after={s.after}
          labels={{
            field: t('advisor.suggestion.field'),
            before: t('advisor.suggestion.before'),
            after: t('advisor.suggestion.after'),
          }}
          fieldLabel={(f) => t(`advisor.suggestion.fields.${f}`, humanizeField(f))}
          formatValue={formatValue}
        />
      </div>

      {(s.status === 'applied' || s.status === 'failed') && (
        <div
          role="status"
          className={cn(
            'mt-3 rounded-md border px-3 py-2 text-xs',
            s.status === 'applied'
              ? 'border-success/40 bg-success/10 text-success'
              : 'border-destructive/40 bg-destructive/10 text-destructive',
          )}
        >
          <p className="font-medium">
            {s.status === 'applied'
              ? t('advisor.suggestion.appliedAt', {
                  service,
                  date: s.applied_at ? formatInstant(s.applied_at, language) : '',
                })
              : s.result_status == null || isSuccessStatus(s.result_status)
                ? // A 2xx that failed is one operation refused inside an accepted
                  // request (maint-rust's per-operation conflict): the code says nothing.
                  t('advisor.suggestion.failedNoStatus', { service })
                : t('advisor.suggestion.failedWith', { service, status: s.result_status })}
          </p>
          {result && (
            <p dir="auto" className="mt-1 break-words opacity-90">
              {result}
            </p>
          )}
        </div>
      )}

      {s.status === 'rejected' && (s.decided_at || reset) && (
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          {s.decided_at && (
            <p>{t('advisor.suggestion.rejectedAt', { date: formatInstant(s.decided_at, language) })}</p>
          )}
          {reset && (
            <p className="break-words">
              <span className="font-medium">{t('advisor.suggestion.resetLead')}</span>{' '}
              <span dir="auto">{reset}</span>
            </p>
          )}
        </div>
      )}

      {s.status === 'pending' && (
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => reject.mutate(s.id)}
          >
            {reject.isPending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <X aria-hidden="true" />
            )}
            {t('advisor.suggestion.reject')}
          </Button>
          <Button size="sm" disabled={busy} onClick={() => setConfirming(true)}>
            <Check aria-hidden="true" />
            {t('advisor.suggestion.approve')}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => !approve.isPending && setConfirming(open)}
        variant="default"
        title={t('advisor.suggestion.confirmTitle')}
        description={t('advisor.suggestion.confirmDescription', {
          title: s.title,
          service,
          name: userName || t('advisor.suggestion.you'),
        })}
        confirmLabel={t('advisor.suggestion.approveAndApply')}
        loading={approve.isPending}
        onConfirm={onApprove}
      />
    </div>
  );
}
