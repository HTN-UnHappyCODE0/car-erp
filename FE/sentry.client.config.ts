import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: !!SENTRY_DSN,

  // Tỷ lệ lấy mẫu giám sát hiệu năng APM
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Tỷ lệ ghi hình thao tác người dùng (Session Replay)
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Lọc dữ liệu nhạy cảm trước khi gửi
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
