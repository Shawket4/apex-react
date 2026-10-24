import { useTranslation } from 'react-i18next';
import { Check, Loader2, TriangleAlert } from 'lucide-react';
import type { ToolRun } from '@/entities/advisor';
import { cn } from '@/shared/lib/cn';

/** "Looking at revenue…" for a tool the advisor is running right now. */
function useToolLabel() {
  const { t } = useTranslation();
  return (name: string) => t(`advisor.tools.${name}`, { defaultValue: name });
}

/**
 * The tools of the turn in flight: every finished one ticked, the latest
 * spinning. They come from `event: tool`, one per start.
 */
export function LiveToolChips({ tools }: { tools: string[] }) {
  const label = useToolLabel();
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-live="polite">
      {tools.length === 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          {t('advisor.chat.thinking')}
        </span>
      )}
      {tools.map((name, i) => {
        const current = i === tools.length - 1;
        return (
          <span
            key={`${name}:${i}`}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]',
              current
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'bg-card text-muted-foreground',
            )}
          >
            {current ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-3 w-3" aria-hidden="true" />
            )}
            {label(name)}
          </span>
        );
      })}
    </div>
  );
}

/** What an answer used, after the fact: name, time, and whether it worked. */
export function ToolRunChips({ tools }: { tools: ToolRun[] }) {
  const { t } = useTranslation();
  if (tools.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {tools.map((tool, i) => (
        <span
          key={`${tool.name}:${i}`}
          title={tool.ok === false ? t('advisor.chat.toolFailed') : undefined}
          className={cn(
            'inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground',
            tool.ok === false && 'bg-destructive/10 text-destructive',
          )}
        >
          {tool.ok === false && <TriangleAlert className="h-2.5 w-2.5" aria-hidden="true" />}
          {tool.name}
          {typeof tool.ms === 'number' && (
            <span className="tabular-nums opacity-70">
              {tool.ms >= 1000 ? `${(tool.ms / 1000).toFixed(1)} s` : `${tool.ms} ms`}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
