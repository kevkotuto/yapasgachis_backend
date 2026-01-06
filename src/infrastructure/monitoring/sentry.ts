import * as Sentry from '@sentry/node';
import { Request } from 'express';

import config from '@/config';

export const initSentry = (): void => {
  if (!config.sentry.dsn || config.app.env === 'development') {
    return;
  }

  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.app.env,
    tracesSampleRate: config.app.env === 'production' ? 0.1 : 1.0,
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }
      return event;
    },
  });
};

export const captureException = (
  error: Error,
  context?: Record<string, unknown>
): void => {
  if (config.sentry.dsn && config.app.env !== 'development') {
    Sentry.captureException(error, {
      extra: context,
    });
  }
};

export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info'
): void => {
  if (config.sentry.dsn && config.app.env !== 'development') {
    Sentry.captureMessage(message, level);
  }
};

export const setUser = (user: {
  id: string;
  email?: string;
  username?: string;
}): void => {
  if (config.sentry.dsn && config.app.env !== 'development') {
    Sentry.setUser(user);
  }
};

export const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb): void => {
  if (config.sentry.dsn && config.app.env !== 'development') {
    Sentry.addBreadcrumb(breadcrumb);
  }
};

export { Sentry };
