/**
 * Middleware: Auth + i18n locale injection.
 *
 * - Auth via NextAuth v5 `auth()` (reads httpOnly JWT cookie).
 * - Locale via cookie `NEXT_LOCALE` or Accept-Language header.
 *   We do NOT use createIntlMiddleware because it conflicts with
 *   Next.js 15 App Router route resolution on some versions.
 *   Instead, we set the `x-next-intl-locale` header that
 *   next-intl/server reads inside server components / layouts.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { locales, defaultLocale } from "./i18n/request";
import type { Locale } from "./i18n/request";

// ── Route config ──────────────────────────────────────────────

const PUBLIC_PATHS = new Set([
  "/register",
  "/forgot-password",
  "/reset-password",
  "/marketplace",
]);

const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/users":     ["super_admin", "org_admin"],
  "/settings":  ["super_admin", "org_admin"],
  "/kpis":      ["super_admin", "org_admin", "manager"],
  "/analytics": ["super_admin", "org_admin", "manager"],
};

// ── Locale detection ──────────────────────────────────────────

function resolveLocale(req: NextRequest): Locale {
  const cookie = req.cookies.get("NEXT_LOCALE")?.value;
  if (cookie && (locales as readonly string[]).includes(cookie)) {
    return cookie as Locale;
  }
  const acceptLang = req.headers.get("accept-language") ?? "";
  for (const segment of acceptLang.split(",")) {
    const lang = (segment.split(";")[0] ?? "").trim().slice(0, 2).toLowerCase();
    if ((locales as readonly string[]).includes(lang)) return lang as Locale;
  }
  return defaultLocale;
}

// ── Main middleware ───────────────────────────────────────────

const AUTH_DISABLED = process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip internals, static assets, API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_vercel") ||
    pathname.includes(".") ||
    pathname === "/metrics"
  ) {
    return NextResponse.next();
  }

  // Demo mode — no auth, no redirects, just set locale header and proceed
  if (AUTH_DISABLED) {
    const locale = resolveLocale(req);
    const response = NextResponse.next();
    response.headers.set("x-next-intl-locale", locale);
    return response;
  }

  // ── Auth ──────────────────────────────────────────────────
  let session: { user?: { role?: string } } | null = null;
  try {
    session = await auth();
  } catch {
    session = null;
  }

  const isAuthenticated = !!session?.user;
  const isPublicPath =
    PUBLIC_PATHS.has(pathname) ||
    [...PUBLIC_PATHS].some((p) => pathname.startsWith(p + "/"));

  // Authenticated → away from public auth pages
  if (isPublicPath && isAuthenticated && pathname !== "/reset-password") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // RBAC
  if (isAuthenticated) {
    const userRole = session?.user?.role ?? "";
    for (const [prefix, allowed] of Object.entries(ROUTE_PERMISSIONS)) {
      if (pathname.startsWith(prefix) && !allowed.includes(userRole)) {
        const url = new URL("/dashboard", req.url);
        url.searchParams.set("error", "forbidden");
        return NextResponse.redirect(url);
      }
    }
  }

  // ── Locale header (read by next-intl/server in layout) ────
  const locale = resolveLocale(req);
  const response = NextResponse.next();
  response.headers.set("x-next-intl-locale", locale);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
