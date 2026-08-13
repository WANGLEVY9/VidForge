import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export interface RequestContext {
  requestId: string;
  startedAt: number;
}

const storage = new AsyncLocalStorage<RequestContext>();
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function logStructured(event: Record<string, string | number | boolean | undefined>): void {
  process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), ...event })}\n`);
}

/**
 * Keep one correlation ID across HTTP handlers and async work spawned by them.
 * Client-provided IDs are accepted only after a strict, bounded validation.
 */
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const candidate = req.header('x-request-id')?.trim() ?? '';
  const requestId = REQUEST_ID_PATTERN.test(candidate) ? candidate : randomUUID();
  res.setHeader('x-request-id', requestId);
  const startedAt = Date.now();
  res.once('finish', () => {
    logStructured({
      event: 'http.request',
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      latencyMs: Date.now() - startedAt,
    });
  });
  storage.run({ requestId, startedAt }, () => next());
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

export function runWithRequestContext<T>(context: RequestContext, callback: () => T): T {
  return storage.run(context, callback);
}
