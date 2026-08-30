import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/shared/ui/toast';
import { Loader2, Pencil, Plus, Sparkles, X } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { SearchableSelect } from '@/shared/ui/searchable-select';
import { extractErrorMessage } from '@/shared/api/errors';
import { normalize } from '@/shared/lib/normalize';
import {
  useCreateFeeMapping,
  useUpdateFeeMapping,
  useFeeMappings,
} from '@/entities/fee-mapping/queries';
import { useDropoffs } from '@/entities/location/queries';
import type { FeeMapping } from '@/entities/fee-mapping/schemas';
import { TerminalSelect } from '@/widgets/terminal-select';
import type { SelectOption } from '@/shared/types';

interface FeeMappingsFormProps {
  /** Set when editing an existing mapping; null for create mode. */
  editing: FeeMapping | null;
  onCancelEdit: () => void;
  onSaved: () => void;
}

interface FormState {
  company: string;
  /** Canonical terminal name — legacy payload field. */
  terminal: string;
  /** Picked-by-id terminal reference (resolved from `terminal` on edit). */
  terminal_id: number | null;
  drop_off_point: string;
  distance: string;
  fee: string;
}

const emptyForm: FormState = {
  company: '',
  terminal: '',
  terminal_id: null,
  drop_off_point: '',
  distance: '',
  fee: '',
};

/**
 * Inline create/edit form for fee mappings.
 *
 * Five fields, simple layout, no fancy validation — distance and fee are
 * coerced to numbers on submit, the rest are passed through as strings.
 * The backend rejects invalid values, errors are surfaced via toast.
 */
