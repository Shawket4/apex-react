import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus, X } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { SearchableSelect } from '@/shared/ui/searchable-select';
import { extractErrorMessage } from '@/shared/api/errors';
import {
  useCreateFeeMapping,
  useUpdateFeeMapping,
  useFeeMappings,
} from '@/entities/fee-mapping/queries';
import type { FeeMapping } from '@/entities/fee-mapping/schemas';
import type { SelectOption } from '@/shared/types';

interface FeeMappingsFormProps {
  /** Set when editing an existing mapping; null for create mode. */
  editing: FeeMapping | null;
  onCancelEdit: () => void;
  onSaved: () => void;
}

interface FormState {
  company: string;
  terminal: string;
  drop_off_point: string;
  distance: string;
  fee: string;
}

const emptyForm: FormState = {
  company: '',
  terminal: '',
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

  // Extract unique drop-off points for the selected company
  const dropOffOptions = React.useMemo<SelectOption<string>[]>(() => {
    if (!form.company) return [];
    const points = Array.from(
      new Set(
        mappings
          .filter((m) => m.company === form.company)
          .map((m) => m.dropOffPoint),
      ),
    );
    return points.sort().map((p) => ({ value: p, label: p }));
  }, [mappings, form.company]);

  // Extract unique terminals for the selected company
  const terminalOptions = React.useMemo<SelectOption<string>[]>(() => {
    if (!form.company) return [];
    const points = Array.from(
      new Set(
        mappings
          .filter((m) => m.company === form.company)
          .map((m) => m.terminal),
      ),
    );
    return points.sort().map((p) => ({ value: p, label: p }));
  }, [mappings, form.company]);

  // Hydrate form when entering edit mode
  React.useEffect(() => {
    if (editing) {
      setForm({
        company: editing.company,
        terminal: editing.terminal,
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
    <Card>
      <CardContent className="p-4 sm:p-5">
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
              {isEdit ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            </span>
            <h3 className="text-sm font-semibold">
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
                onChange={(v) => update({ company: v })}
                allowCustom
                placeholder="Watanya"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="fm-terminal" className="text-xs">
                {t('feeMappings.fields.terminal')}
                <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect<string>
                id="fm-terminal"
                options={terminalOptions}
                value={form.terminal}
                onChange={(v) => update({ terminal: v })}
                allowCustom
                placeholder="Cairo"
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
                placeholder="Qena"
                disabled={!form.company}
              />
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
                <X className="me-1.5 h-3.5 w-3.5" />
                {t('common.cancel')}
              </Button>
            )}
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending && <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />}
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
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}
