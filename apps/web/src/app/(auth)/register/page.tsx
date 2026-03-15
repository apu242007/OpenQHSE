'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Shield, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { signIn } from 'next-auth/react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/stores';
import { registerSchema, type RegisterFormValues } from '@/lib/validations';
import { cn } from '@/lib/utils';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface UserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  organization_id: string;
  avatar_url: string | null;
  language: string;
}

export default function RegisterPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      organization_name: '',
      language: 'es',
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setError(null);
    try {
      await api.post<TokenResponse>('/auth/register', data);
      await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      const user = await api.get<UserResponse>('/auth/me');
      setUser(user);
      router.push('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrarse');
    }
  };

  const inputClassName = (hasError: boolean) =>
    cn(
      'flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
      'ring-offset-background placeholder:text-muted-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      'disabled:cursor-not-allowed disabled:opacity-50',
      hasError && 'border-danger',
    );

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8">
        <div className="space-y-2 text-center">
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-8 w-8 text-primary" aria-hidden="true" />
            <span className="text-xl font-bold">OpenQHSE</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">{t('register')}</h2>
          <p className="text-muted-foreground">{t('registerSubtitle')}</p>
        </div>

        {error && (
          <div className="rounded-md bg-danger/10 p-3 text-center text-sm text-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="first_name" className="text-sm font-medium">
                {t('firstName')}
              </label>
              <input
                id="first_name"
                type="text"
                autoComplete="given-name"
                className={inputClassName(!!errors.first_name)}
                {...register('first_name')}
              />
              {errors.first_name && (
                <p className="text-sm text-danger">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="last_name" className="text-sm font-medium">
                {t('lastName')}
              </label>
              <input
                id="last_name"
                type="text"
                autoComplete="family-name"
                className={inputClassName(!!errors.last_name)}
                {...register('last_name')}
              />
              {errors.last_name && (
                <p className="text-sm text-danger">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="organization_name" className="text-sm font-medium">
              {t('organization')}
            </label>
            <input
              id="organization_name"
              type="text"
              className={inputClassName(!!errors.organization_name)}
              placeholder="Empresa S.A."
              {...register('organization_name')}
            />
            {errors.organization_name && (
              <p className="text-sm text-danger">{errors.organization_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              {t('email')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={inputClassName(!!errors.email)}
              placeholder="admin@empresa.com"
              {...register('email')}
            />
            {errors.email && <p className="text-sm text-danger">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              {t('password')}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className={inputClassName(!!errors.password)}
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-danger">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="language" className="text-sm font-medium">
              Idioma
            </label>
            <select
              id="language"
              className={inputClassName(false)}
              {...register('language')}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'inline-flex h-11 w-full items-center justify-center rounded-md',
              'bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
              'hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
              'transition-colors',
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Creando cuenta...
              </>
            ) : (
              t('register')
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {t('hasAccount')}{' '}
          <Link href="/dashboard" className="font-medium text-primary hover:underline">
            {t('login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
