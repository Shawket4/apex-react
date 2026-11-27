import { useTranslation } from 'react-i18next';

/** A garage word (status, reason, origin, event) in the reader's language;
 * one this build has never heard of is shown as it came. */
export function useGarageWord() {
  const { t } = useTranslation();
  return (group: string, value: string | null) =>
    value ? t(`maintenance.${group}.${value}`, { defaultValue: value }) : '—';
}
