import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { formatNumber } from '@/shared/lib/format';
import { describeMappingFee, methodsFromRules, PRICING_VIEW_LEVEL } from './masking';
import { usePricingRules } from './queries';

/**
 * A labeller for one company's route fees: "Band 5", "117.50 EGP per 1,000 L",
 * or null (below permission 3, per-km companies, unknown companies).
 *
 * The rules are only asked for at permission 3+, which is where the server
 * allows them; until they land the seeded methods stand in.
 */
export function useMappingFeeLabel(company: string): (fee: number | string | null | undefined) => string | null {
  const { t } = useTranslation();
  const { level } = usePermissions();
  const { data: companies } = usePricingRules({ enabled: level >= PRICING_VIEW_LEVEL });
  const method = React.useMemo(() => methodsFromRules(companies)[company], [companies, company]);

  return React.useCallback(
    (fee) => {
      const d = describeMappingFee(level, method, fee);
      if (!d) return null;
      return d.kind === 'band'
        ? t('pricing.fee.band', { band: formatNumber(d.band, 0) })
        : t('pricing.fee.rate', { rate: formatNumber(d.ratePer1000L, 2) });
    },
    [level, method, t],
  );
}
