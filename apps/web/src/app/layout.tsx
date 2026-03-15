import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';

import { Providers } from '@/components/providers/Providers';
import '@/styles/globals.css';
import esMessages from '@/i18n/messages/es.json';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'OpenQHSE - Plataforma QHSE Empresarial',
    template: '%s | OpenQHSE',
  },
  description:
    'Plataforma open-source de gestión de Calidad, Salud, Seguridad y Medio Ambiente para industria pesada.',
  keywords: ['QHSE', 'safety', 'inspections', 'incidents', 'oil and gas', 'mining', 'HSE'],
  authors: [{ name: 'OpenQHSE Contributors' }],
  manifest: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/manifest.json`,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'OpenQHSE',
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://openqhse.io',
    title: 'OpenQHSE',
    description: 'Enterprise QHSE management platform',
    siteName: 'OpenQHSE',
  },
};

export function generateViewport(): Viewport {
  return { themeColor: '#0066FF' };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <NextIntlClientProvider locale="es" messages={esMessages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
        {/* PWA service worker registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/sw.js').catch(function(){});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
