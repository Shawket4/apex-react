import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { whatsappApi } from './api';

export const whatsappKeys = {
  all: ['whatsapp'] as const,
  status: () => [...whatsappKeys.all, 'status'] as const,
  qr: () => [...whatsappKeys.all, 'qr'] as const,
};

export function useWhatsAppStatus(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: whatsappKeys.status(),
    queryFn: whatsappApi.getStatus,
    refetchInterval: options?.refetchInterval ?? 30_000,
  });
}

// The QR image rotates server-side roughly every 30s, so refetch while open.
export function useWhatsAppQrCode(enabled: boolean) {
  return useQuery({
    queryKey: whatsappKeys.qr(),
    queryFn: whatsappApi.getQrCode,
    enabled,
    refetchInterval: 20_000,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}

export function useWhatsAppReconnect() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: whatsappApi.reconnect,
    onSuccess: (status) => {
      queryClient.setQueryData(whatsappKeys.status(), status);
      if (status.is_connected && status.is_logged_in) {
        toast.success(t('settings.whatsappReconnected', 'WhatsApp gateway reconnected'));
      } else {
        toast.error(t('settings.whatsappReconnectFailed', 'Gateway is still not connected'));
      }
    },
    onError: (err) => {
      console.error(err);
      toast.error(t('settings.whatsappServiceError', 'Failed to reach the WhatsApp service'));
    },
  });
}
