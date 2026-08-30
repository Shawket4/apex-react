import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login } from './api';
import type { LoginInput } from './schemas';
import { useAuthStore } from '@/shared/auth/store';
import { queryClient } from '@/shared/api/query';
import { toast } from '@/shared/ui/toast';
import { extractErrorMessage } from '@/shared/api/errors';

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: (data, variables) => {
      setSession({
        token: data.jwt,
        user: {
          name: data.name ?? variables.email,
          email: variables.email,
          permission: data.permission,
        },
      });
      navigate('/', { replace: true });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, t('auth.loginError')));
    },
  });
}

export function useLogout() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const navigate = useNavigate();
  const { t } = useTranslation();

  return () => {
    // Deferred by a tick on purpose.
    //
    // This runs from inside a dropdown item's click handler. Clearing the
    // session makes UserMenu render null, which unmounts the still-open Radix
    // menu mid-event, and the navigate then unmounts the whole layout — and on
    // mobile the open drawer with it. Tearing down a Radix portal from inside
    // its own event is the classic source of "Failed to execute 'removeChild'
    // on 'Node'", which is what was crashing the sidebar on a phone.
    //
    // Yielding first lets the menu close and release its portal before any of
    // this happens.
    setTimeout(() => {
      clearSession();
      queryClient.clear();
      toast.success(t('auth.loggedOut'));
      navigate('/login', { replace: true });
    }, 0);
  };
}
