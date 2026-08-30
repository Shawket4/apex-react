import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Save, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

import { PageShell } from '@/shared/ui/page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { apiPost } from '@/shared/api/client';
import { WhatsAppGatewayCard } from '@/widgets/whatsapp-gateway-card';

const tokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  cookie: z.string().min(1, 'Cookie is required'),
});

type TokenFormValues = z.infer<typeof tokenSchema>;

export default function SettingsPage() {
  const { t } = useTranslation();
  const { isManager, isAdmin } = usePermissions();

  const form = useForm<TokenFormValues>({
    resolver: zodResolver(tokenSchema),
    defaultValues: {
      token: '',
      cookie: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: TokenFormValues) => apiPost('/api/set-petroapp-token', data),
    onSuccess: () => {
      toast.success(t('settings.petroapp.updated', { defaultValue: 'PetroApp token updated successfully' }));
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || t('settings.petroapp.updateFailed', { defaultValue: 'Failed to update token' }));
    },
  });

  const onSubmit = (data: TokenFormValues) => {
    mutation.mutate(data);
  };

  return (
    <PageShell title={t('nav.settings')} icon={<SettingsIcon className="h-5 w-5" />}>
      <div className="mx-auto max-w-2xl space-y-3">
        {isManager && (
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.petroapp.title', { defaultValue: 'PetroApp Configuration' })}</CardTitle>
              <CardDescription>
                {t('settings.petroapp.description', { defaultValue: 'Update the PetroApp integration token and cookie.' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.petroapp.token', { defaultValue: 'Token' })}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('settings.petroapp.tokenPlaceholder', { defaultValue: 'Enter token…' })} autoComplete="off" spellCheck={false} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cookie"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.petroapp.cookie', { defaultValue: 'Cookie' })}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('settings.petroapp.cookiePlaceholder', { defaultValue: 'Enter cookie…' })} autoComplete="off" spellCheck={false} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={mutation.isPending}>
                      {mutation.isPending ? (
                        <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      ) : (
                        <Save aria-hidden="true" />
                      )}
                      {t('common.save')}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
        {isAdmin && <WhatsAppGatewayCard />}
      </div>
    </PageShell>
  );
}
