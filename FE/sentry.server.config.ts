import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: !!SENTRY_DSN,

  // Tỷ lệ lấy mẫu giám sát hiệu năng APM trên Server Node.js
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  beforeSend(event) {
    if (event.request?.headers) {
      if (event.request.headers.authorization) {
        event.request.headers.authorization = 'Bearer [REDACTED]';
      }
      if (event.request.headers.cookie) {
        event.request.headers.cookie = '[REDACTED]';
      }
    }
    return event;
  },
});