export function FeeMappingsForm({
  editing,
  onCancelEdit,
  onSaved,
}: FeeMappingsFormProps) {
  const { t } = useTranslation();
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const isEdit = editing !== null;

  const { data: mappings = [] } = useFeeMappings();

  // Extract unique companies from existing mappings
  const companyOptions = React.useMemo<SelectOption<string>[]>(() => {
    const companies = Array.from(new Set(mappings.map((m) => m.company)));
    return companies.sort().map((c) => ({ value: c, label: c }));
  }, [mappings]);

  // Canonical drop-off points (the paginated Locations list) plus the names
  // already used by this company's mappings — a typed name matching neither
  // is created implicitly by the backend on submit.
  const dropoffsQuery = useDropoffs({ per_page: 200 });
  const dropOffOptions = React.useMemo<SelectOption<string>[]>(() => {
    if (!form.company) return [];
    const names = new Set<string>();
    for (const d of dropoffsQuery.data?.items ?? []) names.add(d.name);
    for (const m of mappings) {
      if (m.company === form.company) names.add(m.dropOffPoint);
    }
    return [...names].sort().map((p) => ({ value: p, label: p }));
  }, [mappings, form.company, dropoffsQuery.data]);

  /** True when the typed drop-off name matches no known point — the backend
   *  will create the point row implicitly. */
  const isNewDropoff = React.useMemo(() => {
    const typed = form.drop_off_point.trim();
    if (!typed) return false;
    const key = normalize(typed);
    const knownPoint = (dropoffsQuery.data?.items ?? []).some(
      (d) => normalize(d.name) === key,
    );
    const knownMapping = mappings.some((m) => normalize(m.dropOffPoint) === key);
    return !knownPoint && !knownMapping;
  }, [form.drop_off_point, dropoffsQuery.data, mappings]);

  // Hydrate form when entering edit mode. `terminal_id` starts null —
  // TerminalSelect resolves the legacy name against the company's allowed
  // terminals once they load.
  React.useEffect(() => {
    if (editing) {
      setForm({
        company: editing.company,
        terminal: editing.terminal,
        terminal_id: null,
        drop_off_point: editing.dropOffPoint,
        distance: String(editing.distance),
        fee: String(editing.fee),
      });
    } else {
      setForm(emptyForm);
    }
  }, [editing]);

  const createMutation = useCreateFeeMapping();
  const updateMutation = useUpdateFeeMapping();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const update = (patch: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      company: form.company.trim(),
      terminal: form.terminal.trim(),
      ...(form.terminal_id != null ? { terminal_id: form.terminal_id } : {}),
      drop_off_point: form.drop_off_point.trim(),
      distance: Number(form.distance),
      fee: Number(form.fee),
    };

    if (
      !payload.company ||
      !payload.terminal ||
      !payload.drop_off_point ||
      !Number.isFinite(payload.distance) ||
      payload.distance <= 0 ||
      !Number.isFinite(payload.fee) ||
      payload.fee < 0
    ) {
      toast.error(t('feeMappings.form.validation.fillRequired'));
      return;
    }

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input: payload });
        toast.success(t('feeMappings.form.updateSuccess'));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t('feeMappings.form.createSuccess'));
      }
      setForm(emptyForm);
      onSaved();
    } catch (err) {
      toast.error(
        extractErrorMessage(
          err,
          isEdit
            ? t('feeMappings.form.updateFailed')
            : t('feeMappings.form.createFailed'),
        ),
      );
    }
  };

  return (
    <Card className="shadow-none">
      <CardContent className="p-3">
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
              {isEdit ? <Pencil className="h-3 w-3" aria-hidden="true" /> : <Plus className="h-3 w-3" aria-hidden="true" />}
            </span>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {isEdit ? t('feeMappings.form.editTitle') : t('feeMappings.form.createTitle')}
            </h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label htmlFor="fm-company" className="text-xs">
                {t('feeMappings.fields.company')}
                <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect<string>
                id="fm-company"
                options={companyOptions}
                value={form.company}
                onChange={(v) =>
                  update(
                    v === form.company
                      ? { company: v }
                      : // Terminal allowlists are per-company — reset the pick
                        { company: v, terminal: '', terminal_id: null },
                  )
                }
                allowCustom
                placeholder={t('feeMappings.form.placeholders.company', 'Watanya…')}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="fm-terminal" className="text-xs">
                {t('feeMappings.fields.terminal')}
                <span className="text-destructive">*</span>
              </Label>
              <TerminalSelect
                id="fm-terminal"
                company={form.company}
                terminalId={form.terminal_id}
                terminalName={form.terminal}
                onSelect={(terminal) =>
                  update({ terminal: terminal.name, terminal_id: terminal.ID })
                }
                placeholder={t('feeMappings.form.placeholders.terminal', 'Cairo…')}
                disabled={!form.company}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="fm-dropoff" className="text-xs">
                {t('feeMappings.fields.dropOffPoint')}
                <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect<string>
                id="fm-dropoff"
                options={dropOffOptions}
                value={form.drop_off_point}
                onChange={(v) => update({ drop_off_point: v })}
                allowCustom
                placeholder={t('feeMappings.form.placeholders.dropOffPoint', 'Qena…')}
                disabled={!form.company}
              />
              {isNewDropoff && (
                <p className="flex items-start gap-1 text-[11px] text-muted-foreground">
                  <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                  <span dir="auto">
                    {t(
                      'feeMappings.form.newDropoffHint',
                      'New drop-off point will be created',
                    )}
                  </span>
                </p>
              )}
            </div>

            <Field
              id="fm-distance"
              label={t('feeMappings.fields.distance')}
              value={form.distance}
              onChange={(v) => update({ distance: v })}
              type="number"
              step="0.01"
              placeholder="0.00"
              required
            />
            <Field
              id="fm-fee"
              label={t('feeMappings.fields.fee')}
              value={form.fee}
              onChange={(v) => update({ fee: v })}
              type="number"
              step="0.01"
              placeholder="0.00"
              required
            />
          </div>

          <div className="mt-3 flex justify-end gap-2">
            {isEdit && (
              <Button type="button" variant="outline" size="sm" onClick={onCancelEdit}>
                <X aria-hidden="true" />
                {t('common.cancel')}
              </Button>
            )}
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {isEdit ? t('feeMappings.form.save') : t('feeMappings.form.add')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
  required?: boolean;
}

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  step,
  placeholder,
  required,
}: FieldProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={id}
        name={id}
        type={type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        autoComplete="off"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}
