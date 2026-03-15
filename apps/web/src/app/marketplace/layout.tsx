import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: {
    default: 'Marketplace de Templates QHSE',
    template: '%s | OpenQHSE Marketplace',
  },
  description:
    'Más de 30 plantillas de inspección certificadas para Seguridad, Calidad, Medio Ambiente y Salud Ocupacional. Gratis y open-source.',
  keywords: ['QHSE templates', 'ISO 45001', 'ISO 14001', 'safety checklists', 'inspección seguridad'],
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://openqhse.io/marketplace',
    title: 'OpenQHSE Marketplace',
    description: 'Templates QHSE certificados, gratuitos y listos para usar.',
    siteName: 'OpenQHSE',
  },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Public navbar ─────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-primary">
            <ShieldCheck className="h-6 w-6" />
            <span>OpenQHSE</span>
            <span className="hidden rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary sm:block">
              Marketplace
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <Link href="/marketplace" className="transition-colors hover:text-foreground">
              Templates
            </Link>
            <Link href="/marketplace#standards" className="transition-colors hover:text-foreground">
              Estándares
            </Link>
            <Link href="https://github.com/openqhse" target="_blank" rel="noopener" className="transition-colors hover:text-foreground">
              GitHub
            </Link>
          </nav>

        </div>
      </header>

      {children}

      {/* ── Footer ────────────────────────────────────── */}
      <footer className="mt-24 border-t border-border/50 py-10 text-center text-sm text-muted-foreground">
        <p>
          OpenQHSE — Open-source QHSE Management Platform · Licencia{' '}
          <a
            href="https://github.com/apu242007/OpenQHSE/blob/main/LICENSE"
            target="_blank"
            rel="noopener"
            className="text-primary hover:underline"
          >
            MIT
          </a>
        </p>
      </footer>
    </div>
  );
}
