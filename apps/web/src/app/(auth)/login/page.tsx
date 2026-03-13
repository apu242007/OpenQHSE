"use client";

/**
 * Login page — uses NextAuth v5 signIn() with Credentials provider.
 *
 * SECURITY:
 *   - No tokens are stored in localStorage.
 *   - signIn() delegates auth to NextAuth, which writes an httpOnly session cookie.
 *   - Role-based redirect happens after session is established.
 */

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shield, Loader2, Eye, EyeOff, HardHat, ShieldCheck, Flame } from "lucide-react";

import { loginSchema, type LoginFormValues } from "@/lib/validations";
import { cn } from "@/lib/utils";

const ROLE_REDIRECTS: Record<string, string> = {
  super_admin: "/dashboard",
  org_admin: "/dashboard",
  manager: "/dashboard",
  supervisor: "/inspections",
  inspector: "/inspections",
  worker: "/dashboard",
  viewer: "/dashboard",
};

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false, // Handle redirect manually for role-based routing
      });

      if (result?.error) {
        setError("Credenciales inválidas. Verifica tu email y contraseña.");
        return;
      }

      if (result?.ok) {
        // Session is now established in the httpOnly cookie.
        // Get the role from the updated session for routing.
        const { getSession } = await import("next-auth/react");
        const session = await getSession();
        const role = session?.user?.role ?? "worker";
        const destination = redirectTo ?? ROLE_REDIRECTS[role] ?? "/dashboard";
        router.push(destination);
        router.refresh(); // Ensure Server Components re-fetch with new session
      }
    } catch {
      setError("Error al iniciar sesión. Por favor intenta de nuevo.");
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Industrial Branding */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/20">
            <Shield className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <span className="text-2xl font-bold text-white">OpenQHSE</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight text-white">
            Gestión QHSE
            <br />
            <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              para industria pesada
            </span>
          </h1>
          <p className="max-w-md text-lg text-slate-300">
            Inspecciones, incidentes, permisos de trabajo y más. Todo en una plataforma
            open-source, segura y escalable.
          </p>

          <div className="grid grid-cols-1 gap-4 pt-4">
            <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3 backdrop-blur-sm">
              <div className="rounded-md bg-primary/20 p-2">
                <HardHat className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Inspecciones digitales</p>
                <p className="text-xs text-slate-400">Checklists offline-first con GPS</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3 backdrop-blur-sm">
              <div className="rounded-md bg-warning/20 p-2">
                <Flame className="h-5 w-5 text-warning" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Permisos de trabajo</p>
                <p className="text-xs text-slate-400">Hot work, espacios confinados, altura</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3 backdrop-blur-sm">
              <div className="rounded-md bg-safe/20 p-2">
                <ShieldCheck className="h-5 w-5 text-safe-500" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Gestión de riesgos</p>
                <p className="text-xs text-slate-400">HAZOP, Bow-Tie, matrices de riesgo</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} OpenQHSE Contributors · AGPL-3.0 License
        </p>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex w-full flex-col items-center justify-center bg-background px-6 sm:px-8 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile branding */}
          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center gap-2 lg:hidden">
              <Shield className="h-8 w-8 text-primary" aria-hidden="true" />
              <span className="text-xl font-bold">OpenQHSE</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">{t("login")}</h2>
            <p className="text-muted-foreground">{t("loginSubtitle")}</p>
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                {t("email")}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...(errors.email && { "aria-invalid": "true" })}
                aria-describedby={errors.email ? "email-error" : undefined}
                className={cn(
                  "flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
                  "ring-offset-background placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
                  errors.email && "border-danger focus-visible:ring-danger",
                )}
                placeholder="admin@empresa.com"
                disabled={isSubmitting}
                {...register("email")}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-danger" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  {t("password")}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-primary hover:text-primary/80 hover:underline"
                  tabIndex={-1}
                >
                  {t("forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  {...(errors.password && { "aria-invalid": "true" })}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className={cn(
                    "flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm",
                    "ring-offset-background placeholder:text-muted-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
                    errors.password && "border-danger focus-visible:ring-danger",
                  )}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-sm text-danger" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "inline-flex h-11 w-full items-center justify-center rounded-lg",
                "bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
                "hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                "transition-all duration-200",
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Iniciando sesión...
                </>
              ) : (
                t("login")
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              {t("register")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
