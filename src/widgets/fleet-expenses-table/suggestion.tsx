import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, X } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { cn } from '@/shared/lib/cn';
import type { Classification } from '@/entities/transaction/schemas';
import { useSuggestionText } from './use-suggestion-text';

/* -------------------------------------------------------------------------- */
/* Classifier suggestions                                                      */
/*                                                                            */
/* The classifier writes what it is at least 95% sure of and suggests the      */
/* rest. A suggestion is only ever shown, never saved, until a person takes it  */
/* (an ordinary edit with the suggested values) or says "not this" (dismiss).  */
/* Both are recorded server-side, which is how the classifier learns.          */
/*                                                                            */
/* The look is the ledger's own: a category chip, but dashed — not decided     */
/* yet — with the same two-button vocabulary everywhere.                       */
/* -------------------------------------------------------------------------- */

/** "Fairly sure (75%)" — the confidence as a person reads it. */
function confidenceText(t: (k: string, o?: Record<string, unknown>) => string, c: number): string {
  const pct = Math.round(c * 100);
  return t('fleetExpenses.suggestion.confidence', { pct });
}

/**
 * The suggested category (and person) as a dashed chip. The reason rides on
 * hover/focus; on phones it is printed under the row instead.
 */
export function SuggestionChip({
  suggestion,
  className,
}: {
  suggestion: Classification;
  className?: string;
}) {
  const { t } = useTranslation();
  const { label, person } = useSuggestionText(suggestion);
  const text = [label, person].filter(Boolean).join(' · ');
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            'inline-flex min-w-0 max-w-full items-center rounded-full border border-dashed border-primary/60 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className,
          )}
          aria-label={t('fleetExpenses.suggestion.ariaChip', { text })}
        >
          {/* The person is a run of its own: an Arabic name inside an English
              chip then truncates at its own end, keeping the first name. */}
          {label && <span className="shrink-0 whitespace-nowrap">{label}</span>}
          {label && person && (
            <span className="shrink-0 px-1" aria-hidden="true">
              ·
            </span>
          )}
          {person && (
            <span className="min-w-0 truncate" dir="auto">
              {person}
            </span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs whitespace-normal">
        <p dir="auto">{suggestion.reason}</p>
        <p className="mt-1 opacity-70">{confidenceText(t, suggestion.confidence)}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/** The reason as a quiet line of text, for places with room to print it. */
export function SuggestionReason({
  suggestion,
  className,
}: {
  suggestion: Classification;
  className?: string;
}) {
  return (
    <p
      dir="auto"
      className={cn('text-xs text-muted-foreground [overflow-wrap:anywhere]', className)}
    >
      {suggestion.reason}
    </p>
  );
}

/**
 * Take it / not this. `accept` is omitted when the suggestion names only a
 * person: a category has to be chosen first, so only "not this" is offered.
 */
export function SuggestionButtons({
  onAccept,
  onDismiss,
  accepting,
  dismissing,
  size = 'icon',
  className,
}: {
  onAccept?: () => void;
  onDismiss: () => void;
  accepting?: boolean;
  dismissing?: boolean;
  /** 'icon': compact table buttons. 'full': labelled, thumb-sized (phones). */
  size?: 'icon' | 'full';
  className?: string;
}) {
  const { t } = useTranslation();
  const busy = accepting || dismissing;
  const stop = (fn?: () => void) => (e: React.MouseEvent) => {
    // Rows open the edit form on click; these buttons must not.
    e.stopPropagation();
    fn?.();
  };

  if (size === 'full') {
    return (
      <div className={cn('flex gap-2', className)}>
        {onAccept && (
          <Button
            type="button"
            size="sm"
            className="min-h-10 flex-1"
            disabled={busy}
            onClick={stop(onAccept)}
          >
            {accepting ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Check aria-hidden="true" />
            )}
            {t('fleetExpenses.suggestion.accept')}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-10 flex-1 text-muted-foreground"
          disabled={busy}
          onClick={stop(onDismiss)}
        >
          {dismissing ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <X aria-hidden="true" />
          )}
          {t('fleetExpenses.suggestion.dismiss')}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex shrink-0 items-center gap-0.5', className)}>
      {onAccept && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              disabled={busy}
              onClick={stop(onAccept)}
              aria-label={t('fleetExpenses.suggestion.accept')}
              className="flex h-7 w-7 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {accepting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>{t('fleetExpenses.suggestion.accept')}</TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled={busy}
            onClick={stop(onDismiss)}
            aria-label={t('fleetExpenses.suggestion.dismiss')}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {dismissing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>{t('fleetExpenses.suggestion.dismiss')}</TooltipContent>
      </Tooltip>
    </div>
  );
}

/**
 * A quiet "auto" tag beside a category the classifier wrote itself, so a
 * person can always see why a row was filled in without them.
 */
export function AutoTag({ decision }: { decision: Classification }) {
  const { t } = useTranslation();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="inline-flex shrink-0 items-center rounded-sm px-1 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground/80 ring-1 ring-inset ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('fleetExpenses.suggestion.autoAria', { reason: decision.reason })}
        >
          {t('fleetExpenses.suggestion.auto')}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs whitespace-normal">
        <p className="font-medium">{t('fleetExpenses.suggestion.autoTitle')}</p>
        <p className="mt-0.5" dir="auto">
          {decision.reason}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * The suggestion at the top of the edit form: what, why, how sure, and two
 * ways out. "Use this" fills the fields; nothing saves until Save.
 */
export function SuggestionBanner({
  suggestion,
  onUse,
  onDismiss,
  dismissing,
  disabled,
  className,
}: {
  suggestion: Classification;
  onUse: () => void;
  onDismiss: () => void;
  dismissing?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const { label, person } = useSuggestionText(suggestion);
  return (
    <div
      className={cn(
        'space-y-2.5 rounded-lg border border-dashed border-primary/50 bg-primary/5 px-3 py-2.5 text-sm',
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          {t('fleetExpenses.suggestion.title')}
        </span>
        <span className="font-medium" dir="auto">
          {[label, person].filter(Boolean).join(' · ')}
        </span>
        <span className="text-xs text-muted-foreground">
          {confidenceText(t, suggestion.confidence)}
        </span>
      </div>
      <SuggestionReason suggestion={suggestion} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          size="sm"
          className="min-h-10 sm:min-h-8"
          disabled={disabled}
          onClick={onUse}
        >
          <Check aria-hidden="true" />
          {t('fleetExpenses.suggestion.use')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="min-h-10 text-muted-foreground sm:min-h-8"
          disabled={disabled || dismissing}
          onClick={onDismiss}
        >
          {dismissing ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <X aria-hidden="true" />
          )}
          {t('fleetExpenses.suggestion.dismiss')}
        </Button>
      </div>
    </div>
  );
}
