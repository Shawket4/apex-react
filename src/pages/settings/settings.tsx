import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Save } from 'lucide-react';
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

const tokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  cookie: z.string().min(1, 'Cookie is required'),
});

type TokenFormValues = z.infer<typeof tokenSchema>;

export default function SettingsPage() {
  const { t } = useTranslation();
  const { isManager } = usePermissions();

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
      toast.success('PetroApp token updated successfully');
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update token');
    },
  });

  const onSubmit = (data: TokenFormValues) => {
    mutation.mutate(data);
  };

  return (
    <PageShell title={t('nav.settings')} icon={<SettingsIcon className="h-5 w-5" />}>
      <div className="mx-auto max-w-2xl space-y-6">
        {isManager && (
          <Card>
            <CardHeader>
              <CardTitle>PetroApp Configuration</CardTitle>
              <CardDescription>
                Update the PetroApp integration token and cookie.
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
                        <FormLabel>Token</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter token" {...field} />
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
                        <FormLabel>Cookie</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter cookie" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={mutation.isPending}>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
