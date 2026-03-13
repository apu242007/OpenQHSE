'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Shield, Loader2, Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react';
import { useState, Suspense } from 'react';
import { z } from 'zod';

import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const resetPasswordSchema = z
  .object({
    new_password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[a-z]/, 'Debe contener al menos una minúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    confirm_password: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { new_password: '', confirm_password: '' },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      setError('Token de recuperación no encontrado.');
      return;
    }

    setError(null);
    try {
      await api.post('/auth/reset-password', {
        token,
        new_password: data.new_password,
      });
      setSuccess(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Error al restablecer la contraseña. El enlace puede haber expirado.',
      );
    }
  };

  // No token provided
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <Shield className="mx-auto h-12 w-12 text-danger" aria-hidden="true" />
          <h2 className="text-2xl font-bold">Enlace inválido</h2>
          <p className="text-muted-foreground">
            El enlace de recuperación es inválido o ha expirado. Solicita un nuevo enlace.
          </p>
          <Link
            href="/forgot-password"
            className={cn(
              'inline-flex h-11 w-full items-center justify-center rounded-lg',
              'bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
              'hover:bg-primary/90 transition-all duration-200',
            )}
          >
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

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
              <h2 className="text-2xl font-bold tracking-tight">
                ¡Contraseña restablecida!
              </h2>
              <p className="text-muted-foreground">
                Tu contraseña ha sido actualizada correctamente. Ya puedes iniciar sesión con tu
                nueva contraseña.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <KeyRound className="h-8 w-8 text-primary" aria-hidden="true" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Nueva contraseña</h2>
              <p className="text-muted-foreground">
                Ingresa tu nueva contraseña. Debe tener al menos 8 caracteres, una mayúscula, una
                minúscula y un número.
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
            {/* New Password */}
            <div className="space-y-2">
              <label htmlFor="new_password" className="text-sm font-medium">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  id="new_password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...(errors.new_password && {'aria-invalid': 'true'})}
                  aria-describedby={errors.new_password ? 'new-password-error' : undefined}
                  className={cn(
                    'flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm',
                    'ring-offset-background placeholder:text-muted-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    'transition-colors',
                    errors.new_password && 'border-danger focus-visible:ring-danger',
                  )}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  {...register('new_password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.new_password && (
                <p id="new-password-error" className="text-sm text-danger" role="alert">
                  {errors.new_password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label htmlFor="confirm_password" className="text-sm font-medium">
                Confirmar contraseña
              </label>
              <div className="relative">
                <input
                  id="confirm_password"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...(errors.confirm_password && {'aria-invalid': 'true'})}
                  aria-describedby={
                    errors.confirm_password ? 'confirm-password-error' : undefined
                  }
                  className={cn(
                    'flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm',
                    'ring-offset-background placeholder:text-muted-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    'transition-colors',
                    errors.confirm_password && 'border-danger focus-visible:ring-danger',
                  )}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  {...register('confirm_password')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.confirm_password && (
                <p id="confirm-password-error" className="text-sm text-danger" role="alert">
                  {errors.confirm_password.message}
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
                  Restableciendo...
                </>
              ) : (
                'Restablecer contraseña'
              )}
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className={cn(
              'inline-flex h-11 w-full items-center justify-center rounded-lg',
              'bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
              'hover:bg-primary/90 transition-all duration-200',
            )}
          >
            Iniciar sesión
          </Link>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
