import * as Sentry from '@sentry/node';
import { env } from '../config/env.js';
Sentry.init({
  ...(env.SENTRY_DSN ? { dsn: env.SENTRY_DSN } : {}),
  environment: env.NODE_ENV,
  release: env.APP_VERSION,
  tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
  sendDefaultPii: false,
  beforeSend(event) {
    delete event.request;
    delete event.user;
    delete event.breadcrumbs;
    delete event.extra;
    if (event.exception?.values)
      for (const exception of event.exception.values)
        exception.value = 'Server error (details suppressed)';
    return event;
  },
});
export { Sentry };
