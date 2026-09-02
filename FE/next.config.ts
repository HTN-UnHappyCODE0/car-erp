import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: 'standalone',

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Tùy chọn Sentry Webpack Plugin
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,

  // Không làm fail build nếu thiếu auth token
  telemetry: false,

  // Tự động ẩn sourcemaps khỏi client bundle để bảo mật
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
