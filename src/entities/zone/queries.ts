import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { zoneApi } from './api';
import type { CreateZonePayload, UpdateZonePayload } from './schemas';

export const zoneKeys = {
  all: ['zones'] as const,
  lists: () => [...zoneKeys.all, 'list'] as const,
  list: (filters: { activeOnly?: boolean }) => [...zoneKeys.lists(), filters] as const,
  details: () => [...zoneKeys.all, 'detail'] as const,
  detail: (id: number) => [...zoneKeys.details(), id] as const,
};

export function useZones(activeOnly?: boolean) {
  return useQuery({
    queryKey: zoneKeys.list({ activeOnly }),
    queryFn: () => zoneApi.listZones(activeOnly),
  });
}

export function useCreateZone() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (payload: CreateZonePayload) => zoneApi.createZone(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: zoneKeys.lists() });
      toast.success(t('zones.toast.createSuccess', 'Zone created successfully'));
    },
    onError: (err) => {
      console.error(err);
      toast.error(t('zones.toast.createError', 'Failed to create zone'));
    },
  });
}

export function useUpdateZone() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateZonePayload }) =>
      zoneApi.updateZone(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: zoneKeys.lists() });
      queryClient.invalidateQueries({ queryKey: zoneKeys.detail(data.id) });
      toast.success(t('zones.toast.updateSuccess', 'Zone updated successfully'));
    },
    onError: (err) => {
      console.error(err);
      toast.error(t('zones.toast.updateError', 'Failed to update zone'));
    },
  });
}

export function useDeleteZone() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: number) => zoneApi.deleteZone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: zoneKeys.lists() });
      toast.success(t('zones.toast.deleteSuccess', 'Zone deleted successfully'));
    },
    onError: (err) => {
      console.error(err);
      toast.error(t('zones.toast.deleteError', 'Failed to delete zone'));
    },
  });
}

export function useScanZones() {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: () => zoneApi.scanZones(),
    onSuccess: (data) => {
      if (data.error) {
        toast.error(t('zones.toast.scanError', 'Scan completed with error'), {
          description: data.error,
        });
      } else {
        toast.success(t('zones.toast.scanSuccess', 'Scan complete'), {
          description: t('zones.toast.scanSummary', {
            violations: data.violations_found,
            alerts: data.alerts_sent,
            defaultValue: `{{violations}} violations found, {{alerts}} alerts sent`,
          }),
        });
      }
    },
    onError: (err) => {
      console.error(err);
      toast.error(t('zones.toast.scanError', 'Failed to run scan'));
    },
  });
}
