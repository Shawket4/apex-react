import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { toast } from '@/shared/ui/toast';
import { SearchableSelect } from '@/shared/ui/searchable-select';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { normalize } from '@/shared/lib/normalize';
import { useResolveTerminal, useTerminals } from '@/entities/location/queries';
import type { Terminal } from '@/entities/location/schemas';
import type { SelectOption } from '@/shared/types';

interface TerminalSelectProps {
  id?: string;
  /** Options are the terminals allowed for this company. */
  company: string;
  /** Selected terminal id — the canonical value the caller stores. */
  terminalId: number | null;
  /**
   * Legacy free-text terminal name (from existing records / URL params).
   * When `terminalId` is unset, a case/diacritic-insensitive match against
   * the company's terminals auto-selects; an unmatched name shows a hint
   * prompting the user to pick or create.
   */
  terminalName?: string;
  onSelect: (terminal: Terminal) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Extra hint shown under the field when the legacy name is unresolved. */
  className?: string;
}

/**
 * Company-filtered terminal combobox backed by `GET /api/terminals?company=X`.
 *
 * Terminals are picked-by-id entities now (free-text + aliases are gone). If
 * the typed text matches no option, a create affordance offers
 * `POST /api/terminals` — resolve-or-create-or-extend — behind a confirmation
 * dialog, then selects the resulting terminal.
 */
export function TerminalSelect({
  id,
  company,
  terminalId,
  terminalName,
  onSelect,
  disabled,
  placeholder,
  className,
}: TerminalSelectProps) {
  const { t } = useTranslation();
  const trimmedCompany = company.trim();

  const { data: terminals = [], isSuccess } = useTerminals(trimmedCompany, {
    enabled: !!trimmedCompany,
  });

  const resolveTerminal = useResolveTerminal();
  const [pendingName, setPendingName] = React.useState<string | null>(null);

  const options = React.useMemo<SelectOption<number>[]>(
    () =>
      terminals.map((terminal) => ({
        value: terminal.ID,
        label: terminal.name,
        description: terminal.address ?? undefined,
      })),
    [terminals],
  );

  /* ---- Resolve legacy free-text names to ids once options arrive -------- */

  const legacyName = terminalName?.trim() ?? '';
  React.useEffect(() => {
    if (terminalId != null || !legacyName || !isSuccess) return;
    const match = terminals.find((term) => normalize(term.name) === normalize(legacyName));
    if (match) onSelect(match);
    // `onSelect` is intentionally omitted — parents pass inline closures and
    // the effect must not re-fire on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalId, legacyName, isSuccess, terminals]);

  const unresolved = terminalId == null && !!legacyName && isSuccess;

  /* ---- Create / extend flow --------------------------------------------- */

  const handleConfirmCreate = async () => {
    if (!pendingName || !trimmedCompany) return;
    try {
      const result = await resolveTerminal.mutateAsync({
        name: pendingName,
        company: trimmedCompany,
      });
      toast.success(
        result.created
          ? t('terminalSelect.toastCreated', 'Terminal created')
          : t('terminalSelect.toastExtended', {
              name: result.terminal.name,
              company: trimmedCompany,
              defaultValue: "Terminal '{{name}}' allowed for {{company}}",
            }),
      );
      setPendingName(null);
      onSelect(result.terminal);
    } catch {
      // Error toast handled by the mutation
    }
  };

  return (
    <div className={className}>
      <SearchableSelect<number>
        id={id}
        options={options}
        value={terminalId}
        onChange={(v) => {
          const terminal = terminals.find((term) => term.ID === Number(v));
          if (terminal) onSelect(terminal);
        }}
        disabled={disabled || !trimmedCompany}
        placeholder={placeholder}
        onCreate={(text) => setPendingName(text)}
        createLabel={(text) =>
          t('terminalSelect.createOption', {
            name: text,
            defaultValue: "Create terminal '{{name}}'",
          })
        }
      />
      {unresolved && (
        <p className="mt-1 flex items-start gap-1.5 text-[11px] font-medium text-warning" role="status">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          <span dir="auto">
            {t('terminalSelect.unresolved', {
              name: legacyName,
              company: trimmedCompany,
              defaultValue:
                "'{{name}}' is not in {{company}}'s allowed terminals — pick one or create it.",
            })}
          </span>
        </p>
      )}

      <ConfirmDialog
        open={pendingName !== null}
        onOpenChange={(open) => {
          if (!open) setPendingName(null);
        }}
        variant="default"
        lottieSrc="/animations/warning.lottie"
        title={t('terminalSelect.confirmTitle', 'Create terminal?')}
        description={t('terminalSelect.confirmBody', {
          name: pendingName ?? '',
          company: trimmedCompany,
          defaultValue:
            "This will create a new terminal '{{name}}' — or allow an existing one with this name — for {{company}}.",
        })}
        confirmLabel={t('terminalSelect.confirmAction', 'Create terminal')}
        loading={resolveTerminal.isPending}
        onConfirm={handleConfirmCreate}
      />
    </div>
  );
}
