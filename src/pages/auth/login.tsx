import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2, LogIn, Truck } from 'lucide-react';
import { loginSchema, type LoginInput } from '@/entities/auth/schemas';
import { useLogin } from '@/entities/auth/queries';
import { useAuthStore } from '@/shared/auth/store';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form';
import { LanguageToggle } from '@/widgets/language-toggle/language-toggle';
import { ThemeToggle } from '@/widgets/theme-toggle/theme-toggle';

export default function LoginPage() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = React.useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useLogin();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = (values: LoginInput) => {
    login.mutate(values);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background md:flex-row">
      {/* Brand panel — hidden on mobile */}
      <aside className="relative hidden flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-primary to-primary/70 p-12 text-primary-foreground md:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative max-w-md space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <Truck className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold">{t('common.appName')}</h1>
          </div>
          <h2 className="text-3xl font-semibold leading-tight">
            {t('auth.brandHeadline')}
          </h2>
          <p className="text-lg text-primary-foreground/80">{t('auth.brandSubline')}</p>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 flex-col">
        {/* Top bar with controls on small screens */}
        <div className="flex items-center justify-end gap-1 p-4">
          <LanguageToggle />
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md space-y-6">
            <div className="flex items-center justify-center gap-2 md:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Truck className="h-5 w-5" />
              </div>
              <span className="text-xl font-semibold">{t('common.appName')}</span>
            </div>

            <Card className="border-none shadow-lg md:border md:shadow-sm">
              <CardContent className="space-y-6 p-6 md:p-8">
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {t('auth.loginTitle')}
                  </h2>
                  <p className="text-sm text-muted-foreground">{t('auth.loginSubtitle')}</p>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('auth.email')}</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              autoComplete="username"
                              placeholder={t('auth.emailPlaceholder')}
                              autoFocus
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('auth.password')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                placeholder={t('auth.passwordPlaceholder')}
                                className="pe-10"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                aria-label={
                                  showPassword ? t('auth.hidePassword') : t('auth.showPassword')
                                }
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={login.isPending}
                    >
                      {login.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t('auth.signingIn')}
                        </>
                      ) : (
                        <>
                          <LogIn className="h-4 w-4" />
                          {t('auth.signIn')}
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <p className="text-center text-xs text-muted-foreground">
              © {new Date().getFullYear()} {t('common.appName')}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
