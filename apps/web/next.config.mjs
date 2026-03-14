import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const isGithubPages = process.env.GITHUB_PAGES === 'true';
const repoName = 'OpenQHSE';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isGithubPages ? 'export' : 'standalone',
  basePath: isGithubPages ? `/${repoName}` : '',
  assetPrefix: isGithubPages ? `/${repoName}/` : '',
  reactStrictMode: true,
  typescript: {
    // Type errors are checked in CI lint step; skip during Docker build
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLint errors are checked in CI lint step; skip during Docker build
    ignoreDuringBuilds: true,
  },
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
  ...(isGithubPages ? {} : {
    async rewrites() {
      return [
        {
          source: '/api/v1/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/:path*`,
        },
      ];
    },
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
            {
              key: 'Permissions-Policy',
              value: 'camera=(self), microphone=(), geolocation=(self)',
            },
          ],
        },
      ];
    },
  }),
  webpack: (config, { isServer }) => {
    // PWA service worker support
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

export default withNextIntl(nextConfig);
