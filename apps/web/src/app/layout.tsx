import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { Providers } from '@/components/providers/Providers';
import '@/styles/globals.css';

// next-intl uses headers() for locale detection — opt all routes into dynamic rendering
export const dynamic = 'force-dynamic';

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
  manifest: '/manifest.json',
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
        {/* PWA service worker registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(){});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
