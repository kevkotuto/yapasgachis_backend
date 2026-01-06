import path from 'path';

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import config from '@/config';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom log format
const logFormat = printf(
  ({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }

    if (stack) {
      msg += `\n${stack}`;
    }

    return msg;
  }
);

// Create logs directory if it doesn't exist
const logsDir = config.logging.filePath || './logs';

// Console transport
const consoleTransport = new winston.transports.Console({
  format: combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
});

// File transports with rotation
const fileTransports = [
  // Error logs
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d',
    format: combine(timestamp(), errors({ stack: true }), json()),
  }),

  // Combined logs
  new DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: combine(timestamp(), errors({ stack: true }), json()),
  }),

  // Info logs
  new DailyRotateFile({
    filename: path.join(logsDir, 'info-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'info',
    maxSize: '20m',
    maxFiles: '14d',
    format: combine(timestamp(), json()),
  }),
];

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level || 'info',
  format: combine(timestamp(), errors({ stack: true }), json()),
  defaultMeta: {
    service: config.app.name,
    environment: config.app.env,
  },
  transports: [
    consoleTransport,
    ...(config.app.env === 'production' ? fileTransports : []),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
    }),
  ],
});

// Add stream for Morgan (HTTP request logging)
export const stream = {
  write: (message: string): void => {
    logger.info(message.trim());
  },
};

// Helper methods for structured logging
export const logError = (
  error: Error,
  context?: Record<string, unknown>
): void => {
  logger.error(error.message, {
    stack: error.stack,
    ...context,
  });
};

export const logInfo = (
  message: string,
  metadata?: Record<string, unknown>
): void => {
  logger.info(message, metadata);
};

export const logWarning = (
  message: string,
  metadata?: Record<string, unknown>
): void => {
  logger.warn(message, metadata);
};

export const logDebug = (
  message: string,
  metadata?: Record<string, unknown>
): void => {
  logger.debug(message, metadata);
};

// HTTP request logger
export const logHttpRequest = (req: {
  method: string;
  url: string;
  ip: string;
  userId?: string;
}): void => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: req.userId,
  });
};

// Database query logger
export const logDatabaseQuery = (query: string, duration: number): void => {
  logger.debug('Database Query', {
    query,
    duration: `${duration}ms`,
  });
};

// Payment logger
export const logPayment = (
  action: string,
  data: Record<string, unknown>
): void => {
  logger.info(`Payment: ${action}`, {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

// Security logger
export const logSecurity = (
  event: string,
  data: Record<string, unknown>
): void => {
  logger.warn(`Security Event: ${event}`, {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

export default logger;
