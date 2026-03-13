import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy.
 * - script-src 'nonce-...' is handled by Next.js nonce middleware in production.
 * - In development 'unsafe-eval' is needed for Hot Module Replacement.
 * - 'strict-dynamic' propagates trust to dynamically loaded scripts.
 */
const CSP = [
  "default-src 'self'",
  // Scripts: allow same-origin + Sentry + Vercel analytics
  IS_PRODUCTION
    ? "script-src 'self' 'strict-dynamic' https://browser.sentry-cdn.com"
    : "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'", // Tailwind/CSS-in-JS requires unsafe-inline
  "img-src 'self' data: blob: https://*.amazonaws.com http://localhost:9000",
  "font-src 'self'",
  // API + AI engine
  `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"} http://localhost:8000 ${process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8100"} https://sentry.io wss:`,
  "media-src 'self' blob:",
  // MinIO / S3 presigned URLs for embedded PDFs
  "frame-src 'self' https://*.amazonaws.com http://localhost:9000",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'", // Equivalent to X-Frame-Options: DENY
  IS_PRODUCTION ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Allow VS Code Simple Browser (runs from a different origin) to access dev assets
  allowedDevOrigins: ["172.23.0.1", "localhost"],

  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/openqhse-uploads/**",
      },
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
        pathname: "/openqhse-uploads/**",
      },
    ],
  },

  async rewrites() {
    const apiBase = process.env.API_URL ?? "http://localhost:8000/api/v1";
    return [
      {
        // Proxy /api/v1/* → backend, avoids CORS issues when needed
        source: "/api/proxy/:path*",
        destination: `${apiBase}/:path*`,
      },
    ];
  },

  async headers() {
    const securityHeaders = [
      // Clickjacking protection (also in CSP frame-ancestors)
      { key: "X-Frame-Options", value: "DENY" },
      // MIME sniffing protection
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Referrer
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Permissions policy
      { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
      // XSS filter (legacy browsers)
      { key: "X-XSS-Protection", value: "1; mode=block" },
      // CSP
      { key: "Content-Security-Policy", value: CSP },
    ];

    if (IS_PRODUCTION) {
      // HSTS — only valid over HTTPS, so production only
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [{ source: "/(.*)", headers: securityHeaders }];
  },

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

export default withNextIntl(nextConfig);
