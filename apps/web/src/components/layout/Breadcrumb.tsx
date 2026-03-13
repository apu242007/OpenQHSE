'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronRight, Home } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Auto-generated breadcrumb from the current URL pathname.
 * Translates each segment using nav.* i18n keys.
 */
export function Breadcrumb() {
  const pathname = usePathname();
  const t = useTranslations();

  const segments = pathname.split('/').filter(Boolean);

  // Skip rendering for the root dashboard
  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, index, arr) => {
    const href = '/' + arr.slice(0, index + 1).join('/');
    const isLast = index === arr.length - 1;

    // Detect UUID segments and skip translation
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);

    let label: string;
    if (isUUID) {
      label = 'Detalle';
    } else {
      try {
        label = t(`nav.${segment}` as any);
      } catch {
        // Fallback: capitalize and replace hyphens
        label = segment
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }
    }

    return { label, href, isLast, segment };
  });

  return (
    <nav aria-label="Breadcrumb" className="hidden sm:block">
      <ol className="flex items-center gap-1 text-sm">
        {/* Home icon */}
        <li>
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Inicio"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
          </Link>
        </li>

        {crumbs.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden="true" />
            {crumb.isLast ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
