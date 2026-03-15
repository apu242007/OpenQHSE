import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const isGithubPages = process.env.GITHUB_PAGES === 'true';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const repoName = 'OpenQHSE';

// Static export (GitHub Pages) cannot set response headers, so CSP is only
// injected in standalone / Docker mode.
const CSP = [
  "default-src 'self'",
  IS_PRODUCTION
    ? "script-src 'self' 'strict-dynamic' https://browser.sentry-cdn.com"
    : "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://*.amazonaws.com http://localhost:9000`,
  "font-src 'self'",
  `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'} http://localhost:8000 ${process.env.NEXT_PUBLIC_AI_URL ?? 'http://localhost:8100'} https://sentry.io wss:`,
  'media-src \'self\' blob:',
  "frame-src 'self' https://*.amazonaws.com http://localhost:9000",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  IS_PRODUCTION ? 'upgrade-insecure-requests' : '',
]
  .filter(Boolean)
  .join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isGithubPages ? 'export' : 'standalone',
  outputFileTracingRoot: isGithubPages ? undefined : path.join(__dirname, '../..'),
  basePath: isGithubPages ? `/${repoName}` : '',
  assetPrefix: isGithubPages ? `/${repoName}/` : '',
  env: {
    NEXT_PUBLIC_BASE_PATH: isGithubPages ? `/${repoName}` : '',
  },
  reactStrictMode: true,
  // TS / ESLint errors are caught in the CI lint step; don't block builds here
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Allow VS Code Simple Browser and devcontainer origins in development
  allowedDevOrigins: ['172.23.0.1', 'localhost'],
  images: {
    unoptimized: isGithubPages,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/openqhse-uploads/**',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        pathname: '/openqhse-uploads/**',
      },
    ],
  },
  // rewrites() and headers() are incompatible with static export
  ...(isGithubPages ? {} : {
    async rewrites() {
      const apiBase = process.env.API_URL ?? 'http://localhost:8000/api/v1';
      return [
        {
          // Proxy /api/proxy/* → FastAPI backend (avoids CORS in local dev)
          source: '/api/proxy/:path*',
          destination: `${apiBase}/:path*`,
        },
      ];
    },
    async headers() {
      const securityHeaders = [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self)' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Content-Security-Policy', value: CSP },
      ];
      if (IS_PRODUCTION) {
        // HSTS only valid over HTTPS
        securityHeaders.push({
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        });
      }
      return [{ source: '/(.*)', headers: securityHeaders }];
    },
  }),
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

// For static export (GitHub Pages), skip withNextIntl: the plugin registers
// src/i18n/request.ts which calls requestLocale → headers() at pre-render time,
// breaking static export. The root layout hardcodes locale="es" and messages
// directly, so no server-side i18n plugin is needed for the static build.
export default isGithubPages ? nextConfig : withNextIntl(nextConfig);
