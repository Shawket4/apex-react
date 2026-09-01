import { useTranslation } from 'react-i18next';
import { Building2, Layers, Ruler, Route as RouteIcon } from 'lucide-react';

import { RouteMapDialog, type RouteFact } from '@/widgets/route-map-dialog/route-map-dialog';
import { useFeeMappingRoute } from '@/entities/fee-mapping/queries';
import { decodePolyline } from '@/entities/trip-summary/api';
import { formatNumber } from '@/shared/lib/format';
import type { FeeMapping } from '@/entities/fee-mapping/schemas';

/**
 * The route behind one fee mapping, on the same dialog the trips list uses.
 *
 * A thin wrapper on purpose: it resolves this screen's data and hands over the
 * shape RouteMapDialog wants. The alternative — a second map dialog — is how
 * the two end up drifting.
 *
 * The facts row is where this differs from a trip. A trip shows date and
 * vehicle; a mapping shows the number that matters here: the distance the
 * company gave us against the distance the road actually is.
 */
export function FeeMappingRouteDialog({
  mapping,
  onOpenChange,
}: {
  mapping: FeeMapping | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useFeeMappingRoute(mapping?.id ?? null);

  const osrmKm = data?.route_data?.distance ?? mapping?.osrmDistanceKm ?? null;
  const statedKm = mapping?.distance ?? null;
  // The gap is the reason this screen exists. Flag it once it is worth a look
  // rather than at any difference at all — roads are not straight lines.
  const gap = osrmKm != null && statedKm != null ? statedKm - osrmKm : null;
  const gapIsLarge = gap != null && Math.abs(gap) >= 10;

  const facts: RouteFact[] = mapping
    ? [
        {
          icon: <Building2 className="h-3 w-3" />,
          label: t('feeMappings.fields.company'),
          value: mapping.company,
        },
        {
          icon: <Ruler className="h-3 w-3" />,
          label: t('feeMappings.fields.distance'),
          value: statedKm != null ? `${formatNumber(statedKm, 0)} km` : '—',
        },
        {
          icon: <RouteIcon className="h-3 w-3" />,
          label: t('feeMappings.fields.osrmDistance'),
          value: osrmKm != null ? `${formatNumber(osrmKm, 1)} km` : '—',
        },
        {
          icon: <Layers className="h-3 w-3" />,
          label: t('feeMappings.fields.difference'),
          value: gap != null ? `${gap > 0 ? '+' : ''}${formatNumber(gap, 1)} km` : '—',
          tone: gapIsLarge ? 'bad' : undefined,
        },
      ]
    : [];

  return (
    <RouteMapDialog
      open={mapping !== null}
      onOpenChange={onOpenChange}
      title={t('feeMappings.route.title')}
      subtitle={mapping ? `${mapping.terminal} → ${mapping.dropOffPoint}` : undefined}
      facts={facts}
      terminal={data?.terminal_location ?? null}
      dropoff={data?.drop_off_point_location ?? null}
      route={data?.route_data?.geometry ? decodePolyline(data.route_data.geometry) : []}
      terminalLabel={mapping?.terminal}
      dropoffLabel={mapping?.dropOffPoint}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      emptyTitle={t('feeMappings.route.unpinned')}
    />
  );
}
