import {
  ConsoleLogger,
  HttpException,
  INestApplication,
  Logger,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

interface OperationContext {
  requestId?: string;
  operationId?: string;
}

const context = new AsyncLocalStorage<OperationContext>();
const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DomainEvent =
  | 'asset_create'
  | 'asset_upload'
  | 'asset_update'
  | 'asset_delete'
  | 'folder_create'
  | 'folder_update'
  | 'folder_delete'
  | 'spaces_put';

export function currentOperationContext(): Readonly<OperationContext> {
  return context.getStore() ?? {};
}

function failureCategory(error: unknown): string {
  if (error instanceof HttpException) {
    switch (error.getStatus()) {
      case 400:
        return 'invalid_input';
      case 404:
        return 'not_found';
      case 409:
        return 'conflict';
      case 503:
        return 'unavailable';
    }
  }
  return 'unexpected_error';
}

export function observeOperation<T>(
  logger: Pick<Logger, 'log' | 'warn'>,
  event: DomainEvent,
  operation: () => Promise<T>
): Promise<T> {
  const parent = currentOperationContext();
  return context.run(
    { ...parent, operationId: parent.operationId ?? randomUUID() },
    async () => {
      const started = process.hrtime.bigint();
      const entry = () => ({
        event,
        ...currentOperationContext(),
        durationMs: Math.round(Number(process.hrtime.bigint() - started) / 1e6),
      });
      try {
        const result = await operation();
        logger.log({ ...entry(), outcome: 'success' });
        return result;
      } catch (error) {
        // HTTP owns the error-level request summary; never serialize raw errors.
        logger.warn({
          ...entry(),
          outcome: 'failure',
          reason: failureCategory(error),
        });
        throw error;
      }
    }
  );
}

export function createServiceLogger(): ConsoleLogger {
  return new ConsoleLogger({
    json: true,
    colors: false,
    logLevels: ['log', 'warn', 'error', 'fatal'],
  });
}

export function httpLoggingMiddleware(
  logger: Pick<Logger, 'log' | 'warn' | 'error'> = new Logger('HTTP')
) {
  return (request: Request, response: Response, next: NextFunction): void => {
    // Heartbeats are represented by probe metrics, not repetitive access logs.
    if (
      request.path === '/health' &&
      ['GET', 'HEAD'].includes(request.method)
    ) {
      next();
      return;
    }
    const incomingId = request.headers['x-request-id'];
    const requestId =
      typeof incomingId === 'string' && REQUEST_ID_PATTERN.test(incomingId)
        ? incomingId.toLowerCase()
        : randomUUID();
    const started = process.hrtime.bigint();
    response.setHeader('X-Request-ID', requestId);
    response.once('finish', () => {
      const route = request.route as { path?: unknown } | undefined;
      const entry = {
        event: 'http_request',
        requestId,
        method: request.method,
        // Never export concrete paths, queries, bodies, cookies or auth headers.
        route: typeof route?.path === 'string' ? route.path : '/unmatched',
        statusCode: response.statusCode,
        durationMs: Math.round(Number(process.hrtime.bigint() - started) / 1e6),
      };
      if (entry.statusCode >= 500) logger.error(entry);
      else if (entry.statusCode >= 400) logger.warn(entry);
      else logger.log(entry);
    });
    context.run({ requestId }, next);
  };
}

export function configureObservability(app: INestApplication): void {
  app.use(httpLoggingMiddleware());
  app.enableShutdownHooks();
}
