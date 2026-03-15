'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Shield, Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const forgotPasswordSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setError(null);
    try {
      await api.post('/auth/forgot-password', data);
      setSuccess(true);
    } catch (e) {
      // Always show success to prevent email enumeration
      setSuccess(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-8 w-8 text-primary" aria-hidden="true" />
            <span className="text-xl font-bold">OpenQHSE</span>
          </div>

          {success ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-safe/10">
                <CheckCircle2 className="h-8 w-8 text-safe-500" aria-hidden="true" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Correo enviado</h2>
              <p className="text-muted-foreground">
                Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu
                contraseña. Revisa tu bandeja de entrada y spam.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-8 w-8 text-primary" aria-hidden="true" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                {t('forgotPassword')}
              </h2>
              <p className="text-muted-foreground">
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu
                contraseña.
              </p>
            </>
          )}
        </div>

        {/* Error alert */}
        {error && (
          <div
            className="rounded-lg border border-danger/20 bg-danger/10 p-4 text-center text-sm text-danger"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Form or success state */}
        {!success ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                {t('email')}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...(errors.email && {'aria-invalid': 'true'})}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className={cn(
                  'flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm',
                  'ring-offset-background placeholder:text-muted-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  'transition-colors',
                  errors.email && 'border-danger focus-visible:ring-danger',
                )}
                placeholder="admin@empresa.com"
                disabled={isSubmitting}
                {...register('email')}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-danger" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'inline-flex h-11 w-full items-center justify-center rounded-lg',
                'bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
                'hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
                'transition-all duration-200',
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Enviando...
                </>
              ) : (
                'Enviar enlace de recuperación'
              )}
            </button>
          </form>
        ) : (
          <Link
            href="/dashboard"
            className={cn(
              'inline-flex h-11 w-full items-center justify-center rounded-lg',
              'bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
              'hover:bg-primary/90 transition-all duration-200',
            )}
          >
            Ir al inicio
          </Link>
        )}

        {/* Back link */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
